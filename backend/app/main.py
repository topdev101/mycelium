from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from . import db
from .config import get_settings
from .llm import generate_expansion, stream_deepdive
from .models import (
    DeepDiveRequest,
    ExpandRequest,
    ExpandResponse,
    HealthResponse,
    MapSummary,
    SaveMapRequest,
    SavedMap,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    settings = get_settings()
    logging.getLogger("mycelium").info(
        "Mycelium up. LLM=%s model=%s",
        "on" if settings.has_llm else "DEMO (no key)",
        settings.openai_model if settings.has_llm else "-",
    )
    yield


app = FastAPI(title="Mycelium API", version="1.0.0", lifespan=lifespan)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    s = get_settings()
    return HealthResponse(
        status="ok",
        llm_enabled=s.has_llm,
        model=s.openai_model if s.has_llm else None,
    )


@app.post("/api/expand", response_model=ExpandResponse)
async def expand(req: ExpandRequest) -> ExpandResponse:
    summary, branches, demo = await generate_expansion(req.concept, req.context, req.count)
    return ExpandResponse(concept=req.concept, summary=summary, branches=branches, demo=demo)


@app.post("/api/deepdive")
async def deepdive(req: DeepDiveRequest) -> StreamingResponse:
    async def event_stream() -> AsyncIterator[bytes]:
        demo_flag = False
        try:
            async for chunk, is_demo in stream_deepdive(req.concept, req.context):
                demo_flag = demo_flag or is_demo
                payload = json.dumps({"text": chunk})
                yield f"event: token\ndata: {payload}\n\n".encode()
        except Exception as exc:
            err = json.dumps({"message": str(exc)})
            yield f"event: error\ndata: {err}\n\n".encode()
            return
        done = json.dumps({"demo": demo_flag})
        yield f"event: done\ndata: {done}\n\n".encode()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/maps", response_model=list[MapSummary])
async def list_maps() -> list[MapSummary]:
    return db.list_maps()


@app.post("/api/maps", response_model=SavedMap)
async def save_map(req: SaveMapRequest) -> SavedMap:
    return db.save_map(req.title, req.data)


@app.get("/api/maps/{map_id}", response_model=SavedMap)
async def get_map(map_id: str) -> SavedMap:
    m = db.get_map(map_id)
    if m is None:
        raise HTTPException(status_code=404, detail="map not found")
    return m


@app.delete("/api/maps/{map_id}")
async def delete_map(map_id: str) -> dict:
    if not db.delete_map(map_id):
        raise HTTPException(status_code=404, detail="map not found")
    return {"deleted": map_id}
