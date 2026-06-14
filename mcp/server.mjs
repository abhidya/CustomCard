#!/usr/bin/env node
/**
 * CustomCard MCP server — a card concierge for MCP clients.
 *
 * CustomCard turns a relationship signal into a finished, print-ready greeting
 * card. This server exposes that *product pipeline* (not its CLI) so an agent
 * can run the whole flow end to end:
 *
 *   detect_card_opportunity  → spot the card-worthy moment in pasted text
 *   draft_card               → generate inspectable 4-panel copy + art direction
 *                              and validate it for print fitness
 *   render_card_panels       → produce print-ready 5x7 SVG panels
 *   recommend_fulfillment    → honest pickup/shipping recommendations
 *   build_print_handoff      → the manual upload checklist for a chosen printer
 *   list_card_options        → the valid tones/styles/languages/printers/occasions
 *
 * Every tool calls the project's real TypeScript domain (src/*.ts) via a small
 * loader, so there is no duplicated logic and no build step. Transport is
 * newline-delimited JSON-RPC 2.0 over stdio with zero npm dependencies.
 */

import { register } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SERVER_NAME = "customcard";
const SERVER_VERSION = "0.1.0";
const DEFAULT_PROTOCOL_VERSION = "2024-11-05";
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");

// Let dynamic imports below load the TypeScript domain directly.
register(pathToFileURL(resolve(HERE, "loader.mjs")));

const srcUrl = (file) => pathToFileURL(resolve(REPO_ROOT, "src", file)).href;

// Lazy, memoized domain imports so a fresh clone starts instantly and an import
// failure surfaces as a tool error rather than crashing the server.
let domainPromise;
function domain() {
  if (!domainPromise) {
    domainPromise = (async () => ({
      free: await import(srcUrl("freeMvp.ts")),
      pricing: await import(srcUrl("printerPricing.ts")),
      fulfillment: await import(srcUrl("fulfillmentRecommendation.ts"))
    }))();
  }
  return domainPromise;
}

// --- input normalization ------------------------------------------------------

function toMemory(raw, index) {
  return {
    id: raw?.id ?? `mem-input-${index}`,
    recipient: String(raw?.recipient ?? ""),
    note: String(raw?.note ?? ""),
    tags: Array.isArray(raw?.tags) ? raw.tags.map(String) : [],
    approved: raw?.approved ?? true,
    sensitivity: raw?.sensitivity === "review" ? "review" : "normal",
    updatedAtIso: raw?.updatedAtIso ?? new Date().toISOString()
  };
}

function toMemories(list) {
  return Array.isArray(list) ? list.map(toMemory) : [];
}

function cardInputFrom(args) {
  return {
    sender: String(args.sender ?? "Local User"),
    recipient: String(args.recipient ?? ""),
    relationship: String(args.relationship ?? "Friends"),
    occasion: String(args.occasion ?? "card"),
    tone: String(args.tone ?? "warm"),
    style: String(args.style ?? "botanical"),
    language: ["English", "Spanish", "Urdu", "Arabic"].includes(args.language)
      ? args.language
      : "English",
    personalNote: String(args.personalNote ?? ""),
    useMemory: args.useMemory ?? false
  };
}

