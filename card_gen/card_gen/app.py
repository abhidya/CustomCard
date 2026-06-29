"""FastAPI app for the card generation sidecar.

Environment variables:
  ANTHROPIC_API_KEY      required — text generation model
  CARD_GEN_API_TOKEN     required for /generate
  CARD_GEN_ALLOWED_ORIGINS optional comma-separated browser origins for CORS
  CARD_GEN_RATE_LIMIT_PER_MINUTE optional — defaults to 12
  CARD_GEN_MONTHLY_BUDGET_CENTS optional — defaults to 3000
  CARD_GEN_PER_REQUEST_BUDGET_CENTS optional — defaults to 400
  CARD_TEXT_UNIT_COST_CENTS optional — defaults to 12
  CARD_IMAGE_UNIT_COST_CENTS optional — defaults to 75
  CARD_GEN_MAX_BODY_BYTES optional — defaults to 32768
  OPENAI_API_KEY         optional — enables image generation
  CARD_TEXT_MODEL        optional — defaults to claude-sonnet-4-6
  CARD_TEXT_MAX_TOKENS   optional — defaults to 1200
  CARD_TEXT_REQUEST_LIMIT optional — defaults to 1
  CARD_IMAGE_MODEL       optional — defaults to dall-e-3
  CARD_IMAGE_QUALITY     optional — defaults to standard

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
_monthly_spend_buckets: dict[str, int] = {}


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


def _allowed_origins() -> list[str]:
    return [origin.strip() for origin in os.environ.get("CARD_GEN_ALLOWED_ORIGINS", "").split(",") if origin.strip()]


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


def _month_bucket() -> str:
    return time.strftime("%Y-%m", time.gmtime())


def _estimated_request_cost_cents(service: CardGenService) -> int:
    text_unit_cost = max(0, _env_int("CARD_TEXT_UNIT_COST_CENTS", 12))
    image_unit_cost = max(0, _env_int("CARD_IMAGE_UNIT_COST_CENTS", 75))
    image_units = 4 if service.image_factory is not None else 0
    return text_unit_cost + image_unit_cost * image_units


def _enforce_spend_budget(service: CardGenService, budget_key: str) -> None:
    estimated_cost = _estimated_request_cost_cents(service)
    per_request_budget = max(0, _env_int("CARD_GEN_PER_REQUEST_BUDGET_CENTS", 400))
    monthly_budget = max(0, _env_int("CARD_GEN_MONTHLY_BUDGET_CENTS", 3000))
    if estimated_cost > per_request_budget:
        raise HTTPException(
            status_code=429,
            detail=f"Card generation estimated cost {estimated_cost}c exceeds per-request budget {per_request_budget}c",
        )
    bucket_key = f"{budget_key}:{_month_bucket()}"
    projected = _monthly_spend_buckets.get(bucket_key, 0) + estimated_cost
    if projected > monthly_budget:
        raise HTTPException(
            status_code=429,
            detail=f"Card generation projected monthly spend {projected}c exceeds monthly budget {monthly_budget}c",
        )
    if len(_monthly_spend_buckets) > 10_000:
        _monthly_spend_buckets.clear()
    _monthly_spend_buckets[bucket_key] = projected


def require_card_gen_auth(
    request: Request,
    authorization: str | None = Header(default=None),
) -> str:
    expected_token = os.environ.get("CARD_GEN_API_TOKEN", "")

    if len(expected_token) < 32:
        raise HTTPException(status_code=503, detail="CARD_GEN_API_TOKEN must be configured with at least 32 characters")

    prefix = "Bearer "
    if not authorization or not authorization.startswith(prefix):
        raise HTTPException(status_code=401, detail="Card generation auth required")

    supplied_token = authorization[len(prefix) :]
    if not secrets.compare_digest(supplied_token, expected_token):
        raise HTTPException(status_code=401, detail="Invalid card generation token")

    _enforce_rate_limit(request, supplied_token)
    return _rate_limit_key(request, supplied_token)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _service

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not anthropic_key:
        raise RuntimeError("ANTHROPIC_API_KEY is required")

    text_factory = CardTextAgentFactory(
        model_name=os.environ.get("CARD_TEXT_MODEL", "claude-sonnet-4-6"),
        api_key=anthropic_key,
        max_tokens=max(256, _env_int("CARD_TEXT_MAX_TOKENS", 1200)),
        request_limit=max(1, _env_int("CARD_TEXT_REQUEST_LIMIT", 1)),
    )

    image_factory: CardImageAgentFactory | None = None
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if openai_key:
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
        chunks: list[bytes] = []
        total_bytes = 0
        async for chunk in request.stream():
            total_bytes += len(chunk)
            if total_bytes > max_body_bytes:
                return JSONResponse(status_code=413, content={"detail": "Card generation request body too large"})
            chunks.append(chunk)
        body = b"".join(chunks)

        consumed = False
        async def receive():
            nonlocal consumed
            if consumed:
                return {"type": "http.request", "body": b"", "more_body": False}
            consumed = True
            return {"type": "http.request", "body": body, "more_body": False}

        request = Request(request.scope, receive)
    return await call_next(request)


@app.post("/generate", response_model=CardGenerationResult)
async def generate_card(
    draft_input: CardDraftInput,
    budget_key: str = Depends(require_card_gen_auth),
) -> CardGenerationResult:
    if _service is None:  # pragma: no cover
        raise HTTPException(status_code=503, detail="Service not initialised")
    _enforce_spend_budget(_service, budget_key)
    return await _service.generate(draft_input)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "image_gen": "enabled" if _service and _service.image_factory else "disabled"}
