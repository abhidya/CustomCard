export type Chapter =
  | "origin"
  | "event-detection"
  | "relationship-crm"
  | "card-engine"
  | "fulfillment"
  | "production-platform"
  | "compliance"
  | "agentic-build";

export type Criticality = "must-have" | "hard-risk" | "later";
export type GateStatus = "pass" | "warning" | "blocked";
export type RunMode = "prototype" | "five-dollar-droplet" | "saas-scale";

export interface Storyboard {
  id: string;
  chapter: Chapter;
  title: string;
  sourceSignal: string;
  userPath: string;
  systemResponse: string;
  edgeCases: string[];
  acceptance: string[];
  criticality: Criticality;
}

export interface BlueprintSection {
  id: string;
  label: string;
  mandate: string;
  notSlopStandard: string;
  evidence: string[];
}

export interface AgentContract {
  id: string;
  name: string;
  lane: "ingestion" | "reasoning" | "generation" | "verification" | "fulfillment";
  deterministic: boolean;
  input: string[];
  output: string[];
  hardStops: string[];
}

export interface PrintAdapterContract {
  id: string;
  name: string;
  vendor: string;
  product: string;
  targetPixels: {
    width: number;
    height: number;
    dpi: number;
  };
  panels: string[];
  invariants: string[];
  liveQuoteInputs: string[];
  certificationGates: string[];
  requiredCertificationGateIds: string[];
  realOrdersEnabled: false;
  explicitApprovalRequired: true;
  liveQuoteRequired: true;
  realOrderPolicy: string;
}

export interface ArchitectureProfile {
  id: RunMode;
  title: string;
  costShape: string;
  stack: string[];
  scalingMove: string;
  tradeoffs: string[];
}

export interface RegionRequirement {
  region: string;
  dataPosture: string;
  requirements: string[];
  productControls: string[];
}

export interface BuildMilestone {
  id: string;
  title: string;
  owner: string;
  deliverables: string[];
  testEvidence: string[];
  exitGate: string;
}

export interface QualityGate {
  id: string;
  label: string;
  status: GateStatus;
  detail: string;
}

export interface ExtractedFact {
  id: string;
  label: string;
  value: string;
  confidence: number;
  evidence: string;
}

export interface PrintAsset {
  panel: string;
  width: 1500;
  height: 2100;
  dpi: 300;
  localProofSafeZonePassed: boolean;
  textOverflow: boolean;
  localProofChecksum: string;
  svg: string;
}

export interface OperationalRun {
  id: string;
  facts: ExtractedFact[];
  matchedStoryboardIds: string[];
  memoryProposal: {
    contact: string;
    text: string;
    requiresApproval: true;
  };
  printPacket: {
    adapterId: string;
    kind: "local_proof_manifest" | "blocked";
    assets: PrintAsset[];
    valid: boolean;
    reason: string;
    missingFactIds: string[];
  };
  handoff: {
    mode: "local_proof_packet" | "blocked";
    canPlaceRealOrder: false;
    nextGate: string;
    reason: string;
  };
}

export const oneLiner =
  "Build a relationship-aware card concierge that detects when a card is needed, knows what should be said, renders print-perfect 5x7 assets, and routes fulfillment without risking a bad physical print.";

export const sourceThesis =
  "The defensible product is not AI greeting cards. It is the relationship memory, event timing, print validation, and vendor-neutral fulfillment layer.";

