import {
  generateCardDraft as generateCardDraftFromInput,
  getDefaultDraftInput as getDefaultDraftInputFromOpportunity,
  validateCardDraft as validateGeneratedCardDraft
} from "./cardDraft";
import {
  buildPanelSvg as buildRenderPacketPanelSvg,
  exportFileName as renderPacketExportFileName
} from "./renderPacket";

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
  // Optional for backward compatibility with workspaces stored before the event queue existed.
  events?: SavedEvent[];
  cardHistory?: CardHistoryEntry[];
}

export type SavedEventStatus = "saved" | "snoozed" | "dismissed";

export interface SavedEvent {
  id: string;
  title: string;
  recipient: string;
  occasion: string;
  dateLabel: string;
  isoDate?: string;
  status: SavedEventStatus;
  savedAtIso: string;
}

export interface CardHistoryEntry {
  id: string;
  title: string;
  recipient: string;
  occasion: string;
  exportedAtIso: string;
  // Rendered front panel, stored so history can show the real card.
  frontSvg?: string;
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

export type OpportunityDecision = "pending" | "accepted" | "snoozed" | "dismissed";

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
  imageUrl?: string;
}

export interface CardDraft {
  id: string;
  input: CardDraftInput;
  panels: CardPanel[];
  memoryCitations: string[];
  generatedBy: "deterministic-free-template" | "ai-text-only" | "ai-text-and-image";
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

export interface OccasionStarter {
  occasion: string;
  label: string;
}

// Occasions the import parser recognizes; chips and inference stay in sync.
export const occasionStarters: OccasionStarter[] = [
  { occasion: "birthday", label: "Birthday" },
  { occasion: "anniversary", label: "Anniversary" },
  { occasion: "wedding", label: "Wedding" },
  { occasion: "thank-you", label: "Thank you" },
  { occasion: "graduation", label: "Graduation" },
  { occasion: "sympathy", label: "Sympathy" }
];

export const freeAdapterLabels = [
  "Local workspace",
  "ICS or invite paste",
  "Manual memory review",
  "Deterministic copy templates",
  "Browser SVG export",
  "Local print package",
  "Manual print checklist"
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
    title:
      signal.occasion === "card"
        ? `Card for ${signal.recipients}`
        : `${titleCase(signal.occasion)} card for ${signal.recipients}`,
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
  return getDefaultDraftInputFromOpportunity(workspace, opportunity);
}

export function generateCardDraft(input: CardDraftInput, memories: MemoryItem[]): CardDraft {
  return generateCardDraftFromInput(input, memories);
}

export function validateCardDraft(draft: CardDraft): CardValidation {
  return validateGeneratedCardDraft(draft);
}

export function buildVendorHandoff(vendorId: VendorId, validation: CardValidation): VendorHandoff {
  const vendorName = vendorNames[vendorId];
  const checklist = [
    "Save the print package from CustomCard.",
    `Open the ${vendorName} 5x7 folded upload page in a normal browser tab.`,
    "Select 5x7 folded or double-sided card when available.",
    "Upload the numbered JPG panels in order: front, inside-left, inside-right, and back.",
    "Inspect crop, fold direction, spelling, quantity, pickup store, and date.",
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
      "Final price, pickup time, payment, and order submission happen outside CustomCard.",
      "CustomCard does not collect card details.",
      "Physical print certification has not been completed."
    ]
  };
}

export function buildPanelSvg(panel: CardPanel): string {
  return buildRenderPacketPanelSvg(panel);
}

export function exportFileName(panel: CardPanel, draftId: string): string {
  return renderPacketExportFileName(panel, draftId);
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

export function saveEventToWorkspace(
  workspace: LocalWorkspace,
  opportunity: CardOpportunity,
  isoDate: string | undefined,
  now = new Date()
): LocalWorkspace {
  const existing = workspace.events ?? [];
  const savedEvent: SavedEvent = {
    id: opportunity.id,
    title: opportunity.title,
    recipient: opportunity.recipient,
    occasion: opportunity.occasion,
    dateLabel: opportunity.dateLabel,
    isoDate,
    status: "saved",
    savedAtIso: now.toISOString()
  };
  return {
    ...workspace,
    events: [savedEvent, ...existing.filter((event) => event.id !== opportunity.id)]
  };
}

export function setSavedEventStatus(
  workspace: LocalWorkspace,
  eventId: string,
  status: SavedEventStatus
): LocalWorkspace {
  return {
    ...workspace,
    events: (workspace.events ?? []).map((event) => (event.id === eventId ? { ...event, status } : event))
  };
}

export function removeSavedEvent(workspace: LocalWorkspace, eventId: string): LocalWorkspace {
  return {
    ...workspace,
    events: (workspace.events ?? []).filter((event) => event.id !== eventId)
  };
}

export function upcomingSavedEvents(workspace: LocalWorkspace | undefined): SavedEvent[] {
  const events = workspace?.events ?? [];
  return events
    .filter((event) => event.status !== "dismissed")
    .slice()
    .sort((a, b) => {
      if (a.isoDate && b.isoDate) return a.isoDate.localeCompare(b.isoDate);
      if (a.isoDate) return -1;
      if (b.isoDate) return 1;
      return b.savedAtIso.localeCompare(a.savedAtIso);
    });
}

export function daysUntilLabel(isoDate: string | undefined, now = new Date()): string {
  if (!isoDate) return "Date needed";
  const target = new Date(`${isoDate}T12:00:00.000Z`).getTime();
  const reference = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12);
  const dayDiff = Math.round((target - reference) / dayInMs);
  if (dayDiff < 0) return "Passed";
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Tomorrow";
  return `In ${dayDiff} days`;
}

const cardHistoryLimit = 12;

export function recordCardExport(
  workspace: LocalWorkspace,
  draft: CardDraft,
  now = new Date()
): LocalWorkspace {
  const recipient = cleanText(draft.input.recipient) || "Someone important";
  const occasion = cleanText(draft.input.occasion) || "card";
  const frontPanel = draft.panels.find((panel) => panel.id === "front");
  const entry: CardHistoryEntry = {
    id: draft.id,
    title: occasion === "card" ? `Card for ${recipient}` : `${titleCase(occasion)} card for ${recipient}`,
    recipient,
    occasion,
    exportedAtIso: now.toISOString(),
    frontSvg: frontPanel ? buildPanelSvg(frontPanel) : undefined
  };
  const existing = (workspace.cardHistory ?? []).filter((item) => item.id !== draft.id);
  return {
    ...workspace,
    cardHistory: [entry, ...existing].slice(0, cardHistoryLimit)
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
  if (urgency === "same-day") return "Generate now and use a local pickup option.";
  if (urgency === "this-week") return "Generate, review, then compare pickup and shipping windows.";
  if (urgency === "needs-date") return "Ask for the event date before choosing a printer path.";
  return "Draft early and keep the final upload manual.";
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
