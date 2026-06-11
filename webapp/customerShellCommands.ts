import { useEffect, useMemo, useRef } from "react";
import type {
  CardDraftInput,
  OpportunityDecision,
  VendorHandoff,
  VendorId
} from "../src/customerWorkflow";
import type { SupportedLocaleCode } from "../src/localization";
import type { PrintExportFile } from "../src/printExport";
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

export function downloadExportFile(file: PrintExportFile) {
  const blob = new Blob([file.text], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadExportFiles(files: PrintExportFile[], delayMs = 80) {
  files.forEach((file, index) => {
    window.setTimeout(() => downloadExportFile(file), index * delayMs);
  });
}

export async function copyHandoffChecklist(handoff: VendorHandoff): Promise<"copied" | "clipboard-unavailable"> {
  const text = [
    `${handoff.vendorName} print checklist`,
    ...handoff.checklist.map((item, index) => `${index + 1}. ${item}`)
  ].join("\n");
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
    const timer = window.setTimeout(() => {
      const body = JSON.parse(draftSnapshot) as Record<string, unknown>;
      void postCustomerMutation(getToken, "/api/customer/draft-state", body);
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
  body: Record<string, unknown>
): Promise<void> {
  const headers = await buildCustomerHeaders(getToken);
  headers.set("Content-Type", "application/json");
  headers.set("X-Idempotency-Key", buildBrowserIdempotencyKey(path));
  await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
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
