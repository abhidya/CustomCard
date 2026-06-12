import type { CardDraftInput, CardOpportunity } from "../src/customerWorkflow";
import type { ImportedOpportunity } from "./calendarConnectionAdapter";

export interface CalendarMomentDraftContext {
  title: string;
  recipient: string;
  occasion: string;
  isoDate?: string;
  dateLabel: string;
  sourceLabel: string;
  confidenceLabel: string;
}

type CalendarMomentLike = Pick<
  ImportedOpportunity,
  "opportunityId" | "recipientName" | "title" | "startsAt" | "confidence"
>;

const recipientNeededLabel = "Recipient needed";
const calendarSourceLabel = "Google Calendar";
const genericRecipientWords = new Set([
  "birthday",
  "happy",
  "event",
  "calendar event",
  "party",
  "dinner",
  "brunch",
  "lunch",
  "celebration",
  "meeting",
  "appointment",
  "someone important"
]);

export function buildCalendarMomentDraftContext(moment: CalendarMomentLike): CalendarMomentDraftContext {
  const title = cleanText(moment.title) || "Calendar moment";
  const titleRecipient = inferRecipientFromCalendarTitle(title);
  const recipient = cleanRecipientName(moment.recipientName) || titleRecipient;
  const isoDate = isoDateFromMoment(moment.startsAt);

  return {
    title,
    recipient,
    occasion: inferCalendarOccasion(title),
    isoDate,
    dateLabel: formatMomentDateLabel(isoDate),
    sourceLabel: calendarSourceLabel,
    confidenceLabel: `${Math.round(clamp(Number(moment.confidence), 0, 1) * 100)}% match`
  };
}

export function applyCalendarMomentToDraftInput(
  current: CardDraftInput,
  moment: CalendarMomentLike
): CardDraftInput {
  const context = buildCalendarMomentDraftContext(moment);
  return {
    ...current,
    recipient: context.recipient || current.recipient,
    occasion: context.occasion || current.occasion
  };
}

export function buildCalendarMomentOpportunity(
  baseOpportunity: CardOpportunity,
  moment: CalendarMomentLike
): CardOpportunity {
  const context = buildCalendarMomentDraftContext(moment);
  const recipient = context.recipient || recipientNeededLabel;
  const occasion = context.occasion || baseOpportunity.occasion;

  return {
    ...baseOpportunity,
    id: moment.opportunityId,
    title: context.recipient
      ? occasion === "card"
        ? `Card for ${recipient}`
        : `${titleCase(occasion)} card for ${recipient}`
      : context.title,
    recipient,
    occasion,
    dateLabel: context.dateLabel
  };
}

export function cleanRecipientName(value: string): string {
  const stripped = cleanText(value)
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .replace(/[!?.:,;]+$/g, "")
    .replace(/\s+[!?.:,;]+$/g, "")
    .replace(/[’']s$/i, "")
    .trim();
  if (!stripped) return "";
  return genericRecipientWords.has(stripped.toLowerCase()) ? "" : stripped;
}

function inferRecipientFromCalendarTitle(title: string): string {
  const cleanTitle = cleanText(title);
  const possessive = cleanTitle.match(/^(.+?)[’']s\s+(birthday|anniversary|graduation|wedding|party|celebration)\b/i);
  if (possessive?.[1]) return cleanRecipientName(possessive[1]);

  const forMatch = cleanTitle.match(/\b(?:birthday|anniversary|graduation|wedding|party|celebration|brunch|lunch|dinner)\s+for\s+(.+?)(?:\s+(?:on|at|in)\b|$)/i);
  if (forMatch?.[1]) return cleanRecipientName(forMatch[1]);

  const withoutOccasion = cleanTitle
    .replace(/\b(happy|birthday|anniversary|wedding|graduation|dinner|party|celebration|brunch|lunch)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleanRecipientName(withoutOccasion);
}

function inferCalendarOccasion(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("birthday")) return "birthday";
  if (lower.includes("anniversary")) return "anniversary";
  if (lower.includes("wedding")) return "wedding";
  if (lower.includes("graduation")) return "graduation";
  if (lower.includes("sympathy") || lower.includes("condolence") || lower.includes("memorial")) return "sympathy";
  if (lower.includes("thank")) return "thank-you";
  return "card";
}

function isoDateFromMoment(startsAt: string): string | undefined {
  const clean = cleanText(startsAt);
  if (!clean) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const parsed = new Date(clean);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function formatMomentDateLabel(isoDate: string | undefined): string {
  if (!isoDate) return "Date needed";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${isoDate}T12:00:00.000Z`));
}

function titleCase(value: string): string {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function cleanText(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
