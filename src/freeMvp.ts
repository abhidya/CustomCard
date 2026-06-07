export type FreeImportSource = "ics-paste" | "invite-paste" | "manual-note" | "empty";
export type OpportunityStatus = "ready" | "needs-more-detail";
export type Urgency = "same-day" | "this-week" | "planned" | "needs-date";
export type Tone = "warm" | "playful" | "elegant" | "reverent";
export type VisualStyle = "botanical" | "bold-type" | "photo-note" | "minimal";
export type LanguageChoice = "English" | "Spanish" | "Urdu" | "Arabic";
export type VendorId = "walgreens" | "cvs" | "fedex" | "walmart" | "staples" | "office-depot" | "local-print-shop";

export interface LocalWorkspace {
  id: string;
  name: string;
  email: string;
  createdAtIso: string;
  memories: MemoryItem[];
}

export interface MemoryItem {
  id: string;
  recipient: string;
  note: string;
  tags: string[];
  approved: boolean;
  sensitivity: "normal" | "review";
  updatedAtIso: string;
}

export interface FreeImportSignal {
  id: string;
  source: FreeImportSource;
  title: string;
  occasion: string;
  recipients: string;
  dateLabel: string;
  isoDate?: string;
  location?: string;
  evidence: string[];
  confidence: number;
  warnings: string[];
}

export interface CardOpportunity {
  id: string;
  title: string;
  recipient: string;
  occasion: string;
  dateLabel: string;
  urgency: Urgency;
  status: OpportunityStatus;
  confidence: number;
  evidence: string[];
  recommendedPath: string;
  memoryIds: string[];
}

export interface CardDraftInput {
  sender: string;
  recipient: string;
  relationship: string;
  occasion: string;
  tone: Tone;
  style: VisualStyle;
  language: LanguageChoice;
  personalNote: string;
  useMemory: boolean;
}

export interface CardPanel {
  id: "front" | "inside-left" | "inside-right" | "back";
  label: string;
  headline: string;
  body: string;
  artDirection: string;
  width: 1500;
  height: 2100;
  dpi: 300;
  rtl: boolean;
  overflowRisk: boolean;
}

export interface CardDraft {
  id: string;
  input: CardDraftInput;
  panels: CardPanel[];
  memoryCitations: string[];
  generatedBy: "deterministic-free-template";
}

export interface ValidationCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface CardValidation {
  passed: boolean;
  checks: ValidationCheck[];
  errors: string[];
}

export interface VendorHandoff {
  vendorId: VendorId;
  vendorName: string;
  mode: "manual-upload";
  costControl: "free-app-no-paid-api";
  realOrdersEnabled: false;
  canPlaceRealOrder: false;
  checklist: string[];
  disabledReasons: string[];
}

