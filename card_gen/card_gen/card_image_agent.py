"""Async image generation for 4 card panels.

Calls the OpenAI Images API (DALL-E 3) with each panel's art_direction prompt.
All 4 panels are generated concurrently. The factory is provider-agnostic: swap
the _generate_one implementation to route to Flux, Ideogram, or any other backend.

Safety gate: image_generation_enabled must be True at call time. The FastAPI
app leaves it False by default so images are skipped unless OPENAI_API_KEY is
set and image generation is explicitly opted in.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

import httpx

from .domain import CardImageResult, PanelCopy, PanelId
from .image_normalization import ProviderImageNormalizationAdapter

_OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations"

# DALL-E 3 size closest to 5×7 portrait (1:1.4). 1024×1536 is not yet stable;
# use 1024×1792 (1:1.75) as the best available portrait option.
_DALL_E_SIZE = "1024x1792"


@dataclass(frozen=True)
class CardImageAgentFactory:
    api_key: str
    model: str = "dall-e-3"
    quality: str = "standard"
    timeout_seconds: float = 90.0
    normalizer: ProviderImageNormalizationAdapter = field(default_factory=ProviderImageNormalizationAdapter)

    async def generate_panel(self, panel: PanelCopy) -> CardImageResult:
        prompt = _build_prompt(panel)
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(
                _OPENAI_IMAGE_URL,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "n": 1,
                    "size": _DALL_E_SIZE,
                    "quality": self.quality,
                },
            )
            response.raise_for_status()
            data = response.json()["data"][0]
            return await self.normalizer.normalize_url(
                client=client,
                panel_id=panel.id,
                image_url=data["url"],
                revised_prompt=data.get("revised_prompt"),
            )

    async def generate_all(self, panels: list[PanelCopy]) -> list[CardImageResult]:
        """Generate all 4 panel images concurrently."""
        results = await asyncio.gather(
            *[self.generate_panel(p) for p in panels],
            return_exceptions=True,
        )
        out: list[CardImageResult] = []
        for panel, result in zip(panels, results):
            if isinstance(result, BaseException):
                raise RuntimeError(
                    f"Image generation failed for panel {panel.id!r}: {result}"
                ) from result
            out.append(result)
        return out


def _build_prompt(panel: PanelCopy) -> str:
    panel_roles = {
        "front": "greeting card cover",
        "inside-left": "greeting card interior left panel",
        "inside-right": "greeting card interior right panel",
        "back": "greeting card back",
    }
    role = panel_roles.get(panel.id, panel.id)
    return (
        f"5x7 print-quality greeting card artwork, 300 DPI, {role}. "
        f"{panel.art_direction} "
        "The remembered object or scene should feel specific to a real relationship, not like stock occasion art. "
        "Leave a deliberate clean text-safe area for the card's printed message. "
        "No text, words, letters, fake handwriting, logos, people, faces, or hands in the image. "
        "Avoid generic greeting-card clipart unless the art direction explicitly earns it. "
        "Photorealistic, illustrated, collage, letterpress, or paper-art treatment as appropriate. "
        "Bleed edges, professional print layout, premium tactile material feel."
    )
