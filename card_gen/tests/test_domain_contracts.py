"""Domain model contract tests — no live API calls, no pydantic-ai import needed."""

from __future__ import annotations

import pytest

from card_gen.domain import (
    CardCopyOutput,
    CardDraftInput,
    CardGenerationResult,
    CardImageResult,
    PanelCopy,
)


def _minimal_input() -> CardDraftInput:
    return CardDraftInput(
        sender="Alex",
        recipient="Sara",
        relationship="best friend",
        occasion="birthday",
        tone="warm",
        style="watercolor botanical",
    )


def _panel(panel_id: str, headline: str = "Happy birthday", body: str = "Wishing you joy.") -> PanelCopy:
    return PanelCopy(
        id=panel_id,  # type: ignore[arg-type]
        headline=headline,
        body=body,
        art_direction="Soft watercolor botanicals, pastel palette, warm morning light.",
    )


def _full_copy() -> CardCopyOutput:
    return CardCopyOutput(
        panels=[
            _panel("front", headline="Here's to you"),
            _panel("inside-left", body="Wishing you a year full of beautiful moments."),
            _panel("inside-right", body="With love always, Alex."),
            _panel("back", headline="Made with care"),
        ],
        memory_citations=["likes botanical cards"],
    )


class TestCardDraftInput:
    def test_round_trip_json(self) -> None:
        inp = _minimal_input()
        assert CardDraftInput.model_validate(inp.model_dump()) == inp

    def test_rejects_extra_fields(self) -> None:
        with pytest.raises(Exception):
            CardDraftInput.model_validate({"sender": "A", "unknown_field": True})

    def test_defaults(self) -> None:
        inp = _minimal_input()
        assert inp.language == "English"
        assert inp.personal_note == ""
        assert inp.memory_notes == []


class TestPanelCopy:
    def test_valid_panel_ids(self) -> None:
        for pid in ("front", "inside-left", "inside-right", "back"):
            panel = _panel(pid)
            assert panel.id == pid

    def test_rejects_unknown_panel_id(self) -> None:
        with pytest.raises(Exception):
            _panel("cover")

    def test_headline_max_length_enforced(self) -> None:
        with pytest.raises(Exception):
            PanelCopy(
                id="front",
                headline="x" * 121,
                body="short body",
                art_direction="Some art direction for the panel.",
            )

    def test_body_max_length_enforced(self) -> None:
        with pytest.raises(Exception):
            PanelCopy(
                id="inside-left",
                headline="short",
                body="x" * 601,
                art_direction="Some art direction for the panel.",
            )


class TestCardCopyOutput:
    def test_requires_exactly_4_panels(self) -> None:
        with pytest.raises(Exception):
            CardCopyOutput(panels=[_panel("front"), _panel("inside-left"), _panel("inside-right")])

    def test_accepts_exactly_4_panels(self) -> None:
        copy = _full_copy()
        assert len(copy.panels) == 4

    def test_memory_citations_default_empty(self) -> None:
        copy = CardCopyOutput(
            panels=[_panel("front"), _panel("inside-left"), _panel("inside-right"), _panel("back")]
        )
        assert copy.memory_citations == []


class TestCardGenerationResult:
    def test_text_only_result(self) -> None:
        result = CardGenerationResult(
            draft_id="abc123",
            card_copy=_full_copy(),
            generated_by="ai-text-only",
        )
        assert result.images == []
        assert result.generated_by == "ai-text-only"

    def test_text_and_image_result(self) -> None:
        images = [
            CardImageResult(panel_id=pid, image_url=f"https://cdn.example.com/{pid}.png")
            for pid in ("front", "inside-left", "inside-right", "back")
        ]
        result = CardGenerationResult(
            draft_id="def456",
            card_copy=_full_copy(),
            images=images,
            generated_by="ai-text-and-image",
        )
        assert len(result.images) == 4
        assert result.images[0].width == 1500
        assert result.images[0].height == 2100

    def test_round_trip_json(self) -> None:
        result = CardGenerationResult(
            draft_id="xyz",
            card_copy=_full_copy(),
            generated_by="ai-text-only",
        )
        assert CardGenerationResult.model_validate(result.model_dump()) == result
