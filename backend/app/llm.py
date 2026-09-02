from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator

from .config import get_settings
from .models import Branch
from .mock_data import mock_deepdive, mock_expansion
from .prompts import (
    DEEPDIVE_SYSTEM,
    EXPAND_SYSTEM,
    build_deepdive_prompt,
    build_expand_prompt,
)

logger = logging.getLogger("mycelium.llm")

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    settings = get_settings()
    if not settings.has_llm:
        return None
    from openai import AsyncOpenAI

    _client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url or None,
        timeout=settings.request_timeout,
    )
    return _client


async def generate_expansion(
    concept: str, context: list[str], count: int
) -> tuple[str, list[Branch], bool]:
    client = _get_client()
    if client is None:
        summary, branches = mock_expansion(concept, count)
        return summary, branches, True

    settings = get_settings()
    try:
        resp = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": EXPAND_SYSTEM},
                {"role": "user", "content": build_expand_prompt(concept, context, count)},
            ],
            response_format={"type": "json_object"},
            temperature=0.8,
        )
        raw = resp.choices[0].message.content or "{}"
        data = json.loads(raw)
        summary = str(data.get("summary", "")).strip() or f"An overview of {concept}."
        branches: list[Branch] = []
        for item in data.get("branches", [])[:count]:
            try:
                branches.append(
                    Branch(
                        label=str(item["label"]).strip()[:80],
                        teaser=str(item.get("teaser", "")).strip()[:240],
                        relation=str(item.get("relation", "related")).strip()[:40],
                    )
                )
            except (KeyError, TypeError):
                continue
        if not branches:
            raise ValueError("model returned no usable branches")
        return summary, branches, False
    except Exception as exc:
        logger.warning("expansion via OpenAI failed, using mock: %s", exc)
        summary, branches = mock_expansion(concept, count)
        return summary, branches, True


async def stream_deepdive(concept: str, context: list[str]) -> AsyncIterator[tuple[str, bool]]:
    client = _get_client()
    if client is None:
        async for chunk in _stream_mock(concept, context):
            yield chunk, True
        return

    settings = get_settings()
    try:
        stream = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": DEEPDIVE_SYSTEM},
                {"role": "user", "content": build_deepdive_prompt(concept, context)},
            ],
            temperature=0.7,
            stream=True,
        )
        got_content = False
        async for event in stream:
            delta = event.choices[0].delta.content if event.choices else None
            if delta:
                got_content = True
                yield delta, False
        if not got_content:
            raise ValueError("empty stream from model")
    except Exception as exc:
        logger.warning("deep-dive via OpenAI failed, using mock: %s", exc)
        async for chunk in _stream_mock(concept, context):
            yield chunk, True


async def _stream_mock(concept: str, context: list[str]) -> AsyncIterator[str]:
    text = mock_deepdive(concept, context)
    tokens = text.split(" ")
    for i, tok in enumerate(tokens):
        yield tok + (" " if i < len(tokens) - 1 else "")
        await asyncio.sleep(0.012)