export const storyboards: Storyboard[] = [
  {
    id: "origin-cvs-wedding",
    chapter: "origin",
    title: "Last-minute CVS wedding card",
    sourceSignal: "Mom needed a wedding card; four AI panels were generated and printed on 5x7 stock.",
    userPath: "User needs a physical card today and wants it to feel personal, not generic.",
    systemResponse:
      "Open a guided last-minute flow that prioritizes known relationship context, safe wording, 300 DPI export, and nearby pickup.",
    edgeCases: [
      "The user is already at a store and needs files immediately.",
      "The card must be brought in person, so mail delivery is too slow.",
      "The print surface supports only specific aspect ratios or templates."
    ],
    acceptance: [
      "Four panel outputs are generated for front, inside-left, inside-right, and back.",
      "Export blocks if dimensions are not 1500x2100 at 300 DPI.",
      "Vendor-specific instructions are separate from the generic renderer."
    ],
    criticality: "must-have"
  },
  {
    id: "connect-import-events",
    chapter: "event-detection",
    title: "Connect email and calendar",
    sourceSignal: "User signs up, connects email, imports events, and the AI offers card opportunities.",
    userPath: "User grants scoped access to Gmail/Google Calendar first, with future Outlook/iCloud support.",
    systemResponse:
      "Sync only the minimum event and invitation metadata needed, redact raw content, and show why each opportunity was inferred.",
    edgeCases: [
      "OAuth token expires or scope is revoked.",
      "An invite is forwarded and recipient identity is ambiguous.",
      "A calendar hold is not a real social event."
    ],
    acceptance: [
      "Every detected opportunity has evidence, confidence, and a dismiss path.",
      "Raw invite content is treated as untrusted input.",
      "User can disconnect providers and delete imported data."
    ],
    criticality: "must-have"
  },
  {
    id: "opportunity-choice",
    chapter: "event-detection",
    title: "AI suggests but user decides",
    sourceSignal: "The AI gives the option to generate cards; the user can accept or reject.",
    userPath: "User sees ranked opportunities and can generate, snooze, dismiss, or mark as irrelevant.",
    systemResponse:
      "Use deterministic notification rules for lead time and urgency, with model-assisted event classification only.",
    edgeCases: [
      "The user dismisses an event and should not be nagged again.",
      "A high-confidence event is socially sensitive and should be quieter.",
      "Lead time is too short for shipping but enough for local pickup."
    ],
    acceptance: [
      "No card is generated or ordered without explicit user intent.",
      "Dismissed opportunities remain auditable.",
      "Urgency recommends pickup when shipping windows are unsafe."
    ],
    criticality: "must-have"
  },
  {
    id: "ten-years-memory",
    chapter: "relationship-crm",
    title: "Ten-year anniversary memory",
    sourceSignal: "If the user has sent ten cards, propose a direction for the eleventh.",
    userPath: "User revisits a recurring relationship and wants continuity without sounding repetitive.",
    systemResponse:
      "Surface prior approved themes, propose a new angle, and ask what changed this year.",
    edgeCases: [
      "Past card language contains sensitive family details.",
      "The relationship changed and old memory should not be used.",
      "The user wants to forget a memory."
    ],
    acceptance: [
      "Memories are proposed and inspectable before reuse.",
      "Generation cites which memory IDs influenced output.",
      "Sensitive memories require explicit approval."
    ],
    criticality: "must-have"
  },
  {
    id: "adaptive-interview",
    chapter: "relationship-crm",
    title: "Adaptive card interview",
    sourceSignal: "Ask questions about the person, message, style, religion, and personal context.",
    userPath: "User wants a fast interview that improves the card instead of a long form.",
    systemResponse:
      "Ask only missing high-value questions and carry answers into copy, art direction, and validation.",
    edgeCases: [
      "User provides contradictory tone and relationship inputs.",
      "User asks for religious text the system cannot verify.",
      "User wants multiple languages in one card."
    ],
    acceptance: [
      "Required questions are sender, relationship, tone, personal detail, and constraints.",
      "High-care religious or multilingual content is flagged for review.",
      "The interview can resume without losing context."
    ],
    criticality: "must-have"
  },
  {
    id: "deterministic-renderer",
    chapter: "card-engine",
    title: "Deterministic 5x7 renderer",
    sourceSignal: "Generate print-ready front, inside-left, inside-right, and back files.",
    userPath: "User needs assets that will not crop badly or print blurry.",
    systemResponse:
      "Render vendor-neutral 1500x2100 PNG/PDF panels with bleed, safe-area, typography, and text overflow checks.",
    edgeCases: [
      "Generated image includes fake fold marks or mockup shadows.",
      "Text overflows when translated.",
      "Retail uploader crops differently from preview."
    ],
    acceptance: [
      "Renderer tests assert exact pixel dimensions.",
      "Safe-area checks block fulfillment.",
      "No mockup artifacts are allowed in print files."
    ],
    criticality: "hard-risk"
  },
  {
    id: "walgreens-adapter",
    chapter: "fulfillment",
    title: "Walgreens 5x7 double-sided adapter",
    sourceSignal:
      "Keep vendor-neutral card engine, but isolate behavior in a physically certified WalgreensFiveBySevenDoubleSidedCardAdapter.",
    userPath: "User wants same-day pickup with the lowest risk of bad retail printing.",
    systemResponse:
      "Quote live, map assets to vendor upload requirements, and keep real ordering disabled until certification passes.",
    edgeCases: [
      "The closest Walgreens does not offer the required product.",
      "Quote changes after checkout begins.",
      "The order is sent to the wrong store."
    ],
    acceptance: [
      "Adapter has no authority to place real orders before physical certification.",
      "Live quote and availability are cached with expiry.",
      "Wrong-store recovery offers cancel, reorder, or pickup alternatives."
    ],
    criticality: "hard-risk"
  },
  {
    id: "order-lifecycle",
    chapter: "fulfillment",
    title: "Order lifecycle and recovery",
    sourceSignal: "Think through wrong place, order failure, event changes, one-hour pickup, and every path.",
    userPath: "User approves a card and needs to recover if anything changes.",
    systemResponse:
      "Represent order states explicitly from draft to fulfilled, with cancellation, re-render, re-quote, and support paths.",
    edgeCases: [
      "Event date changes after order placed.",
      "Vendor rejects an image.",
      "Pickup window misses the event."
    ],
    acceptance: [
      "Every order state has an owner and recovery action.",
      "Payment or external order placement is never silent.",
      "Urgent recovery recommends local export when automation is unsafe."
    ],
    criticality: "hard-risk"
  },
  {
    id: "cross-platform",
    chapter: "production-platform",
    title: "Cross-platform product surface",
    sourceSignal: "Think about proper design for web, mobile, and future platforms.",
    userPath: "User starts on web, finishes on phone, and may need store pickup while traveling.",
    systemResponse:
      "Design API-first flows, responsive web first, and later native shell support through shared contracts.",
    edgeCases: [
      "User approves on mobile but uploads on desktop.",
      "Push permissions are disabled.",
      "Timezone changes while traveling."
    ],
    acceptance: [
      "Core workflows are not tied to a single UI framework.",
      "Notification logic is platform-independent.",
      "State resumes across devices."
    ],
    criticality: "must-have"
  },
  {
    id: "five-dollar-to-saas",
    chapter: "production-platform",
    title: "Deploy from $5 droplet to SaaS scale",
    sourceSignal: "Build for a cheap DigitalOcean droplet or scale up to an AI SaaS business.",
    userPath: "Founder can run a lean beta and later scale without rewriting the product.",
    systemResponse:
      "Use modular services that begin in one process with SQLite/Postgres and graduate to queues, object storage, and workers.",
    edgeCases: [
      "Image generation jobs exceed a single server timeout.",
      "SQLite is not enough for concurrent beta usage.",
      "Workers crash during long-running render tasks."
    ],
    acceptance: [
      "The same domain contracts work in monolith and distributed modes.",
      "Long tasks are idempotent and resumable.",
      "Cost-heavy AI calls are queued, metered, and cached."
    ],
    criticality: "must-have"
  },
  {
    id: "regional-compliance",
    chapter: "compliance",
    title: "Regional privacy and safety posture",
    sourceSignal: "Think about proper requirements in different regions.",
    userPath: "User trusts the system with email, calendar, relationships, addresses, and card content.",
    systemResponse:
      "Separate data residency, consent, retention, deletion, access logs, and vendor-sharing policy by region.",
    edgeCases: [
      "User requests deletion after cards were shared with a vendor.",
      "A region requires stricter consent or AI disclosure.",
      "A family card contains minors' names or addresses."
    ],
    acceptance: [
      "OAuth scopes are minimized and documented.",
      "Vendor sharing has a just-in-time approval gate.",
      "Deletion exports evidence and describes external boundaries."
    ],
    criticality: "hard-risk"
  },
  {
    id: "agentic-implementation",
    chapter: "agentic-build",
    title: "Agentic implementation roadmap",
    sourceSignal: "End with a clear build plan for an AI coding agent to implement the MVP.",
    userPath: "The founder leaves the agent working all night and expects durable, testable progress.",
    systemResponse:
      "Break the product into implementation goals, tests, quality gates, and review loops instead of a vague prototype.",
    edgeCases: [
      "An agent implements the flashy generator before event or print contracts.",
      "A review fails because physical printing assumptions are untested.",
      "A later agent mutates core contracts without migration."
    ],
    acceptance: [
      "Every milestone has deliverables, tests, and exit criteria.",
      "Final gates include slop cleanup and independent review.",
      "Unsafe real-world side effects remain mocked until certified."
    ],
    criticality: "must-have"
  }
];

