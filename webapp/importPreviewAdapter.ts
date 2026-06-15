/**
 * Server-backed import preview. When the customer is signed in, pasted invite
 * or ICS text goes through /api/import-preview so opportunities are persisted
 * and parsed consistently server-side. Local parsing stays as offline fallback.
 */

import { postBrowserJson } from "../src/browserRequestAdapter";

export interface ServerImportOpportunity {
  opportunityId: string;
  eventId: string;
  recipientName: string;
  title: string;
  startsAt: string;
  timezone: string;
  confidence: number;
  decision: string;
}

export interface ServerImportPreview {
  opportunities: ServerImportOpportunity[];
  warnings: string[];
  evidenceSummary: string[];
  parsedFromRawText: boolean;
}

export async function requestServerImportPreview(
  getCustomerApiToken: (() => Promise<string | undefined>) | undefined,
  rawImportText: string
): Promise<ServerImportPreview | undefined> {
  const text = rawImportText.trim();
  if (!text) return undefined;
  try {
    const { payload, response } = await postBrowserJson<{
      opportunities?: ServerImportOpportunity[];
      warnings?: string[];
      importParser?: { evidenceSummary?: string[]; parsedFromRawText?: boolean };
    }>(
      "/api/import-preview",
      {
        sourceKind: text.includes("BEGIN:VCALENDAR") || text.includes("BEGIN:VEVENT") ? "ics-paste" : "invite-paste",
        rawImportText: text
      },
      {
        getToken: getCustomerApiToken,
        idempotencyKey: `import-preview-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        requireToken: true
      }
    );
    if (!response.ok) return undefined;
    return {
      opportunities: payload?.opportunities ?? [],
      warnings: payload?.warnings ?? [],
      evidenceSummary: payload?.importParser?.evidenceSummary ?? [],
      parsedFromRawText: Boolean(payload?.importParser?.parsedFromRawText)
    };
  } catch {
    return undefined;
  }
}
