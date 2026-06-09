"""Orchestrates the two-stage card generation pipeline:

  Stage 1 — CardTextAgentFactory   → CardCopyOutput  (per-panel copy + art direction)
  Stage 2 — CardImageAgentFactory  → list[CardImageResult]  (4 concurrent image calls)

image_factory is optional; when absent, generated_by is "ai-text-only" and images
is empty. This matches the D008 safety posture: image generation stays off unless
OPENAI_API_KEY is present and the caller opts in.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from .card_image_agent import CardImageAgentFactory
from .card_text_agent import CardTextAgentFactory
from .domain import CardDraftInput, CardGenerationResult


@dataclass(frozen=True)
class CardGenService:
    text_factory: CardTextAgentFactory
    image_factory: CardImageAgentFactory | None = None

    async def generate(self, draft_input: CardDraftInput) -> CardGenerationResult:
        copy = await self.text_factory.generate(draft_input)
        images = []
        if self.image_factory is not None:
            images = await self.image_factory.generate_all(copy.panels)
        return CardGenerationResult(
            draft_id=uuid.uuid4().hex,
            card_copy=copy,
            images=images,
            generated_by="ai-text-and-image" if images else "ai-text-only",
        )