export const blueprintSections: BlueprintSection[] = [
  {
    id: "brief",
    label: "Brief Extraction",
    mandate: "Turn the pasted stream-of-consciousness into indexed, buildable storyboards.",
    notSlopStandard: "Every claim in the UI maps to a source signal or an explicit default.",
    evidence: ["12 storyboards", "8 chapters", "edge cases included"]
  },
  {
    id: "architecture",
    label: "System Design",
    mandate: "Show the production architecture from single-node beta to distributed SaaS.",
    notSlopStandard: "The app must name storage, queues, workers, model boundaries, and failure modes.",
    evidence: ["3 run modes", "shared contracts", "idempotent long jobs"]
  },
  {
    id: "adapter",
    label: "Print Adapter",
    mandate: "Keep rendering vendor-neutral while isolating Walgreens-specific behavior.",
    notSlopStandard: "No real orders before renderer tests, live quote checks, and physical certification.",
    evidence: ["1500x2100", "300 DPI", "certification gates"]
  },
  {
    id: "compliance",
    label: "Trust Layer",
    mandate: "Design for OAuth, PII, regional obligations, vendor sharing, and deletion.",
    notSlopStandard: "Privacy is a product workflow, not a footer.",
    evidence: ["US", "EU/UK", "Canada", "MENA"]
  }
];