export const sampleInviteText = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Sara and Ahmed anniversary dinner
DTSTART;VALUE=DATE:20260712
LOCATION:Brooklyn, NY
DESCRIPTION:Ten year anniversary. Sara loves botanical cards, Ahmed likes quiet humor, pickup is fine.
END:VEVENT
END:VCALENDAR`;

export const freeAdapterLabels = [
  "Local workspace",
  "ICS or invite paste",
  "Manual memory review",
  "Deterministic copy templates",
  "Browser SVG export",
  "Local print package",
  "Manual vendor handoff"
];

export const defaultMemories: MemoryItem[] = [
  {
    id: "mem-sara-ahmed-10-year-thread",
    recipient: "Sara and Ahmed",
    note: "They liked the line about building a home out of small ordinary days.",
    tags: ["anniversary", "botanical", "quiet humor"],
    approved: true,
    sensitivity: "normal",
    updatedAtIso: "2026-05-20T12:00:00.000Z"
  },
  {
    id: "mem-family-reverent-tone",
    recipient: "Family",
    note: "Religious references should stay general unless the user supplies exact wording.",
    tags: ["review", "high-care"],
    approved: true,
    sensitivity: "review",
    updatedAtIso: "2026-05-18T12:00:00.000Z"
  }
];

const dayInMs = 24 * 60 * 60 * 1000;

export function createLocalWorkspace(name: string, email: string, now = new Date()): LocalWorkspace {
  const normalizedName = cleanText(name) || "Local User";
  const normalizedEmail = cleanText(email).toLowerCase() || "local@customcard.local";

  return {
    id: `workspace-${stableId(`${normalizedName}:${normalizedEmail}`)}`,
    name: normalizedName,
    email: normalizedEmail,
    createdAtIso: now.toISOString(),
    memories: []
  };
}

export function parseFreeImport(rawText: string): FreeImportSignal {
  const text = unfoldIcs(rawText).trim();

  if (!text) {
    return {
      id: "signal-empty",
      source: "empty",
      title: "No import yet",
      occasion: "card",
      recipients: "Someone important",
      dateLabel: "Date needed",
      evidence: [],
      confidence: 0,
      warnings: ["Paste an invite, ICS event, or short note to create an opportunity."]
    };
  }

  const title =
    readIcsField(text, "SUMMARY") ??
    firstSentence(text) ??
    "Manual card note";
  const description = readIcsField(text, "DESCRIPTION") ?? text;
  const dateValue = readIcsField(text, "DTSTART") ?? findNaturalDate(text);
  const isoDate = parseDateValue(dateValue);
  const occasion = inferOccasion(`${title} ${description}`);
  const recipients = inferRecipients(`${title} ${description}`);
  const location = readIcsField(text, "LOCATION") ?? inferLocation(text);
  const source: FreeImportSource = text.includes("BEGIN:VEVENT")
    ? "ics-paste"
    : text.toLowerCase().includes("invite")
      ? "invite-paste"
      : "manual-note";
  const evidence = buildEvidence({ title, description, dateValue, location, source });
  const warnings = [
    ...(isoDate ? [] : ["No reliable date found. Same-day pickup cannot be assessed."]),
    ...(recipients === "Someone important" ? ["Recipient could not be inferred with confidence."] : [])
  ];
  const confidence = clamp(
    32 +
      (source === "ics-paste" ? 22 : 8) +
      (isoDate ? 18 : 0) +
      (occasion !== "card" ? 12 : 0) +
      (recipients !== "Someone important" ? 14 : 0),
    0,
    96
  );

  return {
    id: `signal-${stableId(`${title}:${dateValue ?? ""}:${recipients}`)}`,
    source,
    title: title.trim(),
    occasion,
    recipients,
    dateLabel: isoDate ? formatDateLabel(isoDate) : "Date needed",
    isoDate,
    location,
    evidence,
    confidence,
    warnings
  };
}

export function buildOpportunity(
  signal: FreeImportSignal,
  memories: MemoryItem[],
  now = new Date()
): CardOpportunity {
  const memoryMatches = memories.filter(
    (memory) => memory.approved && namesOverlap(memory.recipient, signal.recipients)
  );
  const urgency = computeUrgency(signal.isoDate, now);
  const status: OpportunityStatus =
    signal.confidence >= 60 && signal.recipients !== "Someone important" ? "ready" : "needs-more-detail";

  return {
    id: `opp-${stableId(`${signal.id}:${memoryMatches.map((memory) => memory.id).join(",")}`)}`,
    title: `${titleCase(signal.occasion)} card for ${signal.recipients}`,
    recipient: signal.recipients,
    occasion: signal.occasion,
    dateLabel: signal.dateLabel,
    urgency,
    status,
    confidence: clamp(signal.confidence + memoryMatches.length * 4, 0, 99),
    evidence: [
      ...signal.evidence,
      ...memoryMatches.map((memory) => `Approved memory: ${memory.note}`)
    ],
    recommendedPath: recommendedPathForUrgency(urgency),
    memoryIds: memoryMatches.map((memory) => memory.id)
  };
}

export function getDefaultDraftInput(
  workspace: LocalWorkspace | undefined,
  opportunity: CardOpportunity
): CardDraftInput {
  return {
    sender: workspace?.name ?? "Local User",
    recipient: opportunity.recipient,
    relationship: "Friends",
    occasion: opportunity.occasion,
    tone: "warm",
    style: "botanical",
    language: "English",
    personalNote: "Mention their shared patience, humor, and the little rituals that made the year feel full.",
    useMemory: opportunity.memoryIds.length > 0
  };
}

export function generateCardDraft(input: CardDraftInput, memories: MemoryItem[]): CardDraft {
  const recipient = cleanText(input.recipient) || "Someone important";
  const sender = cleanText(input.sender) || "Local User";
  const occasion = cleanText(input.occasion) || "card";
  const approvedMemories = input.useMemory
    ? memories.filter((memory) => memory.approved && namesOverlap(memory.recipient, recipient))
    : [];
  const memoryLine = approvedMemories[0]?.note ?? "The best details are the small ones you both recognize.";
  const rtl = isRtlLanguage(input.language);
  const voice = toneLine(input.tone);
  const visual = artDirection(input.style, input.tone);
  const note = cleanText(input.personalNote) || "Keep it simple, specific, and sincere.";

  const basePanels: Array<Omit<CardPanel, "overflowRisk">> = [
    {
      id: "front",
      label: "Front",
      headline: `${titleCase(occasion)} for ${recipient}`,
      body: visual.frontLine,
      artDirection: visual.front,
      width: 1500,
      height: 2100,
      dpi: 300,
      rtl
    },
    {
      id: "inside-left",
      label: "Inside left",
      headline: "The part that feels like them",
      body: `${memoryLine} ${note}`,
      artDirection: visual.left,
      width: 1500,
      height: 2100,
      dpi: 300,
      rtl
    },
    {
      id: "inside-right",
      label: "Inside right",
      headline: "Message",
      body: `${voice} May this ${occasion} feel generous, grounded, and unmistakably yours.`,
      artDirection: visual.right,
      width: 1500,
      height: 2100,
      dpi: 300,
      rtl
    },
    {
      id: "back",
      label: "Back",
      headline: `From ${sender}`,
      body: "Made with reviewed memories, local files, and final human approval.",
      artDirection: visual.back,
      width: 1500,
      height: 2100,
      dpi: 300,
      rtl
    }
  ];
  const panels: CardPanel[] = basePanels.map((panel) => ({
    ...panel,
    overflowRisk: panel.body.length > 360 || panel.headline.length > 90
  }));

  return {
    id: `draft-${stableId(`${sender}:${recipient}:${occasion}:${input.tone}:${input.style}:${note}`)}`,
    input,
    panels,
    memoryCitations: approvedMemories.map((memory) => memory.id),
    generatedBy: "deterministic-free-template"
  };
}

export function validateCardDraft(draft: CardDraft): CardValidation {
  const checks: ValidationCheck[] = [
    {
      label: "Four panels",
      passed: draft.panels.length === 4,
      detail: `${draft.panels.length}/4 panels present`
    },
    {
      label: "5x7 print size",
      passed: draft.panels.every((panel) => panel.width === 1500 && panel.height === 2100 && panel.dpi === 300),
      detail: "1500 x 2100 px at 300 DPI"
    },
    {
      label: "Text fit",
      passed: draft.panels.every((panel) => !panel.overflowRisk),
      detail: "Template copy stays inside conservative safe areas"
    },
    {
      label: "Human gate",
      passed: true,
      detail: "User must approve before any vendor upload"
    },
    {
      label: "Paid APIs",
      passed: true,
      detail: "No OAuth, AI, payment, or vendor API call is required"
    }
  ];
  const errors = checks.filter((check) => !check.passed).map((check) => check.label);

  return {
    passed: errors.length === 0,
    checks,
    errors
  };
}

export function buildVendorHandoff(vendorId: VendorId, validation: CardValidation): VendorHandoff {
  const vendorName = vendorNames[vendorId];
  const checklist = [
    "Download the four SVG panels.",
    "Open the vendor uploader in a normal browser tab.",
    "Select 5x7 folded or double-sided card when available.",
    "Upload front, inside-left, inside-right, and back in order.",
    "Inspect crop, fold, spelling, pickup store, and date.",
    validation.passed ? "Approve only after the preview matches the local panels." : "Fix validation errors before upload."
  ];

  return {
    vendorId,
    vendorName,
    mode: "manual-upload",
    costControl: "free-app-no-paid-api",
    realOrdersEnabled: false,
    canPlaceRealOrder: false,
    checklist,
    disabledReasons: [
      "No live vendor quote or order API is connected.",
      "No payment flow is implemented.",
      "Physical print certification has not been completed."
    ]
  };
}

export function buildPanelSvg(panel: CardPanel): string {
  const background = panel.id === "front" ? "#f8f3e8" : panel.id === "back" ? "#eef4f0" : "#f7f8fa";
  const accent = panel.id === "inside-right" ? "#c8553d" : panel.id === "inside-left" ? "#258477" : "#315b7d";
  const bodyLines = wrapSvgText(panel.body, 34).slice(0, 8);
  const headlineLines = wrapSvgText(panel.headline, 24).slice(0, 3);
  const direction = panel.rtl ? "rtl" : "ltr";
  const anchor = panel.rtl ? "end" : "start";
  const x = panel.rtl ? 1240 : 260;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100" role="img" aria-label="${escapeXml(panel.label)} panel" direction="${direction}">
  <rect width="1500" height="2100" fill="${background}"/>
  <rect x="120" y="120" width="1260" height="1860" rx="42" fill="none" stroke="${accent}" stroke-width="12"/>
  <circle cx="1210" cy="330" r="96" fill="${accent}" opacity="0.15"/>
  <path d="M210 1710 C480 1580, 720 1890, 1260 1670" fill="none" stroke="${accent}" stroke-width="18" opacity="0.22"/>
  <text x="${x}" y="470" fill="#1d2429" font-family="Georgia, serif" font-size="92" font-weight="700" text-anchor="${anchor}">
${headlineLines.map((line, index) => `    <tspan x="${x}" dy="${index === 0 ? 0 : 108}">${escapeXml(line)}</tspan>`).join("\n")}
  </text>
  <text x="${x}" y="880" fill="#27343a" font-family="Arial, sans-serif" font-size="54" text-anchor="${anchor}">
${bodyLines.map((line, index) => `    <tspan x="${x}" dy="${index === 0 ? 0 : 74}">${escapeXml(line)}</tspan>`).join("\n")}
  </text>
  <text x="${x}" y="1840" fill="#59656b" font-family="Arial, sans-serif" font-size="34" text-anchor="${anchor}">${escapeXml(panel.artDirection)}</text>
</svg>`;
}