function dollars(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

// --- tools --------------------------------------------------------------------

const tools = [
  {
    name: "detect_card_opportunity",
    description:
      "Spot a card-worthy moment in pasted text (an ICS event, an invite, or a short note). Returns the inferred occasion, recipient, date, urgency, confidence, evidence, and a recommended next step. Pass known memories to strengthen the match.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Raw text to analyze: an .ics/VEVENT block, an invite, or a free note."
        },
        memories: {
          type: "array",
          description: "Optional known memories about the recipient.",
          items: {
            type: "object",
            properties: {
              recipient: { type: "string" },
              note: { type: "string" }
            }
          }
        }
      },
      required: ["text"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { free } = await domain();
      const signal = free.parseFreeImport(String(args.text ?? ""));
      const opportunity = free.buildOpportunity(signal, toMemories(args.memories));
      return json({ signal, opportunity });
    }
  },
  {
    name: "draft_card",
    description:
      "Generate a finished, inspectable greeting card: four print panels (front, inside-left, message, back) with headline, body, and art direction, plus a print-fitness validation report. Deterministic and content-safe — no paid services.",
    inputSchema: {
      type: "object",
      properties: {
        recipient: { type: "string", description: "Who the card is for." },
        sender: { type: "string", description: "Who the card is from. Default 'Local User'." },
        relationship: { type: "string", description: "Relationship to the recipient, e.g. 'Aunt'." },
        occasion: { type: "string", description: "Occasion, e.g. 'birthday', '70th birthday', 'sympathy'." },
        tone: {
          type: "string",
          description: "warm | funny | elegant | simple | reverent | sentimental (or a custom phrase)."
        },
        style: {
          type: "string",
          description: "botanical | bold-type | photo-note | minimal (or a custom phrase)."
        },
        language: {
          type: "string",
          enum: ["English", "Spanish", "Urdu", "Arabic"],
          description: "Card language. Urdu/Arabic render right-to-left."
        },
        personalNote: { type: "string", description: "A specific personal detail to weave in." },
        useMemory: { type: "boolean", description: "Whether to cite approved memories for the recipient." },
        memories: {
          type: "array",
          description: "Optional memories to draw from when useMemory is true.",
          items: {
            type: "object",
            properties: {
              recipient: { type: "string" },
              note: { type: "string" },
              approved: { type: "boolean" }
            }
          }
        }
      },
      required: ["recipient", "occasion"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { free } = await domain();
      const input = cardInputFrom(args);
      const draft = free.generateCardDraft(input, toMemories(args.memories));
      const validation = free.validateCardDraft(draft);
      const panels = draft.panels.map((panel) => ({
        id: panel.id,
        label: panel.label,
        headline: panel.headline,
        body: panel.body,
        artDirection: panel.artDirection,
        rtl: panel.rtl,
        overflowRisk: panel.overflowRisk
      }));
      return json(
        {
          draftId: draft.id,
          generatedBy: draft.generatedBy,
          memoryCitations: draft.memoryCitations,
          panels,
          validation
        },
        !validation.passed
      );
    }
  },
  {
    name: "render_card_panels",
    description:
      "Render print-ready 5x7 (1500x2100 @ 300dpi) SVG panels for a card, plus suggested export filenames. Use panelId to render one panel ('front' by default) or 'all' for the full set. Takes the same inputs as draft_card.",
    inputSchema: {
      type: "object",
      properties: {
        recipient: { type: "string" },
        sender: { type: "string" },
        relationship: { type: "string" },
        occasion: { type: "string" },
        tone: { type: "string" },
        style: { type: "string" },
        language: { type: "string", enum: ["English", "Spanish", "Urdu", "Arabic"] },
        personalNote: { type: "string" },
        useMemory: { type: "boolean" },
        memories: { type: "array", items: { type: "object" } },
        panelId: {
          type: "string",
          enum: ["front", "inside-left", "inside-right", "back", "all"],
          description: "Which panel(s) to render. Default 'front'."
        }
      },
      required: ["recipient", "occasion"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { free } = await domain();
      const input = cardInputFrom(args);
      const draft = free.generateCardDraft(input, toMemories(args.memories));
      const wanted = args.panelId ?? "front";
      const selected = wanted === "all" ? draft.panels : draft.panels.filter((panel) => panel.id === wanted);
      if (selected.length === 0) {
        return text(`No panel matches '${wanted}'. Use front, inside-left, inside-right, back, or all.`, true);
      }
      const rendered = selected.map((panel) => ({
        id: panel.id,
        fileName: free.exportFileName(panel, draft.id),
        svg: free.buildPanelSvg(panel)
      }));
      return json({ draftId: draft.id, panels: rendered });
    }
  },
  {
    name: "recommend_fulfillment",
    description:
      "Recommend how to get the card printed: the lowest current estimate, the fastest pickup candidate, and the cheapest shipped option, from review-only public retail-printer pricing. Always honest — these are estimates, never live quotes or placed orders.",
    inputSchema: {
      type: "object",
      properties: {
        vendorId: {
          type: "string",
          description:
            "Preferred printer: walgreens | cvs | fedex | walmart | staples | office-depot | local-print-shop. Default walgreens.",
          default: "walgreens"
        },
        quantity: { type: "number", description: "How many cards. Default 1.", default: 1 }
      },
      additionalProperties: false
    },
    handler: async (args) => {
      const { pricing, fulfillment } = await domain();
      const vendorId = args.vendorId ?? "walgreens";
      const quantity = Math.max(Math.round(Number(args.quantity ?? 1)) || 1, 1);
      const comparison = pricing.buildPrinterPricingComparison(vendorId, quantity);
      const set = fulfillment.buildFulfillmentRecommendations(comparison);
      const recommendations = set.recommendations.map((rec) => ({
        kind: rec.kind,
        label: rec.label,
        vendor: rec.vendorName,
        product: rec.productName,
        subtotal: dollars(rec.subtotalCents),
        eta: rec.etaLabel,
        pickupEligible: rec.pickupEligible,
        priceProof: rec.priceProofLabel,
        requiresManualConfirmation: rec.requiresManualConfirmation
      }));
      return json({
        quantity: set.quantity,
        liveQuote: set.liveQuote,
        directOrderEnabled: set.directOrderEnabled,
        recommendations,
        manualConfirmationVendors: comparison.manualConfirmationVendors,
        disclaimer: set.disclaimer
      });
    }
  },
  {
    name: "build_print_handoff",
    description:
      "Produce the manual upload checklist for handing a finished card to a retail printer. CustomCard never places real orders or stores card details — this is the step-by-step the user follows in the printer's own site.",
    inputSchema: {
      type: "object",
      properties: {
        vendorId: {
          type: "string",
          description:
            "Printer: walgreens | cvs | fedex | walmart | staples | office-depot | local-print-shop. Default walgreens."
        },
        validationPassed: {
          type: "boolean",
          description: "Whether the card passed print validation (from draft_card). Default true.",
          default: true
        }
      },
      additionalProperties: false
    },
    handler: async (args) => {
      const { free } = await domain();
      const vendorId = args.vendorId ?? "walgreens";
      const validation = {
        passed: args.validationPassed ?? true,
        checks: [],
        errors: args.validationPassed === false ? ["Card validation has not passed."] : []
      };
      const handoff = free.buildVendorHandoff(vendorId, validation);
      return json(handoff);
    }
  },
  {
    name: "list_card_options",
    description:
      "List the valid card options for the other tools: tones, visual styles, languages, supported retail printers, and recognized occasions.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => {
      const { free, pricing } = await domain();
      const comparison = pricing.buildPrinterPricingComparison("walgreens", 1);
      return json({
        tones: ["warm", "funny", "elegant", "simple", "reverent", "sentimental"],
        styles: ["botanical", "bold-type", "photo-note", "minimal"],
        languages: ["English", "Spanish", "Urdu", "Arabic"],
        printers: comparison.manualConfirmationVendors,
        occasions: free.occasionStarters
      });
    }
  }
];

