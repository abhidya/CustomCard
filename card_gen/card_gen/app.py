"""FastAPI app for the card generation sidecar.

Environment variables:
  ANTHROPIC_API_KEY      required — text generation model
  OPENAI_API_KEY         optional — enables image generation
  CARD_TEXT_MODEL        optional — defaults to claude-sonnet-4-6
  CARD_IMAGE_MODEL       optional — defaults to dall-e-3
  CARD_IMAGE_QUALITY     optional — defaults to standard
  CARD_IMAGE_ENABLED     optional — set to "true" to enable image gen

Run locally:
  cd card_gen
  uv run uvicorn card_gen.app:app --reload --port 8001
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from .card_gen_service import CardGenService
from .card_image_agent import CardImageAgentFactory
from .card_text_agent import CardTextAgentFactory
from .domain import CardDraftInput, CardGenerationResult

_service: CardGenService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _service

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not anthropic_key:
        raise RuntimeError("ANTHROPIC_API_KEY is required")

    text_factory = CardTextAgentFactory(
        model_name=os.environ.get("CARD_TEXT_MODEL", "claude-sonnet-4-6"),
        api_key=anthropic_key,
    )

    image_factory: CardImageAgentFactory | None = None
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    image_enabled = os.environ.get("CARD_IMAGE_ENABLED", "false").lower() == "true"
    if openai_key and image_enabled:
        image_factory = CardImageAgentFactory(
            api_key=openai_key,
            model=os.environ.get("CARD_IMAGE_MODEL", "dall-e-3"),
            quality=os.environ.get("CARD_IMAGE_QUALITY", "standard"),
        )

    _service = CardGenService(text_factory=text_factory, image_factory=image_factory)
    yield
    _service = None


app = FastAPI(
    title="CustomCard generation service",
    description="PydanticAI-powered text + image pipeline for 5×7 greeting cards",
    version="0.1.0",
    lifespan=lifespan,
)


@app.post("/generate", response_model=CardGenerationResult)
async def generate_card(draft_input: CardDraftInput) -> CardGenerationResult:
    if _service is None:  # pragma: no cover
        raise HTTPException(status_code=503, detail="Service not initialised")
    return await _service.generate(draft_input)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "image_gen": "enabled" if _service and _service.image_factory else "disabled"}
