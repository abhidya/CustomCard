"""Domain models for the card generation pipeline.

Mirrors the TypeScript interfaces in src/freeMvp.ts so the FastAPI endpoint
speaks the same contract as the browser app.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

_CONTRACT_PATH = Path(__file__).resolve().parents[2] / "render-packet-contract.json"
_CONTRACT = json.loads(_CONTRACT_PATH.read_text(encoding="utf-8"))
PANEL_IDS = tuple(_CONTRACT["panelIds"])
PANEL_WIDTH = _CONTRACT["target"]["widthPixels"]
PANEL_HEIGHT = _CONTRACT["target"]["heightPixels"]
HEADLINE_MAX_CHARACTERS = _CONTRACT["copyLimits"]["headlineMaxCharacters"]
BODY_MAX_CHARACTERS = _CONTRACT["copyLimits"]["bodyMaxCharacters"]
ART_DIRECTION_MIN_CHARACTERS = _CONTRACT["copyLimits"]["artDirectionMinCharacters"]
ART_DIRECTION_MAX_CHARACTERS = _CONTRACT["copyLimits"]["artDirectionMaxCharacters"]

PanelId = Literal["front", "inside-left", "inside-right", "back"]
MemoryNote = Annotated[str, Field(min_length=1, max_length=500)]


class CardDraftInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sender: str = Field(min_length=1, max_length=120)
    recipient: str = Field(min_length=1, max_length=120)
    relationship: str = Field(min_length=1, max_length=120)
    occasion: str = Field(min_length=1, max_length=120)
    tone: str = Field(min_length=1, max_length=80)
    style: str = Field(min_length=1, max_length=120)
    language: str = Field(default="English", min_length=1, max_length=80)
    personal_note: str = Field(default="", max_length=1_000)
    memory_notes: list[MemoryNote] = Field(default_factory=list, max_length=12)


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


class CardImageResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    panel_id: PanelId
    image_url: str
    revised_prompt: str | None = None
    width: int = PANEL_WIDTH
    height: int = PANEL_HEIGHT


class CardGenerationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    draft_id: str
    card_copy: CardCopyOutput
    images: list[CardImageResult] = Field(default_factory=list)
    generated_by: Literal["ai-text-only", "ai-text-and-image"] = "ai-text-only"