export const agents: AgentContract[] = [
  {
    id: "source_extraction",
    name: "Source Extraction Agent",
    lane: "ingestion",
    deterministic: false,
    input: ["raw pasted text", "source kind", "trust boundary"],
    output: ["extracted facts", "storyboard matches", "evidence refs"],
    hardStops: ["prompt injection marker", "empty source", "untrusted instruction detected"]
  },
  {
    id: "event_understanding",
    name: "Event Understanding Agent",
    lane: "reasoning",
    deterministic: true,
    input: ["event candidates", "lead time", "relationship hints"],
    output: ["ranked opportunities", "notify/snooze decision", "reason codes"],
    hardStops: ["low confidence", "sensitive event uncertainty", "duplicate opportunity"]
  },
  {
    id: "relationship_memory",
    name: "Relationship Memory Curator",
    lane: "reasoning",
    deterministic: false,
    input: ["approved cards", "user notes", "relationship graph"],
    output: ["usable memory IDs", "proposed memory updates", "privacy warnings"],
    hardStops: ["unapproved sensitive memory", "contradictory relationship state"]
  },
  {
    id: "adaptive_interview",
    name: "Adaptive Interview Agent",
    lane: "reasoning",
    deterministic: false,
    input: ["opportunity", "missing facts", "style constraints"],
    output: ["next best questions", "answered facts", "review flags"],
    hardStops: ["religious quote requested", "language verification required"]
  },
  {
    id: "card_copy",
    name: "Card Copy Agent",
    lane: "generation",
    deterministic: false,
    input: ["answers", "approved memories", "tone", "locale"],
    output: ["panel copy", "claim provenance", "language warnings"],
    hardStops: ["uncited factual claim", "unverified blessing or scripture"]
  },
  {
    id: "print_renderer",
    name: "Deterministic Print Renderer",
    lane: "generation",
    deterministic: true,
    input: ["copy", "layout template", "image assets"],
    output: ["print PNGs", "preview PNGs", "layout metrics"],
    hardStops: ["wrong pixels", "unsafe crop", "text overflow", "mockup artifact"]
  },
  {
    id: "quality_gate",
    name: "Print and Safety Validator",
    lane: "verification",
    deterministic: true,
    input: ["assets", "copy claims", "adapter rules"],
    output: ["blocking checks", "warnings", "approval packet"],
    hardStops: ["dimension failure", "missing sender", "vendor adapter mismatch"]
  },
  {
    id: "fulfillment_adapter",
    name: "Fulfillment Adapter Agent",
    lane: "fulfillment",
    deterministic: true,
    input: ["approved assets", "store location", "vendor adapter"],
    output: ["quotes", "handoff packet", "order state"],
    hardStops: ["uncertified adapter", "quote expired", "user approval missing"]
  }
];