const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

function text(value, isError = false) {
  return { content: [{ type: "text", text: value }], isError };
}

function json(value, isError = false) {
  return text(JSON.stringify(value, null, 2), isError);
}

// --- JSON-RPC plumbing --------------------------------------------------------

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleRequest(message) {
  const { id, method, params } = message;

  switch (method) {
    case "initialize": {
      sendResult(id, {
        protocolVersion: params?.protocolVersion ?? DEFAULT_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION }
      });
      return;
    }
    case "ping": {
      sendResult(id, {});
      return;
    }
    case "tools/list": {
      sendResult(id, {
        tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
      });
      return;
    }
    case "tools/call": {
      const tool = toolsByName.get(params?.name);
      if (!tool) {
        sendError(id, -32602, `Unknown tool: ${params?.name}`);
        return;
      }
      try {
        sendResult(id, await tool.handler(params?.arguments ?? {}));
      } catch (error) {
        sendResult(id, text(`Tool '${params?.name}' failed: ${error?.stack ?? error?.message ?? error}`, true));
      }
      return;
    }
    default: {
      if (id !== undefined) sendError(id, -32601, `Method not found: ${method}`);
    }
  }
}

let buffer = "";
let pending = 0;
let stdinClosed = false;

function maybeExit() {
  if (stdinClosed && pending === 0) process.exit(0);
}

function dispatch(message) {
  pending += 1;
  handleRequest(message)
    .catch((error) => sendError(message.id, -32603, `Internal error: ${error?.message ?? error}`))
    .finally(() => {
      pending -= 1;
      maybeExit();
    });
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let newlineIndex;
  while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, newlineIndex).trim();
    buffer = buffer.slice(newlineIndex + 1);
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      continue;
    }
    if (message.id === undefined) continue; // notification, no response needed
    dispatch(message);
  }
});

// Drain in-flight requests before exiting so async tool calls aren't dropped.
process.stdin.on("end", () => {
  stdinClosed = true;
  maybeExit();
});
