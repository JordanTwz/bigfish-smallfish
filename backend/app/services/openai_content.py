import json

from openai import OpenAI

from app.config import settings


class OpenAIContentError(RuntimeError):
    """Raised when OpenAI content generation fails."""


class OpenAIContentClient:
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise OpenAIContentError("OPENAI_API_KEY is not configured")
        self._client = OpenAI(api_key=settings.openai_api_key)

    def generate_json(self, *, system_prompt: str, user_prompt: str) -> dict:
        response = self._client.responses.create(
            model=settings.openai_model,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        text = getattr(response, "output_text", None)
        if not text:
            raise OpenAIContentError("OpenAI returned an empty response")
        return _parse_json_output(text)


def _parse_json_output(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        parts = cleaned.split("```")
        if len(parts) >= 3:
            cleaned = parts[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise OpenAIContentError(f"Failed to parse OpenAI JSON output: {cleaned}") from exc
    if not isinstance(parsed, dict):
        raise OpenAIContentError("OpenAI response JSON must be an object")
    return parsed
