import asyncio
from datetime import datetime, timezone
from typing import Any

from app import crud
from app.config import settings
from app.models import BlogDraft
from app.services.tinyfish import TinyfishClient, TinyfishError

TERMINAL_STATUSES = {"completed", "failed", "cancelled", "timeout"}


class MataroaPublishError(RuntimeError):
    """Raised when publishing to Mataroa cannot be completed."""


async def publish_latest_blog_draft(db) -> dict[str, Any]:
    draft = crud.get_latest_blog_draft(db)
    if draft is None:
        raise MataroaPublishError("No generated blog drafts are available yet")
    return await publish_blog_draft(draft)


async def publish_blog_draft(
    draft: BlogDraft,
    *,
    username: str | None = None,
    password: str | None = None,
) -> dict[str, Any]:
    resolved_username = username or settings.mataroa_username
    resolved_password = password or settings.mataroa_password

    if not resolved_username:
        raise MataroaPublishError("MATAROA_USERNAME is not configured")
    if not resolved_password:
        raise MataroaPublishError("MATAROA_PASSWORD is not configured")

    try:
        client = TinyfishClient()
    except TinyfishError as exc:
        raise MataroaPublishError(str(exc)) from exc

    start_payload = await client.start_run(
        url=settings.mataroa_login_url,
        goal=_build_publish_goal(draft, username=resolved_username, password=resolved_password),
    )
    run_id = _extract_run_id(start_payload)
    final_payload = await _poll_run(client, run_id)
    status = _normalize_status(final_payload.get("status"))

    error_jsonb = None
    if status != "completed":
        error_jsonb = _extract_error_payload(final_payload)

    return {
        "draft": draft,
        "tinyfish_run_id": run_id,
        "status": status,
        "published_url": _extract_published_url(final_payload),
        "result_jsonb": _extract_result_payload(final_payload),
        "error_jsonb": error_jsonb,
    }


async def _poll_run(client: TinyfishClient, run_id: str) -> dict[str, Any]:
    deadline = datetime.now(timezone.utc).timestamp() + settings.tinyfish_max_poll_seconds
    while True:
        payload = await client.get_run(run_id)
        status = _normalize_status(payload.get("status"))
        if status in TERMINAL_STATUSES:
            return payload
        if datetime.now(timezone.utc).timestamp() >= deadline:
            return {"status": "timeout", "error": {"message": "Run polling timed out"}, "run_id": run_id}
        await asyncio.sleep(settings.tinyfish_poll_interval_seconds)


def _build_publish_goal(draft: BlogDraft, *, username: str, password: str) -> str:
    slug_hint = draft.slug_suggestion or ""
    return f"""
Open the Mataroa login page and publish a blog post.

Credentials:
- Username: {username}
- Password: {password}

Steps:
1. Log in to Mataroa at {settings.mataroa_base_url}.
2. Navigate to the new-post editor after login.
3. Create a new post using the exact title below.
4. Paste the markdown body exactly as provided below.
5. If Mataroa shows a slug field and it is empty, use this slug hint: {slug_hint}
6. Publish the post. If there is a choice between saving an unpublished draft and publishing, choose publish.
7. Return the final post URL, slug, and any confirmation text in the run result.

Post title:
{draft.title}

Post body markdown:
<<<POST_BODY
{draft.body_markdown}
POST_BODY
""".strip()


def _extract_run_id(payload: dict[str, Any]) -> str:
    run_id = payload.get("run_id") or payload.get("id")
    if not run_id:
        raise MataroaPublishError(f"Missing run_id in TinyFish response: {payload}")
    return str(run_id)


def _extract_result_payload(payload: dict[str, Any]) -> dict[str, Any] | None:
    if isinstance(payload.get("result"), dict):
        return payload["result"]
    if isinstance(payload.get("data"), dict):
        if isinstance(payload["data"].get("result"), dict):
            return payload["data"]["result"]
        return payload["data"]
    return None


def _extract_error_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if isinstance(payload.get("error"), dict):
        return payload["error"]
    if isinstance(payload.get("data"), dict) and isinstance(payload["data"].get("error"), dict):
        return payload["data"]["error"]
    return {"message": "TinyFish did not complete the Mataroa publish run successfully"}


def _extract_published_url(payload: dict[str, Any]) -> str | None:
    result = _extract_result_payload(payload)
    if not isinstance(result, dict):
        return None

    for key in ("url", "final_url", "post_url", "published_url"):
        value = result.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    links = result.get("links")
    if isinstance(links, list):
        for link in links:
            if isinstance(link, str) and "mataroa.blog" in link:
                return link

    return None


def _normalize_status(status: Any) -> str:
    if status is None:
        return "unknown"
    return str(status).strip().lower()