export const walgreensAdapter: PrintAdapterContract = {
  id: "walgreens-5x7-double-sided",
  name: "WalgreensFiveBySevenDoubleSidedCardAdapter",
  vendor: "Walgreens",
  product: "5x7 double-sided card on photo/card stock",
  targetPixels: {
    width: 1500,
    height: 2100,
    dpi: 300
  },
  panels: ["front", "inside-left", "inside-right", "back"],
  invariants: [
    "Renderer stays vendor-neutral; adapter only maps certified assets to vendor behavior.",
    "No real order can be placed from this adapter until physical certification passes.",
    "Quote and product availability must be live or explicitly marked stale.",
    "Store selection, pickup window, tax, price, and cancellation policy must be visible before approval."
  ],
  liveQuoteInputs: ["zip code", "store id", "product sku", "quantity", "pickup urgency", "asset packet hash"],
  certificationGates: [
    "unit tests for 1500x2100 output",
    "visual safe-area regression suite",
    "vendor upload dry run",
    "physical print from at least two stores",
    "wrong-store recovery script",
    "human approval copy review"
  ],
  requiredCertificationGateIds: [
    "exact-pixels",
    "safe-area-regression",
    "vendor-upload-dry-run",
    "physical-two-store-print",
    "wrong-store-recovery",
    "human-approval-review"
  ],
  realOrdersEnabled: false,
  explicitApprovalRequired: true,
  liveQuoteRequired: true,
  realOrderPolicy:
    "Disabled by default. Real external ordering requires explicit user approval, live quote confirmation, and adapter certification evidence."
};

const requiredWalgreensGateIds = [
  "exact-pixels",
  "safe-area-regression",
  "vendor-upload-dry-run",
  "physical-two-store-print",
  "wrong-store-recovery",
  "human-approval-review"
];

const requiredLocalProofFactIds = ["people", "print-spec"];

export const architectureProfiles: ArchitectureProfile[] = [
  {
    id: "prototype",
    title: "Local prototype",
    costShape: "Developer laptop or free-tier preview",
    stack: ["Vite/React", "SQLite fixtures", "local renderer", "mock vendor catalog"],
    scalingMove: "Proves workflows and renderer contracts before OAuth or real vendors.",
    tradeoffs: ["No real OAuth", "No real payments", "Fast iteration"]
  },
  {
    id: "five-dollar-droplet",
    title: "$5 DigitalOcean beta",
    costShape: "Single small VM, one process, one queue worker",
    stack: ["Docker Compose", "Postgres or SQLite", "filesystem object store", "cron plus worker"],
    scalingMove: "Move images to object storage and long jobs to a managed queue first.",
    tradeoffs: ["Low cost", "Limited concurrency", "Backups and monitoring must be explicit"]
  },
  {
    id: "saas-scale",
    title: "SaaS scale",
    costShape: "Horizontally scaled web, workers, model budget controls, object storage",
    stack: ["API service", "Postgres", "Redis/queue", "S3-compatible storage", "worker fleet"],
    scalingMove: "Shard expensive model/render jobs and isolate vendor adapters by queue.",
    tradeoffs: ["Higher ops cost", "Strong isolation", "Better reliability and compliance posture"]
  }
];

