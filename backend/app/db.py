from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone

from .config import get_settings
from .models import MapSummary, SavedMap

_SCHEMA = """
CREATE TABLE IF NOT EXISTS maps (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    node_count  INTEGER NOT NULL DEFAULT 0,
    data        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(get_settings().db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(_SCHEMA)


def _node_count(data: dict) -> int:
    nodes = data.get("nodes")
    return len(nodes) if isinstance(nodes, list) else 0


def save_map(title: str, data: dict) -> SavedMap:
    map_id = uuid.uuid4().hex[:12]
    now = _now()
    payload = json.dumps(data, ensure_ascii=False)
    with _connect() as conn:
        conn.execute(
            "INSERT INTO maps (id, title, node_count, data, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (map_id, title, _node_count(data), payload, now, now),
        )
    return SavedMap(
        id=map_id,
        title=title,
        node_count=_node_count(data),
        data=data,
        created_at=now,
        updated_at=now,
    )


def list_maps() -> list[MapSummary]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, title, node_count, created_at, updated_at "
            "FROM maps ORDER BY updated_at DESC"
        ).fetchall()
    return [
        MapSummary(
            id=r["id"],
            title=r["title"],
            node_count=r["node_count"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]


def get_map(map_id: str) -> SavedMap | None:
    with _connect() as conn:
        r = conn.execute("SELECT * FROM maps WHERE id = ?", (map_id,)).fetchone()
    if r is None:
        return None
    return SavedMap(
        id=r["id"],
        title=r["title"],
        node_count=r["node_count"],
        data=json.loads(r["data"]),
        created_at=r["created_at"],
        updated_at=r["updated_at"],
    )


def delete_map(map_id: str) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM maps WHERE id = ?", (map_id,))
        return cur.rowcount > 0
