"""Domain models for the card generation pipeline.

Consumes card-gen-contract.json plus render-packet-contract.json so the FastAPI
sidecar and TypeScript contract share the same wire field limits.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

_REPO_ROOT = Path(__file__).resolve().parents[2]
_RENDER_PACKET_CONTRACT_PATH = _REPO_ROOT / "render-packet-contract.json"
_CARD_GEN_CONTRACT_PATH = _REPO_ROOT / "card-gen-contract.json"
_RENDER_PACKET_CONTRACT = json.loads(_RENDER_PACKET_CONTRACT_PATH.read_text(encoding="utf-8"))
_CARD_GEN_CONTRACT = json.loads(_CARD_GEN_CONTRACT_PATH.read_text(encoding="utf-8"))
_REQUEST_LIMITS = _CARD_GEN_CONTRACT["request"]["fieldLimits"]
PANEL_IDS = tuple(_RENDER_PACKET_CONTRACT["panelIds"])
PANEL_WIDTH = _RENDER_PACKET_CONTRACT["target"]["widthPixels"]
PANEL_HEIGHT = _RENDER_PACKET_CONTRACT["target"]["heightPixels"]
HEADLINE_MAX_CHARACTERS = _RENDER_PACKET_CONTRACT["copyLimits"]["headlineMaxCharacters"]
BODY_MAX_CHARACTERS = _RENDER_PACKET_CONTRACT["copyLimits"]["bodyMaxCharacters"]
ART_DIRECTION_MIN_CHARACTERS = _RENDER_PACKET_CONTRACT["copyLimits"]["artDirectionMinCharacters"]
ART_DIRECTION_MAX_CHARACTERS = _RENDER_PACKET_CONTRACT["copyLimits"]["artDirectionMaxCharacters"]


def _text_field_limits(field_name: str) -> dict[str, int]:
    limits = _REQUEST_LIMITS[field_name]
    return {
        key: value
        for key, value in {
            "min_length": limits.get("minLength"),
            "max_length": limits.get("maxLength"),
        }.items()
        if value is not None
    }

PanelId = Literal["front", "inside-left", "inside-right", "back"]
MemoryNote = Annotated[
    str,
    Field(
        min_length=_REQUEST_LIMITS["memory_notes"]["itemMinLength"],
        max_length=_REQUEST_LIMITS["memory_notes"]["itemMaxLength"],
    ),
]


class CardDraftInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sender: str = Field(**_text_field_limits("sender"))
    recipient: str = Field(**_text_field_limits("recipient"))
    relationship: str = Field(**_text_field_limits("relationship"))
    occasion: str = Field(**_text_field_limits("occasion"))
    tone: str = Field(**_text_field_limits("tone"))
    style: str = Field(**_text_field_limits("style"))
    language: str = Field(
        default=_CARD_GEN_CONTRACT["request"]["defaults"]["language"],
        **_text_field_limits("language"),
    )
    personal_note: str = Field(
        default=_CARD_GEN_CONTRACT["request"]["defaults"]["personal_note"],
        max_length=_REQUEST_LIMITS["personal_note"]["maxLength"],
    )
    memory_notes: list[MemoryNote] = Field(
        default_factory=list,
        max_length=_REQUEST_LIMITS["memory_notes"]["maxItems"],
    )


class PanelCopy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: PanelId
    headline: str = Field(min_length=1, max_length=HEADLINE_MAX_CHARACTERS)
    body: str = Field(min_length=1, max_length=BODY_MAX_CHARACTERS)
    art_direction: str = Field(
        min_length=ART_DIRECTION_MIN_CHARACTERS,
        max_length=ART_DIRECTION_MAX_CHARACTERS,
        description="Brief visual prompt for the image generator: style, palette, mood, composition.",
    )


class CardCopyOutput(BaseModel):
    """Structured output returned by the text generation agent."""

    model_config = ConfigDict(extra="forbid")

    panels: list[PanelCopy] = Field(
        min_length=4,
        max_length=4,
        description="Exactly 4 panels in order: front, inside-left, inside-right, back.",
    )
    memory_citations: list[str] = Field(
        default_factory=list,
        description="Memory notes that influenced the copy, for provenance display.",
    )


class ImageNormalizationProof(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["normalized-to-render-packet", "verified-render-packet"]
    source_width: int
    source_height: int
    target_width: int = PANEL_WIDTH
    target_height: int = PANEL_HEIGHT
    operation: Literal["resize-crop", "verified-target-size"]


class CardImageResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    panel_id: PanelId
    image_url: str
    revised_prompt: str | None = None
    width: int
    height: int
    normalization: ImageNormalizationProof


class CardGenerationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    draft_id: str
    card_copy: CardCopyOutput
    images: list[CardImageResult] = Field(default_factory=list)
    generated_by: Literal["ai-text-only", "ai-text-and-image"] = "ai-text-only"
