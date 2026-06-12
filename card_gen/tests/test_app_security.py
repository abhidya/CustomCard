from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from card_gen import app as app_module
from card_gen.domain import CardCopyOutput, CardDraftInput, CardGenerationResult, PanelCopy


TOKEN = "test-card-gen-api-token-32-chars"


class FakeCardGenService:
    image_factory = None

    async def generate(self, draft_input: CardDraftInput) -> CardGenerationResult:
        return CardGenerationResult(
            draft_id="test-draft",
            card_copy=CardCopyOutput(
                panels=[
                    PanelCopy(
                        id="front",
                        headline=f"For {draft_input.recipient}",
                        body="Wishing you joy.",
                        art_direction="Soft watercolor botanicals in warm morning light.",
                    ),
                    PanelCopy(
                        id="inside-left",
                        headline="A bright day",
                        body="May the day feel personal, kind, and full of care.",
                        art_direction="Gentle illustrated flowers with generous whitespace.",
                    ),
                    PanelCopy(
                        id="inside-right",
                        headline="With love",
                        body="Sending a note that feels made just for you.",
                        art_direction="Handmade paper texture with a calm pastel palette.",
                    ),
                    PanelCopy(
                        id="back",
                        headline="Made with care",
                        body="A small keepsake for a meaningful moment.",
                        art_direction="Minimal botanical mark centered on a cream paper field.",
                    ),
                ]
            ),
            generated_by="ai-text-only",
        )


@pytest.fixture(autouse=True)
def sidecar_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-anthropic-key")
    monkeypatch.delenv("CARD_GEN_API_TOKEN", raising=False)
    monkeypatch.delenv("CARD_GEN_ALLOW_UNAUTHENTICATED_LOCAL", raising=False)
    monkeypatch.delenv("CARD_GEN_RATE_LIMIT_PER_MINUTE", raising=False)
    monkeypatch.delenv("CARD_GEN_MONTHLY_BUDGET_CENTS", raising=False)
    monkeypatch.delenv("CARD_GEN_PER_REQUEST_BUDGET_CENTS", raising=False)
    monkeypatch.delenv("CARD_TEXT_UNIT_COST_CENTS", raising=False)
    monkeypatch.delenv("CARD_IMAGE_UNIT_COST_CENTS", raising=False)
    monkeypatch.delenv("CARD_GEN_MAX_BODY_BYTES", raising=False)
    app_module._rate_limit_buckets.clear()
    app_module._monthly_spend_buckets.clear()
    yield
    app_module._service = None
    app_module._rate_limit_buckets.clear()
    app_module._monthly_spend_buckets.clear()


def test_generate_requires_configured_bearer_token() -> None:
    with TestClient(app_module.app) as client:
        response = client.post("/generate", json=_payload())

    assert response.status_code == 503
    assert "CARD_GEN_API_TOKEN" in response.json()["detail"]


def test_generate_accepts_valid_bearer_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CARD_GEN_API_TOKEN", TOKEN)

    with TestClient(app_module.app) as client:
        app_module._service = FakeCardGenService()
        response = client.post(
            "/generate",
            headers={"Authorization": f"Bearer {TOKEN}"},
            json=_payload(recipient="Mina"),
        )

    assert response.status_code == 200
    assert response.json()["draft_id"] == "test-draft"
    assert response.json()["card_copy"]["panels"][0]["headline"] == "For Mina"


def test_generate_rate_limits_per_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CARD_GEN_API_TOKEN", TOKEN)
    monkeypatch.setenv("CARD_GEN_RATE_LIMIT_PER_MINUTE", "1")

    with TestClient(app_module.app) as client:
        app_module._service = FakeCardGenService()
        first = client.post("/generate", headers={"Authorization": f"Bearer {TOKEN}"}, json=_payload())
        second = client.post("/generate", headers={"Authorization": f"Bearer {TOKEN}"}, json=_payload())

    assert first.status_code == 200
    assert second.status_code == 429


def test_generate_enforces_monthly_budget_per_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CARD_GEN_API_TOKEN", TOKEN)
    monkeypatch.setenv("CARD_GEN_MONTHLY_BUDGET_CENTS", "12")
    monkeypatch.setenv("CARD_TEXT_UNIT_COST_CENTS", "12")

    with TestClient(app_module.app) as client:
        app_module._service = FakeCardGenService()
        first = client.post("/generate", headers={"Authorization": f"Bearer {TOKEN}"}, json=_payload())
        second = client.post("/generate", headers={"Authorization": f"Bearer {TOKEN}"}, json=_payload())

    assert first.status_code == 200
    assert second.status_code == 429
    assert "projected monthly spend" in second.json()["detail"]


def test_generate_rejects_oversized_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CARD_GEN_API_TOKEN", TOKEN)
    monkeypatch.setenv("CARD_GEN_MAX_BODY_BYTES", "1024")

    with TestClient(app_module.app) as client:
        app_module._service = FakeCardGenService()
        response = client.post(
            "/generate",
            headers={"Authorization": f"Bearer {TOKEN}"},
            json=_payload(personal_note="x" * 2_000),
        )

    assert response.status_code == 413


def test_local_unauthenticated_mode_is_explicit_opt_in(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CARD_GEN_ALLOW_UNAUTHENTICATED_LOCAL", "true")

    with TestClient(app_module.app) as client:
        app_module._service = FakeCardGenService()
        response = client.post("/generate", json=_payload())

    assert response.status_code == 200


def _payload(**overrides: str) -> dict[str, object]:
    payload: dict[str, object] = {
        "sender": "Alex",
        "recipient": "Sara",
        "relationship": "friend",
        "occasion": "birthday",
        "tone": "warm",
        "style": "watercolor botanical",
        "language": "English",
        "personal_note": "",
        "memory_notes": ["likes botanical cards"],
    }
    payload.update(overrides)
    return payload
