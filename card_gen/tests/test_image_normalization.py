from __future__ import annotations

from io import BytesIO

import pytest

Image = pytest.importorskip("PIL.Image")

from card_gen.image_normalization import ProviderImageNormalizationAdapter


def test_normalizes_provider_image_to_render_packet_size() -> None:
    source = Image.new("RGB", (1024, 1792), "#76a9d4")
    payload = BytesIO()
    source.save(payload, format="PNG")

    result = ProviderImageNormalizationAdapter().normalize_bytes(
        panel_id="front",
        image_bytes=payload.getvalue(),
        revised_prompt="soft blue card",
    )

    assert result.width == 1500
    assert result.height == 2100
    assert result.image_url.startswith("data:image/jpeg;base64,")
    assert result.normalization.status == "normalized-to-render-packet"
    assert result.normalization.operation == "resize-crop"
    assert result.normalization.source_width == 1024
    assert result.normalization.source_height == 1792
