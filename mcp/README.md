# CustomCard MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server that turns
CustomCard into a **card concierge** any MCP client (Claude Code, Claude
Desktop, IDE extensions) can drive end to end — from a relationship signal to a
print-ready, honestly-fulfilled greeting card.

It is **dependency-free** and runs straight from a fresh clone: it speaks
newline-delimited JSON-RPC 2.0 over stdio and imports CustomCard's real
TypeScript domain (`src/*.ts`) directly via [`loader.mjs`](./loader.mjs), so no
`npm install` and no build step are required, and no domain logic is duplicated.

## Why this shape

CustomCard's value is the pipeline that takes a card-worthy moment and produces
a finished, print-safe card with an honest path to a printer. The tools mirror
that pipeline rather than wrapping the repo's CLI:

| Tool | Pipeline step |
| --- | --- |
| `detect_card_opportunity` | Spot the moment in pasted text (ICS / invite / note): infer occasion, recipient, date, urgency, confidence, evidence, next step. |
| `draft_card` | Generate 4 inspectable print panels (front, inside-left, message, back) with headline, body, and art direction — plus a print-fitness validation report. |
| `render_card_panels` | Render print-ready 5×7 (1500×2100 @ 300dpi) SVG panels with export filenames. |
| `recommend_fulfillment` | Lowest estimate / fastest pickup / cheapest shipped, from review-only public printer pricing — never a live quote or a placed order. |
| `build_print_handoff` | The manual upload checklist for a chosen printer (CustomCard never stores card details or places orders). |
| `list_card_options` | Valid tones, styles, languages, supported printers, and recognized occasions. |

A typical agent run: `detect_card_opportunity` on a pasted invite →
`draft_card` for the recipient/occasion → `render_card_panels` to get the SVGs →
`recommend_fulfillment` → `build_print_handoff`.

## Usage

The repo ships a project-scoped [`.mcp.json`](../.mcp.json), so Claude Code
discovers the server automatically in this directory. Approve it when prompted
(`/mcp` to inspect), then ask for things like *"find the card opportunity in
this invite and draft a warm birthday card for Aunt Sofia."*

Run it directly:

```bash
npm run mcp:serve
# or
node --disable-warning=ExperimentalWarning mcp/server.mjs
```

Register it with another client (Claude Desktop config excerpt):

```json
{
  "mcpServers": {
    "customcard": {
      "command": "node",
      "args": ["--disable-warning=ExperimentalWarning", "/abs/path/CustomCard/mcp/server.mjs"]
    }
  }
}
```

## Honesty guarantees (inherited from the domain)

These are enforced by the domain code the tools call, not by the MCP layer:

- `recommend_fulfillment` returns review-only estimates: `liveQuote: false`,
  `directOrderEnabled: false`, with a disclaimer and manual-confirmation flags.
- `build_print_handoff` reports `realOrdersEnabled: false` /
  `canPlaceRealOrder: false` and lists what still happens outside CustomCard.
- `draft_card` uses the deterministic, content-safe template
  (`generatedBy: "deterministic-free-template"`) and validates print fitness.

## Requirements

- Node 22.18+ (native TypeScript type-stripping). The `loader.mjs` hooks add
  extensionless-import and JSON-import resolution for the domain modules.