export const regionRequirements: RegionRequirement[] = [
  {
    region: "United States",
    dataPosture: "State privacy law awareness plus consumer data deletion controls.",
    requirements: ["OAuth scope minimization", "PII deletion", "vendor-sharing disclosure"],
    productControls: ["just-in-time vendor approval", "address redaction", "audit trail"]
  },
  {
    region: "EU/UK",
    dataPosture: "GDPR/UK GDPR style consent, deletion, export, and processor boundaries.",
    requirements: ["lawful basis", "data export", "right to erasure", "processor contracts"],
    productControls: ["region-aware retention", "data residency option", "model data controls"]
  },
  {
    region: "Canada",
    dataPosture: "Consent-forward handling for personal information and relationship context.",
    requirements: ["consent clarity", "access requests", "retention policy"],
    productControls: ["privacy center", "memory review queue", "provider disconnect"]
  },
  {
    region: "MENA and multilingual markets",
    dataPosture: "Respectful handling for religious text, transliteration, and local delivery boundaries.",
    requirements: ["language QA", "religious phrase verification", "address localization"],
    productControls: ["human review flags", "locale-specific typography", "RTL render tests"]
  }
];

export const buildMilestones: BuildMilestone[] = [
  {
    id: "G001",
    title: "Blueprint workbench",
    owner: "frontend/system design",
    deliverables: ["storyboards", "architecture profiles", "adapter contract", "agent map"],
    testEvidence: ["domain coverage tests", "responsive UI smoke test"],
    exitGate: "The app explains what to build and why without relying on chat history."
  },
  {
    id: "G002",
    title: "Renderer contract",
    owner: "card engine",
    deliverables: ["5x7 renderer", "panel packet schema", "safe-area validator"],
    testEvidence: ["exact pixel tests", "overflow fixtures", "mockup artifact detection"],
    exitGate: "Export cannot proceed unless all print invariants pass."
  },
  {
    id: "G003",
    title: "Opportunity and memory model",
    owner: "backend/product",
    deliverables: ["event model", "memory model", "interview model", "approval audit"],
    testEvidence: ["event lifecycle tests", "memory consent tests", "prompt injection fixtures"],
    exitGate: "The system can explain each detected event and each memory used."
  },
  {
    id: "G004",
    title: "Certified vendor adapter",
    owner: "fulfillment",
    deliverables: ["Walgreens adapter", "quote cache", "handoff packet", "recovery paths"],
    testEvidence: ["adapter unit tests", "dry run upload", "physical print evidence"],
    exitGate: "Real orders remain disabled until physical certification is recorded."
  }
];

export const qualityGates: QualityGate[] = [
  {
    id: "brief",
    label: "Pasted-text requirements represented",
    status: "pass",
    detail: "Storyboards cover origin, CRM, renderer, fulfillment, platform, compliance, and agentic build."
  },
  {
    id: "ordering",
    label: "No unsafe real-world ordering",
    status: "pass",
    detail: "Real ordering is disabled until explicit approval and physical certification."
  },
  {
    id: "live-research",
    label: "External vendor claims need live verification",
    status: "warning",
    detail: "The app avoids pretending current vendor APIs are verified in this local prototype."
  },
  {
    id: "physical-print",
    label: "Physical certification not yet performed",
    status: "blocked",
    detail: "Walgreens adapter can be designed here, but physical print validation is future evidence."
  }
];

export function getStoryboardsByChapter(chapter: Chapter): Storyboard[] {
  return storyboards.filter((storyboard) => storyboard.chapter === chapter);
}

export function countHardRisks(): number {
  return storyboards.filter((storyboard) => storyboard.criticality === "hard-risk").length;
}

export function computeBlueprintCoverage(): number {
  const requiredChapters: Chapter[] = [
    "origin",
    "event-detection",
    "relationship-crm",
    "card-engine",
    "fulfillment",
    "production-platform",
    "compliance",
    "agentic-build"
  ];
  const covered = requiredChapters.filter((chapter) => getStoryboardsByChapter(chapter).length > 0);
  return Math.round((covered.length / requiredChapters.length) * 100);
}

export function adapterBlocksRealOrders(adapter: PrintAdapterContract): boolean {
  return (
    adapter.realOrdersEnabled === false &&
    adapter.explicitApprovalRequired === true &&
    adapter.liveQuoteRequired === true &&
    requiredWalgreensGateIds.every((gateId) => adapter.requiredCertificationGateIds.includes(gateId)) &&
    /^Disabled by default\./.test(adapter.realOrderPolicy) &&
    /explicit user approval/i.test(adapter.realOrderPolicy) &&
    /adapter certification evidence/i.test(adapter.realOrderPolicy)
  );
}

