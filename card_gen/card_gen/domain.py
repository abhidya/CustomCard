"""Domain models for the card generation pipeline.

Mirrors the TypeScript interfaces in src/freeMvp.ts so the FastAPI endpoint
speaks the same contract as the browser app.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

PanelId = Literal["front", "inside-left", "inside-right", "back"]


class CardDraftInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sender: str = Field(min_length=1)
    recipient: str = Field(min_length=1)
    relationship: str = Field(min_length=1)
    occasion: str = Field(min_length=1)
    tone: str = Field(min_length=1)
    style: str = Field(min_length=1)
    language: str = "English"
    personal_note: str = ""
    memory_notes: list[str] = Field(default_factory=list)


class PanelCopy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: PanelId
    headline: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=600)
    art_direction: str = Field(
        min_length=10,
        max_length=400,
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
    width: int = 1500
    height: int = 2100


class CardGenerationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    draft_id: str
    card_copy: CardCopyOutput
    images: list[CardImageResult] = Field(default_factory=list)
    generated_by: Literal["ai-text-only", "ai-text-and-image"] = "ai-text-only"
