const rawImportFieldNames = ["rawImportText", "rawInviteText", "rawIcsText", "rawCalendarText"];
const defaultTimezone = "UTC";

export function resolveImportPreviewMetadata(body = {}) {
  const sourceKind = cleanText(body.sourceKind);
  const explicitPayload = metadataOnlyPayload(body);
  const rawText = readRawImportText(body);
  const rawTextField = rawText ? rawImportFieldNames.find((fieldName) => cleanText(body[fieldName])) : undefined;
  const parsed = explicitPayload ? normalizeExplicitPayload(explicitPayload, body) : parseRawImportText(rawText, body, sourceKind);
  const missingFields = missingImportPreviewMetadataFields(body, parsed.metadataOnlyPayload);

  return {
    sourceKind,
    metadataOnlyPayload: parsed.metadataOnlyPayload,
    missingFields,
    warnings: parsed.warnings,
    rawContentStored: false,
    parsedFromRawText: Boolean(!explicitPayload && rawText),
    rawTextField,
    evidenceSummary: parsed.evidenceSummary
  };
}

export function missingImportPreviewMetadataFields(body = {}, metadataOnly = undefined) {
  const missingFields = [];

  if (!hasRequiredText(body.sourceKind)) missingFields.push("sourceKind");
  if (!metadataOnly || !hasRequiredText(metadataOnly.title)) missingFields.push("metadataOnlyPayload.title");
  if (!metadataOnly || !hasRequiredText(metadataOnly.recipientName ?? metadataOnly.recipient_hint ?? metadataOnly.recipientHint)) {
    missingFields.push("metadataOnlyPayload.recipientName");
  }
  if (!metadataOnly || !hasValidTimestamp(metadataOnly.startsAt ?? metadataOnly.starts_at)) {
    missingFields.push("metadataOnlyPayload.startsAt");
  }

  return missingFields;
}

export function parseRawImportText(rawText, body = {}, sourceKind = cleanText(body.sourceKind)) {
  const text = unfoldIcs(String(rawText ?? "")).trim();
  if (!text) {
    return {
      metadataOnlyPayload: undefined,
      warnings: ["Paste invite, event, or ICS text, or provide metadataOnlyPayload fields."],
      evidenceSummary: []
    };
  }

  const fields = parseIcsFields(text);
  const isIcsEvent = hasIcsEvent(fields, text);
  const title = firstFieldValue(fields, "SUMMARY") ?? (isIcsEvent ? "" : firstSentence(text)) ?? "";
  const dateField = firstField(fields, "DTSTART");
  const parsedDate = parseDateValue(dateField?.value ?? findNaturalDate(text));
  const timezone = cleanText(dateField?.params.TZID) || cleanText(body.timezone) || defaultTimezone;
  const attendeeNames = readAttendeeNames(fields);
  const description = firstFieldValue(fields, "DESCRIPTION") ?? "";
  const recipientName = attendeeNames[0] ?? inferRecipients(`${title} ${description}`) ?? "";
  const location = firstFieldValue(fields, "LOCATION") ?? undefined;
  const sourceEvidence = buildSourceEvidence(sourceKind, fields, text);
  const evidenceSummary = buildEvidenceSummary(fields, text, attendeeNames);
  const warnings = [
    ...(title ? [] : ["No reliable event title found in pasted import text."]),
    ...(recipientName ? [] : ["Recipient could not be inferred from pasted import text."]),
    ...(parsedDate?.startsAt ? [] : ["No reliable event start time found in pasted import text."])
  ];

  return {
    metadataOnlyPayload: {
      title,
      recipientName,
      startsAt: parsedDate?.startsAt,
      timezone,
      location,
      confidence: scoreParsedImport({ fields, title, recipientName, startsAt: parsedDate?.startsAt }),
      sourceEvidence,
      evidenceSummary,
      rawContentStored: false
    },
    warnings,
    evidenceSummary
  };
}

function normalizeExplicitPayload(payload, body) {
  const title = cleanText(payload.title);
  const recipientName = cleanText(payload.recipientName ?? payload.recipient_hint ?? payload.recipientHint);
  const startsAt = cleanText(payload.startsAt ?? payload.starts_at);
  const timezone = cleanText(payload.timezone ?? body.timezone) || defaultTimezone;
  const evidenceSummary = Array.isArray(payload.evidenceSummary)
    ? payload.evidenceSummary.map(cleanText).filter(Boolean).slice(0, 8)
    : ["metadataOnlyPayload provided by caller"];

  return {
    metadataOnlyPayload: {
      ...payload,
      title,
      recipientName,
      startsAt,
      timezone,
      confidence: clampConfidence(payload.confidence, 0.92),
      sourceEvidence: cleanText(payload.sourceEvidence ?? payload.source_evidence) || `${cleanText(body.sourceKind)}:metadata-only`,
      evidenceSummary,
      rawContentStored: false
    },
    warnings: [],
    evidenceSummary
  };
}

function metadataOnlyPayload(body) {
  return body && typeof body.metadataOnlyPayload === "object" && body.metadataOnlyPayload !== null && !Array.isArray(body.metadataOnlyPayload)
    ? body.metadataOnlyPayload
    : undefined;
}

function readRawImportText(body) {
  for (const fieldName of rawImportFieldNames) {
    const rawText = body?.[fieldName];
    if (typeof rawText === "string" && rawText.trim()) return rawText;
  }
  return "";
}