export function getBlockingGates(): QualityGate[] {
  return qualityGates.filter((gate) => gate.status === "blocked");
}

export function getRunMode(mode: RunMode): ArchitectureProfile {
  const profile = architectureProfiles.find((candidate) => candidate.id === mode);
  if (!profile) {
    throw new Error(`Unknown run mode: ${mode}`);
  }
  return profile;
}

export function runOperationalExtraction(sourceText: string): OperationalRun {
  const facts = extractFacts(sourceText);
  const matchedStoryboardIds = matchStoryboards(sourceText);
  const missingFactIds = requiredLocalProofFactIds.filter((factId) => !findFirstFact(facts, factId));
  const contact = findFirstFact(facts, "people") ?? "Unresolved recipient";
  const canCreateLocalProofPacket = missingFactIds.length === 0 && facts.some((fact) => fact.id !== "manual-context");
  const printPacket = canCreateLocalProofPacket
    ? renderLocalProofPrintPacket(contact)
    : createBlockedPrintPacket(missingFactIds);

  return {
    id: `run-${stableHash(sourceText)}`,
    facts,
    matchedStoryboardIds,
    memoryProposal: {
      contact,
      text: canCreateLocalProofPacket
        ? `Remember only after approval: ${contact} may need a high-context, relationship-aware card flow.`
        : "Memory proposal blocked until the source identifies a recipient and print contract.",
      requiresApproval: true
    },
    printPacket,
    handoff: {
      mode: canCreateLocalProofPacket ? "local_proof_packet" : "blocked",
      canPlaceRealOrder: false,
      nextGate: canCreateLocalProofPacket ? "layout-safe-zone-validation" : "source-extraction-required",
      reason: canCreateLocalProofPacket
        ? "Local proof manifest only; no vendor upload, quote, or real ordering has occurred."
        : `Cannot create a local proof packet until required facts exist: ${missingFactIds.join(", ") || "source signal"}.`
    }
  };
}

function extractFacts(sourceText: string): ExtractedFact[] {
  const normalized = sourceText.toLowerCase();
  const facts: ExtractedFact[] = [];

  if (/wedding|birthday|anniversary|funeral|graduation|shower/.test(normalized)) {
    facts.push({
      id: "event-type",
      label: "Event signal",
      value: firstMatch(sourceText, /(wedding|birthday|anniversary|funeral|graduation|shower)/i),
      confidence: 0.86,
      evidence: excerpt(sourceText, /(wedding|birthday|anniversary|funeral|graduation|shower)/i)
    });
  }

  if (/sara|ahmed|mom|mother|family|recipient|person|couple/i.test(sourceText)) {
    facts.push({
      id: "people",
      label: "People or relationship",
      value: firstMatch(sourceText, /(Sara and Ahmed|Sara|Ahmed|mom|mother|family|recipient|couple)/i),
      confidence: 0.78,
      evidence: excerpt(sourceText, /(Sara and Ahmed|Sara|Ahmed|mom|mother|family|recipient|couple)/i)
    });
  }

  if (/walgreens|cvs|fedex|pickup|print|vendor/i.test(sourceText)) {
    facts.push({
      id: "vendor",
      label: "Fulfillment requirement",
      value: firstMatch(sourceText, /(Walgreens|CVS|FedEx|pickup|print|vendor)/i),
      confidence: 0.9,
      evidence: excerpt(sourceText, /(Walgreens|CVS|FedEx|pickup|print|vendor)/i)
    });
  }

  if (/1500|2100|5x7|300 dpi|dpi|double-sided|double sided/i.test(sourceText)) {
    facts.push({
      id: "print-spec",
      label: "Print contract",
      value: "5x7, 1500x2100, 300 DPI",
      confidence: 0.95,
      evidence: excerpt(sourceText, /(1500|2100|5x7|300 dpi|dpi|double-sided|double sided)/i)
    });
  }

  if (/privacy|region|country|regulatory|oauth|email|calendar/i.test(sourceText)) {
    facts.push({
      id: "trust",
      label: "Trust and compliance",
      value: "OAuth, regional privacy, retention",
      confidence: 0.82,
      evidence: excerpt(sourceText, /(privacy|region|country|regulatory|oauth|email|calendar)/i)
    });
  }

  return facts.length > 0
    ? facts
    : [
        {
          id: "manual-context",
          label: "Manual context",
          value: "No strong product signal detected",
          confidence: 0.35,
          evidence: sourceText.slice(0, 140)
        }
      ];
}

