from __future__ import annotations

from pydantic import BaseModel, Field


class ExpandRequest(BaseModel):
    concept: str = Field(..., min_length=1, max_length=200)
    context: list[str] = Field(default_factory=list, max_length=12)
    count: int = Field(default=6, ge=2, le=8)


class Branch(BaseModel):
    label: str = Field(..., max_length=80)
    teaser: str = Field(..., max_length=240)
    relation: str = Field(..., max_length=40)


class ExpandResponse(BaseModel):
    concept: str
    summary: str
    branches: list[Branch]
    demo: bool


class DeepDiveRequest(BaseModel):
    concept: str = Field(..., min_length=1, max_length=200)
    context: list[str] = Field(default_factory=list, max_length=12)


class SaveMapRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    data: dict


class MapSummary(BaseModel):
    id: str
    title: str
    node_count: int
    created_at: str
    updated_at: str


class SavedMap(MapSummary):
    data: dict


class HealthResponse(BaseModel):
    status: str
    llm_enabled: bool
    model: str | None