export function exportFileName(panel: CardPanel, draftId: string): string {
  return `${draftId}-${panel.id}-1500x2100.svg`;
}

export function addMemory(
  workspace: LocalWorkspace,
  recipient: string,
  note: string,
  now = new Date()
): LocalWorkspace {
  const cleanRecipient = cleanText(recipient) || "Someone important";
  const cleanNote = cleanText(note);
  if (!cleanNote) return workspace;

  return {
    ...workspace,
    memories: [
      {
        id: `mem-${stableId(`${cleanRecipient}:${cleanNote}:${now.toISOString()}`)}`,
        recipient: cleanRecipient,
        note: cleanNote,
        tags: ["manual", "approved"],
        approved: true,
        sensitivity: cleanNote.length > 140 ? "review" : "normal",
        updatedAtIso: now.toISOString()
      },
      ...workspace.memories
    ]
  };
}

export function removeMemory(workspace: LocalWorkspace, memoryId: string): LocalWorkspace {
  return {
    ...workspace,
    memories: workspace.memories.filter((memory) => memory.id !== memoryId)
  };
}

function unfoldIcs(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function readIcsField(text: string, field: string): string | undefined {
  const match = text.match(new RegExp(`^${field}(?:;[^:]*)?:(.+)$`, "im"));
  return match?.[1]?.trim();
}

function firstSentence(text: string): string | undefined {
  return text.split(/[.!?\n]/).map((part) => part.trim()).find(Boolean);
}

function inferOccasion(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("anniversary")) return "anniversary";
  if (lower.includes("wedding")) return "wedding";
  if (lower.includes("birthday")) return "birthday";
  if (lower.includes("condolence") || lower.includes("sympathy")) return "sympathy";
  if (lower.includes("graduation")) return "graduation";
  if (lower.includes("thank")) return "thank-you";
  return "card";
}

