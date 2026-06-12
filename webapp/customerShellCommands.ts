import { useEffect, useMemo, useRef } from "react";
import type {
  CardDraftInput,
  OpportunityDecision,
  VendorHandoff,
  VendorId
} from "../src/customerWorkflow";
import type { SupportedLocaleCode } from "../src/localization";
import type { PrintExportFile, PrintExportPackage } from "../src/printExport";
import { buildDraftProgressState } from "./draftProgress";

export interface DraftAutosaveInput {
  draftInput: CardDraftInput;
  enabled: boolean;
  getToken: () => Promise<string | null>;
  localeCode: SupportedLocaleCode;
  opportunityDecision: OpportunityDecision;
  opportunityId: string;
  setDraftInput: (updater: ((current: CardDraftInput) => CardDraftInput) | CardDraftInput) => void;
  setLocaleCode: (code: SupportedLocaleCode) => void;
  setOpportunityDecision: (decision: OpportunityDecision) => void;
  setVendorId: (vendorId: VendorId) => void;
  validationPassed: boolean;
  vendorId: VendorId;
}

interface SavedDraftState {
  draftInput?: CardDraftInput;
  localeCode?: SupportedLocaleCode;
  opportunityDecision?: OpportunityDecision;
  vendorId?: VendorId;
}

export interface ArchiveEntry {
  path: string;
  bytes: string | Uint8Array;
}

export function downloadExportFile(file: PrintExportFile) {
  const blob = new Blob([file.text], { type: file.mimeType });
  downloadBlob(blob, file.fileName);
}

export function downloadExportFiles(files: PrintExportFile[], delayMs = 80) {
  files.forEach((file, index) => {
    window.setTimeout(() => downloadExportFile(file), index * delayMs);
  });
}

export function downloadExportArchive(files: PrintExportFile[], archiveName: string) {
  downloadArchiveEntries(files.map((file) => ({ path: file.fileName, bytes: file.text })), archiveName);
}

export function downloadPrintPackageArchive(printPackage: PrintExportPackage, extraEntries: ArchiveEntry[] = []) {
  downloadArchiveEntries(
    [
      ...printPackage.files.map((file) => ({ path: file.fileName, bytes: file.text })),
      ...extraEntries
    ],
    `${printPackage.draftId}-print-package.zip`
  );
}

export function downloadArchiveEntries(entries: ArchiveEntry[], archiveName: string) {
  downloadBlob(buildZipArchiveBlob(entries), archiveName);
}

export function buildZipArchiveBlob(entries: ArchiveEntry[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const pathBytes = encoder.encode(safeZipPath(entry.path));
    const fileBytes = typeof entry.bytes === "string" ? encoder.encode(entry.bytes) : entry.bytes;
    const checksum = crc32(fileBytes);
    const localHeader = buildZipLocalHeader(pathBytes, fileBytes, checksum);
    const centralHeader = buildZipCentralHeader(pathBytes, fileBytes, checksum, offset);

    localParts.push(localHeader, pathBytes, fileBytes);
    centralParts.push(centralHeader, pathBytes);
    offset += localHeader.byteLength + pathBytes.byteLength + fileBytes.byteLength;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((total, part) => total + part.byteLength, 0);
  const endRecord = buildZipEndRecord(entries.length, centralSize, centralOffset);

  return new Blob([...localParts.map(toBlobPart), ...centralParts.map(toBlobPart), toBlobPart(endRecord)], {
    type: "application/zip"
  });
}

export function buildHandoffChecklistText(handoff: VendorHandoff): string {
  return [
    `${handoff.vendorName} print checklist`,
    ...handoff.checklist.map((item, index) => `${index + 1}. ${item}`)
  ].join("\n");
}

export async function copyHandoffChecklist(handoff: VendorHandoff): Promise<"copied" | "clipboard-unavailable"> {
  const text = buildHandoffChecklistText(handoff);
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "clipboard-unavailable";
  }
}

