import httpx

from app.config import settings


class TinyfishError(RuntimeError):
    """Raised when TinyFish returns an unexpected response."""


class TinyfishClient:
    def __init__(self) -> None:
        if not settings.tinyfish_api_key:
            raise TinyfishError("TINYFISH_API_KEY is not configured")

        self._headers = {
            "Content-Type": "application/json",
            "X-API-Key": settings.tinyfish_api_key,
        }

    async def start_run(
        self,
        *,
        url: str,
        goal: str,
        browser_profile: str = "lite",
        proxy_config: dict | None = None,
    ) -> dict:
        payload: dict = {
            "url": url,
            "goal": goal,
            "browser_profile": browser_profile,
        }
        if proxy_config is not None:
            payload["proxy_config"] = proxy_config

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.tinyfish_base_url}/automation/run-async",
                headers=self._headers,
                json=payload,
            )
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise TinyfishError(
                    f"TinyFish start_run failed with status {response.status_code}: {response.text}"
                ) from exc
            return response.json()

    async def get_run(self, run_id: str) -> dict:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{settings.tinyfish_base_url}/runs/{run_id}",
                headers=self._headers,
            )
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise TinyfishError(
                    f"TinyFish get_run failed with status {response.status_code}: {response.text}"
                ) from exc
            return response.json()