function inferRecipients(text: string): string {
  const compact = text.replace(/\s+/g, " ");
  const forMatch = compact.match(/\bfor\s+([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?)/);
  if (forMatch?.[1]) return forMatch[1].replace("&", "and");

  const pairMatch = compact.match(/\b([A-Z][a-z]+)\s+(?:and|&)\s+([A-Z][a-z]+)\b/);
  if (pairMatch) return `${pairMatch[1]} and ${pairMatch[2]}`;

  const singleMatch = compact.match(/\b(?:with|to)\s+([A-Z][a-z]+)\b/);
  return singleMatch?.[1] ?? "Someone important";
}

function findNaturalDate(text: string): string | undefined {
  const iso = text.match(/\b20\d{2}-\d{2}-\d{2}\b/);
  if (iso) return iso[0];
  const monthDate = text.match(
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+20\d{2}\b/i
  );
  return monthDate?.[0];
}

function parseDateValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const compact = value.trim();
  const icsDate = compact.match(/^(20\d{2})(\d{2})(\d{2})/);
  if (icsDate) return `${icsDate[1]}-${icsDate[2]}-${icsDate[3]}`;
  const parsed = new Date(compact);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function formatDateLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${isoDate}T12:00:00.000Z`));
}

function inferLocation(text: string): string | undefined {
  const match = text.match(/\b(?:at|in)\s+([A-Z][A-Za-z .'-]+,\s*[A-Z]{2})\b/);
  return match?.[1]?.trim();
}

function buildEvidence(input: {
  title: string;
  description: string;
  dateValue?: string;
  location?: string;
  source: FreeImportSource;
}): string[] {
  return [
    `${input.source === "ics-paste" ? "ICS" : "Manual"} import: ${input.title}`,
    ...(input.dateValue ? [`Date signal: ${input.dateValue}`] : []),
    ...(input.location ? [`Location signal: ${input.location}`] : []),
    ...(input.description && input.description !== input.title
      ? [`Context: ${input.description.slice(0, 120)}`]
      : [])
  ];
}

function computeUrgency(isoDate: string | undefined, now: Date): Urgency {
  if (!isoDate) return "needs-date";
  const eventTime = new Date(`${isoDate}T12:00:00.000Z`).getTime();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)).getTime();
  const leadDays = Math.ceil((eventTime - today) / dayInMs);
  if (leadDays <= 2) return "same-day";
  if (leadDays <= 14) return "this-week";
  return "planned";
}

function recommendedPathForUrgency(urgency: Urgency): string {
  if (urgency === "same-day") return "Generate now and use local pickup handoff.";
  if (urgency === "this-week") return "Generate, review, then compare pickup and shipping windows.";
  if (urgency === "needs-date") return "Ask for the event date before choosing a vendor path.";
  return "Draft early and keep the final upload manual.";
}

function toneLine(tone: Tone): string {
  const lines: Record<Tone, string> = {
    warm: "You two make commitment look gentle and alive.",
    playful: "Another year, another excellent excuse to celebrate your shared weird little traditions.",
    elegant: "Your life together has the quiet grace of something tended with care.",
    reverent: "May the love around you continue to be a source of steadiness and blessing."
  };
  return lines[tone];
}

function artDirection(style: VisualStyle, tone: Tone) {
  const toneAccent = tone === "playful" ? "with a lively offset rhythm" : "with calm spacing";
  const directions: Record<VisualStyle, { frontLine: string; front: string; left: string; right: string; back: string }> = {
    botanical: {
      frontLine: "Soft stems, small blooms, and a hand-lettered center.",
      front: `Botanical border ${toneAccent}`,
      left: "Pressed-flower margin with generous writing space",
      right: "Single vine crossing the fold edge",
      back: "Tiny leaf mark with sender attribution"
    },
    "bold-type": {
      frontLine: "Confident type, warm color blocking, no clutter.",
      front: `Large editorial type ${toneAccent}`,
      left: "Two-column message grid",
      right: "Wide headline and calm body copy",
      back: "Small publisher-style footer"
    },
    "photo-note": {
      frontLine: "Photo-safe frame, handwritten caption, clean border.",
      front: `Photo note layout ${toneAccent}`,
      left: "Caption strip and open note field",
      right: "Soft frame for the main message",
      back: "Simple archive label"
    },
    minimal: {
      frontLine: "One line, one accent, plenty of breathing room.",
      front: `Minimal field ${toneAccent}`,
      left: "Fine rule and short note",
      right: "Centered message composition",
      back: "Small signature lockup"
    }
  };
  return directions[style];
}

function isRtlLanguage(language: LanguageChoice): boolean {
  return language === "Arabic" || language === "Urdu";
}

function namesOverlap(left: string, right: string): boolean {
  const leftTokens = nameTokens(left);
  const rightTokens = nameTokens(right);
  return leftTokens.some((token) => rightTokens.includes(token));
}

function nameTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && token !== "and" && token !== "the");
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function wrapSvgText(value: string, maxChars: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [value];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

const vendorNames: Record<VendorId, string> = {
  walgreens: "Walgreens",
  cvs: "CVS",
  fedex: "FedEx Office",
  walmart: "Walmart Photo",
  staples: "Staples Print",
  "office-depot": "Office Depot",
  "local-print-shop": "Local print shop"
};
