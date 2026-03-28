from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, HttpUrl


class RunCreate(BaseModel):
    source_url: HttpUrl
    goal: str


class RunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tinyfish_run_id: str | None
    status: str
    source_url: str
    goal: str
    result_jsonb: dict[str, Any] | None
    error_jsonb: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None