export function useDraftAutosave({
  draftInput,
  enabled,
  getToken,
  localeCode,
  opportunityDecision,
  opportunityId,
  setDraftInput,
  setLocaleCode,
  setOpportunityDecision,
  setVendorId,
  validationPassed,
  vendorId
}: DraftAutosaveInput) {
  const hydrated = useRef(false);
  const draftProgress = useMemo(
    () => buildDraftProgressState(draftInput, validationPassed),
    [draftInput, validationPassed]
  );
  const draftSnapshot = useMemo(
    () =>
      JSON.stringify({
        draftInput,
        localeCode,
        opportunityDecision,
        opportunityId,
        status: draftProgress.status,
        vendorId
      }),
    [draftInput, draftProgress.status, localeCode, opportunityDecision, opportunityId, vendorId]
  );
  const lastAutosaveSnapshot = useRef("");

  useEffect(() => {
    if (!enabled) {
      hydrated.current = false;
      return;
    }

    let cancelled = false;
    getCustomerJson(getToken, "/api/customer/draft-state/current")
      .then((payload) => {
        if (cancelled) return;
        const saved = payload?.draftState as SavedDraftState | undefined;
        if (saved?.draftInput) setDraftInput((current) => ({ ...current, ...saved.draftInput }));
        if (saved?.localeCode) setLocaleCode(saved.localeCode);
        if (saved?.opportunityDecision) setOpportunityDecision(saved.opportunityDecision);
        if (saved?.vendorId) setVendorId(saved.vendorId);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) hydrated.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, getToken, setDraftInput, setLocaleCode, setOpportunityDecision, setVendorId]);

  useEffect(() => {
    if (!enabled || !hydrated.current || !draftProgress.hasMeaningfulProgress) return;
    if (lastAutosaveSnapshot.current === draftSnapshot) return;
    const timer = window.setTimeout(() => {
      const body = JSON.parse(draftSnapshot) as Record<string, unknown>;
      lastAutosaveSnapshot.current = draftSnapshot;
      void postCustomerMutation(getToken, "/api/customer/draft-state", body, {
        idempotencyKey: buildDraftAutosaveIdempotencyKey("/api/customer/draft-state", draftSnapshot)
      }).catch(() => {
        lastAutosaveSnapshot.current = "";
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [draftProgress.hasMeaningfulProgress, draftSnapshot, enabled, getToken]);
}

export async function getCustomerJson(getToken: () => Promise<string | null>, path: string): Promise<Record<string, unknown> | undefined> {
  const headers = await buildCustomerHeaders(getToken);
  const response = await fetch(path, { headers });
  if (!response.ok) return undefined;
  return response.json() as Promise<Record<string, unknown>>;
}

export async function postCustomerMutation(
  getToken: () => Promise<string | null>,
  path: string,
  body: Record<string, unknown>,
  options: { idempotencyKey?: string } = {}
): Promise<void> {
  const headers = await buildCustomerHeaders(getToken);
  headers.set("Content-Type", "application/json");
  headers.set("X-Idempotency-Key", options.idempotencyKey ?? buildBrowserIdempotencyKey(path));
  const response = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { status?: unknown };
    throw new Error(String(detail.status ?? `customer-mutation-http-${response.status}`));
  }
}

export async function buildCustomerHeaders(getToken: () => Promise<string | null>): Promise<Headers> {
  const headers = new Headers();
  try {
    const token = await getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  } catch {
    /* signed-in UI stays usable while the API session recovers */
  }
  return headers;
}

export function buildBrowserIdempotencyKey(path: string): string {
  const routeSlug = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "mutation";
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${routeSlug}-${crypto.randomUUID()}`;
  return `${routeSlug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function buildDraftAutosaveIdempotencyKey(path: string, snapshot: string): string {
  const routeSlug = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "draft-autosave";
  return `${routeSlug}-snapshot-${fnv1a64(snapshot)}`;
}

function fnv1a64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toBlobPart(bytes: Uint8Array): BlobPart {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function buildZipLocalHeader(pathBytes: Uint8Array, fileBytes: Uint8Array, checksum: number): Uint8Array {
  const { date, time } = zipTimestamp();
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, time, true);
  view.setUint16(12, date, true);
  view.setUint32(14, checksum, true);
  view.setUint32(18, fileBytes.byteLength, true);
  view.setUint32(22, fileBytes.byteLength, true);
  view.setUint16(26, pathBytes.byteLength, true);
  view.setUint16(28, 0, true);
  return header;
}

function buildZipCentralHeader(
  pathBytes: Uint8Array,
  fileBytes: Uint8Array,
  checksum: number,
  localHeaderOffset: number
): Uint8Array {
  const { date, time } = zipTimestamp();
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, time, true);
  view.setUint16(14, date, true);
  view.setUint32(16, checksum, true);
  view.setUint32(20, fileBytes.byteLength, true);
  view.setUint32(24, fileBytes.byteLength, true);
  view.setUint16(28, pathBytes.byteLength, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localHeaderOffset, true);
  return header;
}

function buildZipEndRecord(entryCount: number, centralSize: number, centralOffset: number): Uint8Array {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0, true);
  return record;
}

function safeZipPath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/") || "customcard-file";
}

function zipTimestamp(): { date: number; time: number } {
  const date = new Date();
  const dosTime = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2);
  const dosDate = ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  return { date: dosDate, time: dosTime };
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});