function unfoldIcs(text) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function parseIcsFields(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseIcsLine)
    .filter(Boolean);
}

function parseIcsLine(line) {
  const separator = line.indexOf(":");
  if (separator < 1) return undefined;
  const nameAndParams = line.slice(0, separator);
  const value = decodeIcsText(line.slice(separator + 1));
  const [name, ...paramParts] = nameAndParams.split(";");
  const params = Object.fromEntries(
    paramParts
      .map((part) => {
        const equalsIndex = part.indexOf("=");
        if (equalsIndex < 1) return undefined;
        return [part.slice(0, equalsIndex).toUpperCase(), part.slice(equalsIndex + 1).replace(/^"|"$/g, "")];
      })
      .filter(Boolean)
  );

  return { name: name.toUpperCase(), params, value };
}

function firstField(fields, name) {
  return fields.find((field) => field.name === name);
}

function firstFieldValue(fields, name) {
  return firstField(fields, name)?.value;
}

function readAttendeeNames(fields) {
  return fields
    .filter((field) => field.name === "ATTENDEE")
    .map((field) => cleanText(field.params.CN))
    .filter(Boolean);
}

function parseDateValue(value) {
  const text = cleanText(value);
  if (!text) return undefined;

  const dateTime = text.match(/^(20\d{2})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (dateTime) {
    return {
      startsAt: `${dateTime[1]}-${dateTime[2]}-${dateTime[3]}T${dateTime[4]}:${dateTime[5]}:${dateTime[6]}.000Z`
    };
  }

  const dateOnly = text.match(/^(20\d{2})(\d{2})(\d{2})$/);
  if (dateOnly) {
    return { startsAt: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00:00.000Z` };
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return { startsAt: parsed.toISOString() };
}

function inferRecipients(text) {
  const compact = cleanText(text);
  const forMatch = compact.match(/\bfor\s+([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?)/);
  if (forMatch?.[1]) return forMatch[1].replace("&", "and");

  const pairMatch = compact.match(/\b([A-Z][a-z]+)\s+(?:and|&)\s+([A-Z][a-z]+)\b/);
  if (pairMatch) return `${pairMatch[1]} and ${pairMatch[2]}`;

  const singleMatch = compact.match(/\b(?:with|to)\s+([A-Z][a-z]+)\b/);
  return singleMatch?.[1];
}

function firstSentence(text) {
  const normalized = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(BEGIN|END|VERSION|PRODID|UID|SEQUENCE|STATUS|TRANSP)[:;]/i.test(line))
    .join(" ");
  return normalized.split(/[.!?]/)[0]?.slice(0, 120).trim();
}

function findNaturalDate(text) {
  const iso = text.match(/\b20\d{2}-\d{2}-\d{2}\b/);
  if (iso) return iso[0];
  const compact = cleanText(text);
  const monthDate = compact.match(
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+20\d{2}\b/i
  );
  return monthDate?.[0];
}

function buildSourceEvidence(sourceKind, fields, text) {
  const source = cleanText(sourceKind) || (hasIcsEvent(fields, text) ? "manual-ics" : "manual-invite");
  const fieldNames = new Set(fields.map((field) => field.name));
  const signals = [
    fieldNames.has("SUMMARY") ? "summary" : undefined,
    fieldNames.has("DTSTART") ? "dtstart" : undefined,
    fieldNames.has("ATTENDEE") ? "attendee" : undefined,
    fieldNames.has("LOCATION") ? "location" : undefined
  ].filter(Boolean);
  return `${source}:server-parsed:${signals.join("+") || "text"}`;
}

function buildEvidenceSummary(fields, text, attendeeNames) {
  const fieldNames = new Set(fields.map((field) => field.name));
  return [
    hasIcsEvent(fields, text) ? "ICS VEVENT detected" : "Plain invite text detected",
    fieldNames.has("SUMMARY") ? "SUMMARY field present" : undefined,
    fieldNames.has("DTSTART") ? "DTSTART field present" : undefined,
    fieldNames.has("LOCATION") ? "LOCATION field present" : undefined,
    attendeeNames.length > 0 ? `${attendeeNames.length} attendee label detected` : undefined
  ].filter(Boolean);
}

function hasIcsEvent(fields, text) {
  return text.includes("BEGIN:VEVENT") || fields.some((field) => field.name === "BEGIN" && field.value === "VEVENT");
}

function scoreParsedImport({ fields, title, recipientName, startsAt }) {
  const fieldNames = new Set(fields.map((field) => field.name));
  return clampConfidence(
    0.42 +
      (fieldNames.has("BEGIN") || fieldNames.has("SUMMARY") ? 0.12 : 0) +
      (title ? 0.12 : 0) +
      (recipientName ? 0.12 : 0) +
      (startsAt ? 0.16 : 0) +
      (fieldNames.has("LOCATION") ? 0.04 : 0),
    0.92
  );
}

function clampConfidence(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(numeric, 0.99));
}

function hasRequiredText(value) {
  return cleanText(value).length > 0;
}

function hasValidTimestamp(value) {
  const text = cleanText(value);
  return Boolean(text) && !Number.isNaN(new Date(text).getTime());
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function decodeIcsText(value) {
  return String(value ?? "")
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}
