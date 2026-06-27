"""Normalize provider images before they cross the CardImageResult interface."""

from __future__ import annotations

import base64
from dataclasses import dataclass
from io import BytesIO

from .domain import PANEL_HEIGHT, PANEL_WIDTH, CardImageResult, ImageNormalizationProof, PanelId


@dataclass(frozen=True)
class ProviderImageNormalizationAdapter:
    target_width: int = PANEL_WIDTH
    target_height: int = PANEL_HEIGHT
    output_format: str = "JPEG"
    quality: int = 92

    async def normalize_url(
        self,
        *,
        client,
        panel_id: PanelId,
        image_url: str,
        revised_prompt: str | None = None,
    ) -> CardImageResult:
        image_bytes = _decode_data_url(image_url)
        if image_bytes is None:
            response = await client.get(image_url)
            response.raise_for_status()
            image_bytes = response.content
        return self.normalize_bytes(
            panel_id=panel_id,
            image_bytes=image_bytes,
            revised_prompt=revised_prompt,
        )

    def normalize_bytes(
        self,
        *,
        panel_id: PanelId,
        image_bytes: bytes,
        revised_prompt: str | None = None,
    ) -> CardImageResult:
        try:
            from PIL import Image, ImageOps
        except ImportError as exc:
            raise RuntimeError("Pillow is required to normalize provider images to Render Packet size.") from exc

        with Image.open(BytesIO(image_bytes)) as source_image:
            source_width, source_height = source_image.size
            normalized = ImageOps.fit(
                source_image.convert("RGB"),
                (self.target_width, self.target_height),
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
        output = BytesIO()
        normalized.save(output, format=self.output_format, quality=self.quality, optimize=True)
        operation = "verified-target-size" if (source_width, source_height) == (self.target_width, self.target_height) else "resize-crop"
        status = "verified-render-packet" if operation == "verified-target-size" else "normalized-to-render-packet"
        return CardImageResult(
            panel_id=panel_id,
            image_url=_data_url(output.getvalue(), self.output_format),
            revised_prompt=revised_prompt,
            width=self.target_width,
            height=self.target_height,
            normalization=ImageNormalizationProof(
                status=status,
                source_width=source_width,
                source_height=source_height,
                target_width=self.target_width,
                target_height=self.target_height,
                operation=operation,
            ),
        )


def _decode_data_url(value: str) -> bytes | None:
    header, separator, payload = value.partition(",")
    if separator != "," or not header.lower().startswith("data:image/"):
        return None
    if ";base64" not in header.lower():
        return None
    return base64.b64decode(payload)


def _data_url(image_bytes: bytes, output_format: str) -> str:
    mime = "image/jpeg" if output_format.upper() == "JPEG" else f"image/{output_format.lower()}"
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime};base64,{encoded}"
