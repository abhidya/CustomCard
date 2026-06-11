"""FastAPI app for the card generation sidecar.

Environment variables:
  ANTHROPIC_API_KEY      required — text generation model
  CARD_GEN_API_TOKEN     required for /generate unless local unauth opt-in is enabled
  CARD_GEN_ALLOWED_ORIGINS optional comma-separated browser origins for CORS
  CARD_GEN_RATE_LIMIT_PER_MINUTE optional — defaults to 12
  CARD_GEN_MAX_BODY_BYTES optional — defaults to 32768
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
import secrets
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .card_gen_service import CardGenService
from .card_image_agent import CardImageAgentFactory
from .card_text_agent import CardTextAgentFactory
from .domain import CardDraftInput, CardGenerationResult

_service: CardGenService | None = None
_rate_limit_buckets: dict[str, list[float]] = {}


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


def _allowed_origins() -> list[str]:
    return [origin.strip() for origin in os.environ.get("CARD_GEN_ALLOWED_ORIGINS", "").split(",") if origin.strip()]


def _is_local_request(request: Request) -> bool:
    host = request.client.host if request.client else ""
    return host in {"127.0.0.1", "::1", "localhost", "testclient"}


def _rate_limit_key(request: Request, token: str | None) -> str:
    if token:
        return f"token:{token[:12]}"
    return f"ip:{request.client.host if request.client else 'unknown'}"


def _enforce_rate_limit(request: Request, token: str | None) -> None:
    limit = max(1, _env_int("CARD_GEN_RATE_LIMIT_PER_MINUTE", 12))
    now = time.monotonic()
    key = _rate_limit_key(request, token)
    bucket = [timestamp for timestamp in _rate_limit_buckets.get(key, []) if now - timestamp < 60]
    bucket.append(now)
    if len(_rate_limit_buckets) > 10_000:
        _rate_limit_buckets.clear()
    _rate_limit_buckets[key] = bucket
    if len(bucket) > limit:
        raise HTTPException(status_code=429, detail="Card generation rate limit exceeded")


def require_card_gen_auth(
    request: Request,
    authorization: str | None = Header(default=None),
) -> None:
    expected_token = os.environ.get("CARD_GEN_API_TOKEN", "")
    allow_local_unauthenticated = os.environ.get("CARD_GEN_ALLOW_UNAUTHENTICATED_LOCAL", "false").lower() == "true"

    if allow_local_unauthenticated and _is_local_request(request):
        _enforce_rate_limit(request, None)
        return

    if len(expected_token) < 32:
        raise HTTPException(status_code=503, detail="CARD_GEN_API_TOKEN must be configured with at least 32 characters")

    prefix = "Bearer "
    if not authorization or not authorization.startswith(prefix):
        raise HTTPException(status_code=401, detail="Card generation auth required")

    supplied_token = authorization[len(prefix) :]
    if not secrets.compare_digest(supplied_token, expected_token):
        raise HTTPException(status_code=401, detail="Invalid card generation token")

    _enforce_rate_limit(request, supplied_token)


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

allowed_origins = _allowed_origins()
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )


@app.middleware("http")
async def enforce_generate_body_size(request: Request, call_next):
    if request.url.path == "/generate":
        max_body_bytes = max(1_024, _env_int("CARD_GEN_MAX_BODY_BYTES", 32_768))
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > max_body_bytes:
                    return JSONResponse(status_code=413, content={"detail": "Card generation request body too large"})
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length"})
    return await call_next(request)


@app.post("/generate", response_model=CardGenerationResult)
async def generate_card(
    draft_input: CardDraftInput,
    _: None = Depends(require_card_gen_auth),
) -> CardGenerationResult:
    if _service is None:  # pragma: no cover
        raise HTTPException(status_code=503, detail="Service not initialised")
    return await _service.generate(draft_input)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "image_gen": "enabled" if _service and _service.image_factory else "disabled"}