function matchStoryboards(sourceText: string): string[] {
  const normalized = sourceText.toLowerCase();
  return storyboards
    .filter((storyboard) => {
      if (storyboard.id.includes("walgreens") && normalized.includes("walgreens")) return true;
      if (storyboard.chapter === "card-engine" && /5x7|1500|2100|dpi|print/.test(normalized)) return true;
      if (storyboard.chapter === "event-detection" && /email|calendar|event|invite/.test(normalized)) return true;
      if (storyboard.chapter === "relationship-crm" && /relationship|memory|anniversary|prior/.test(normalized)) return true;
      if (storyboard.chapter === "production-platform" && /digitalocean|saas|deploy|scale/.test(normalized)) return true;
      if (storyboard.chapter === "compliance" && /region|country|privacy|regulatory/.test(normalized)) return true;
      return (
        storyboard.chapter === "origin" &&
        /mom|cvs|last-minute|last minute|wedding tomorrow|tomorrow.*wedding/.test(normalized)
      );
    })
    .map((storyboard) => storyboard.id);
}

function createBlockedPrintPacket(missingFactIds: string[]): OperationalRun["printPacket"] {
  return {
    adapterId: walgreensAdapter.id,
    kind: "blocked",
    assets: [],
    valid: false,
    reason: `Local proof packet blocked until required facts exist: ${missingFactIds.join(", ") || "source signal"}.`,
    missingFactIds
  };
}

function renderLocalProofPrintPacket(contact: string): OperationalRun["printPacket"] {
  const assets = walgreensAdapter.panels.map((panel): PrintAsset => {
    const text = panel === "front" ? `For ${contact}` : `CustomCard ${panel}`;
    const svg = renderPanelSvg(text);
    return {
      panel,
      width: 1500,
      height: 2100,
      dpi: 300,
      localProofSafeZonePassed: text.length < 80,
      textOverflow: text.length >= 80,
      localProofChecksum: stableHash(`${panel}:${svg}`),
      svg
    };
  });

  return {
    adapterId: walgreensAdapter.id,
    kind: "local_proof_manifest",
    assets,
    valid: assets.every(
      (asset) =>
        asset.width === 1500 &&
        asset.height === 2100 &&
        asset.dpi === 300 &&
        asset.localProofSafeZonePassed &&
        !asset.textOverflow
    ),
    reason: "Local proof manifest proves panel count and exact dimensions only; real layout QA and vendor dry run are future gates.",
    missingFactIds: []
  };
}

function renderPanelSvg(text: string): string {
  const escaped = text.replace(/[<>&"]/g, (character) => {
    const replacements: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "\"": "&quot;"
    };
    return replacements[character];
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100"><rect width="1500" height="2100" fill="#101923"/><rect x="120" y="120" width="1260" height="1860" fill="none" stroke="#7edec7" stroke-width="10"/><text x="750" y="1030" text-anchor="middle" fill="#f4f7f9" font-size="96" font-family="Georgia">${escaped}</text></svg>`;
}

function findFirstFact(facts: ExtractedFact[], id: string): string | undefined {
  return facts.find((fact) => fact.id === id)?.value;
}

function firstMatch(sourceText: string, pattern: RegExp): string {
  return sourceText.match(pattern)?.[0] ?? "Unknown";
}

function excerpt(sourceText: string, pattern: RegExp): string {
  const match = sourceText.match(pattern);
  if (!match || match.index === undefined) return sourceText.slice(0, 140);
  const start = Math.max(0, match.index - 48);
  const end = Math.min(sourceText.length, match.index + match[0].length + 72);
  return sourceText.slice(start, end);
}

function stableHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
