"""PydanticAI text generation agent for greeting card copy.

Produces a CardCopyOutput with exactly 4 typed panels (front, inside-left,
inside-right, back) including per-panel art direction prompts for the image
generation stage.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Any

from .domain import CardCopyOutput, CardDraftInput

_PANEL_INSTRUCTIONS = """
You are generating copy for a 5x7 folded greeting card. Return exactly 4 panels:

  front        - Cover. Headline <= 10 words. Body is one short support line, <= 14 words.
  inside-left  - Heartfelt opening message, 2-3 sentences.
  inside-right - Personal closing + room for handwritten signature, 2-3 sentences.
  back         - Subtle back-cover tagline, <= 8 words, plus a tiny production note body.

Make the card feel custom, not like an occasion template:

  - Start from the relationship and any personal_note or memory_notes.
  - Choose one remembered object, scene, phrase, habit, or practical act as the card's anchor.
  - Name the emotional job: pride, comfort, gratitude, repair, encouragement, or celebration.
  - Avoid greeting-card aisle shorthand unless the memory specifically earns it.
  - Never invent facts about the recipient. If details are sparse, ask the copy to notice the sparseness honestly.

For EACH panel also provide art_direction for an image generation model. Each art_direction must include:

  - the remembered object or scene
  - the emotional job
  - composition and text-safe zone
  - style, palette, and material feel
  - at least two forbidden cliches to avoid
  - "no readable text, no logos, no people, no faces, no hands"

Use memory_citations for the exact personal_note or memory_notes that influenced the card.
"""


@dataclass(frozen=True)
class CardTextAgentDeps:
    draft_input: CardDraftInput


@dataclass
class CardTextAgentFactory:
    model_name: str
    api_key: str
    provider: str = "anthropic"
    base_url: str | None = None
    temperature: float = 0.75
    max_tokens: int = 2048
    request_limit: int = 1
    _agent: Any | None = None
    _lock: threading.Lock = threading.Lock  # type: ignore[assignment]

    def __post_init__(self) -> None:
        self._lock = threading.Lock()

    def require_dependencies(self) -> None:
        _load_imports()

    def build_agent(self) -> Any:
        if self._agent is not None:
            return self._agent
        with self._lock:
            if self._agent is None:
                self._agent = self._build()
            return self._agent

    def _build(self) -> Any:
        imp = _load_imports()
        model = self._build_model(imp)
        agent = imp.Agent(
            model,
            deps_type=CardTextAgentDeps,
            output_type=CardCopyOutput,
            model_settings={
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
            },
            instructions=_PANEL_INSTRUCTIONS,
        )

        @agent.tool
        def get_card_context(ctx: imp.RunContext[CardTextAgentDeps]) -> dict[str, Any]:
            """Return all card input fields needed to write personalised copy."""
            d = ctx.deps.draft_input
            return {
                "sender": d.sender,
                "recipient": d.recipient,
                "relationship": d.relationship,
                "occasion": d.occasion,
                "tone": d.tone,
                "style": d.style,
                "language": d.language,
                "personal_note": d.personal_note,
                "memory_notes": d.memory_notes,
            }

        return agent

    def _build_model(self, imp: Any) -> Any:
        if self.provider == "anthropic":
            provider = imp.AnthropicProvider(api_key=self.api_key)
            return imp.AnthropicModel(self.model_name, provider=provider)
        if self.provider in ("openai", "nvidia"):
            kwargs: dict[str, Any] = {"api_key": self.api_key}
            if self.base_url:
                kwargs["base_url"] = self.base_url
            provider = imp.OpenAIProvider(**kwargs)
            return imp.OpenAIChatModel(self.model_name, provider=provider)
        raise ValueError(f"Unsupported text agent provider: {self.provider!r}")

    async def generate(self, draft_input: CardDraftInput) -> CardCopyOutput:
        imp = _load_imports()
        agent = self.build_agent()
        deps = CardTextAgentDeps(draft_input=draft_input)
        prompt_parts = [
            f"Write a {draft_input.occasion} greeting card",
            f"from {draft_input.sender!r} to {draft_input.recipient!r}",
            f"relationship: {draft_input.relationship}.",
            f"Tone: {draft_input.tone}.",
            f"Style: {draft_input.style}.",
            f"Language: {draft_input.language}.",
        ]
        if draft_input.personal_note:
            prompt_parts.append(f"Personal note to honor: {draft_input.personal_note}.")
        if draft_input.memory_notes:
            prompt_parts.append(f"Memory notes to cite when used: {draft_input.memory_notes!r}.")
        prompt_parts.append(
            "Before writing, silently choose the remembered object, emotional job, and forbidden cliches for the card."
        )
        prompt = " ".join(prompt_parts)
        result = await agent.run(
            prompt,
            deps=deps,
            usage_limits=imp.UsageLimits(request_limit=max(1, self.request_limit)),
        )
        return result.output


# ---------------------------------------------------------------------------
# Lazy import guard — mirrors Ready project's load_agent_client_imports()
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class _Imports:
    Agent: Any
    RunContext: Any
    UsageLimits: Any
    AnthropicModel: Any
    AnthropicProvider: Any
    OpenAIChatModel: Any
    OpenAIProvider: Any


def _load_imports() -> _Imports:
    try:
        from pydantic_ai import Agent, RunContext, UsageLimits
        from pydantic_ai.models.anthropic import AnthropicModel
        from pydantic_ai.models.openai import OpenAIChatModel
        from pydantic_ai.providers.anthropic import AnthropicProvider
        from pydantic_ai.providers.openai import OpenAIProvider
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Install pydantic-ai-slim[anthropic,openai] before using the card text agent"
        ) from exc
    return _Imports(
        Agent=Agent,
        RunContext=RunContext,
        UsageLimits=UsageLimits,
        AnthropicModel=AnthropicModel,
        AnthropicProvider=AnthropicProvider,
        OpenAIChatModel=OpenAIChatModel,
        OpenAIProvider=OpenAIProvider,
    )
