import { buildSampleArtifactHandoffContract, type ArtifactHandoffContract } from "./artifactHandoff";
import {
  buildOpportunity,
  buildVendorHandoff,
  createLocalWorkspace,
  defaultMemories,
  generateCardDraft,
  getDefaultDraftInput,
  parseFreeImport,
  sampleInviteText,
  validateCardDraft,
  type CardDraft,
  type CardOpportunity,
  type FreeImportSignal,
  type LocalWorkspace,
  type MemoryItem
} from "./customerWorkflow";

export type DemoSeedTable =
  | "users"
  | "auth_sessions"
  | "provider_connections"
  | "imported_events"
  | "card_opportunities"
  | "draft_states"
  | "relationship_memories"
  | "card_projects"
  | "render_packets"
  | "orders"
  | "order_events"
  | "vendor_quotes"
  | "consent_records"
  | "data_requests"
  | "audit_log";

export interface DemoSeedRow {
  table: DemoSeedTable;
  id: string;
  values: Record<string, unknown>;
}

export interface DemoSeedPlan {
  service: "customcard-demo-seed";
  generatedAtIso: string;
  resetKey: string;
  workspace: {
    userId: "user-demo";
    adminId: "admin-demo";
    workspaceId: string;
    email: string;
  };
  rows: DemoSeedRow[];
  artifactHandoff: Pick<ArtifactHandoffContract, "projectId" | "draftId" | "expiresAtIso" | "storageProvider"> & {
    artifactCount: number;
    manifestChecksum: string;
  };
  safety: {
    idempotentReset: true;
    rawContentStored: false;
    liveExternalCalls: false;
    realOrdersEnabled: false;
    productionCredentialsRequired: false;
  };
}

export interface DemoSeedSummary {
  service: "customcard-demo-seed";
  status: "ready" | "blocked";
  resetKey: string;
  tables: number;
  rows: number;
  renderArtifacts: number;
  signedArtifactUrls: boolean;
  idempotentReset: boolean;
  rawContentStored: false;
  liveExternalCalls: false;
  realOrdersEnabled: false;
  blockers: string[];
}

export interface DemoSeedSqlPreview {
  resetSql: string[];
  insertSql: string[];
}

const fixedDemoDateIso = "2026-06-03T12:00:00.000Z";
const requiredDemoTables: DemoSeedTable[] = [
  "users",
  "auth_sessions",
  "provider_connections",
  "imported_events",
  "card_opportunities",
  "draft_states",
  "relationship_memories",
  "card_projects",
  "render_packets",
  "orders",
  "order_events",
  "vendor_quotes",
  "consent_records",
  "data_requests",
  "audit_log"
];

export async function buildDemoSeedPlan(generatedAtIso = fixedDemoDateIso): Promise<DemoSeedPlan> {
  const workspace = {
    ...createLocalWorkspace("Demo User", "demo@customcard.local", new Date(generatedAtIso)),
    memories: defaultMemories
  };
  const signal = parseFreeImport(sampleInviteText);
  const opportunity = buildOpportunity(signal, workspace.memories, new Date(generatedAtIso));
  const draft = generateCardDraft(getDefaultDraftInput(workspace, opportunity), workspace.memories);
  const validation = validateCardDraft(draft);
  const handoff = buildVendorHandoff("walgreens", validation);
  const artifactHandoff = await buildSampleArtifactHandoffContract();
  const rows = buildDemoSeedRows({
    workspace,
    signal,
    opportunity,
    draft,
    memories: workspace.memories,
    artifactHandoff,
    generatedAtIso
  });

  return {
    service: "customcard-demo-seed",
    generatedAtIso,
    resetKey: `demo-reset-${artifactHandoff.manifest.manifestChecksum}`,
    workspace: {
      userId: "user-demo",
      adminId: "admin-demo",
      workspaceId: workspace.id,
      email: workspace.email
    },
    rows,
    artifactHandoff: {
      projectId: artifactHandoff.projectId,
      draftId: artifactHandoff.draftId,
      expiresAtIso: artifactHandoff.expiresAtIso,
      storageProvider: artifactHandoff.storageProvider,
      artifactCount: artifactHandoff.artifacts.length,
      manifestChecksum: artifactHandoff.manifest.manifestChecksum
    },
    safety: {
      idempotentReset: true,
      rawContentStored: false,
      liveExternalCalls: false,
      realOrdersEnabled: handoff.realOrdersEnabled,
      productionCredentialsRequired: false
    }
  };
}

export function summarizeDemoSeedPlan(plan: DemoSeedPlan): DemoSeedSummary {
  const blockers = validateDemoSeedPlan(plan);

  return {
    service: "customcard-demo-seed",
    status: blockers.length === 0 ? "ready" : "blocked",
    resetKey: plan.resetKey,
    tables: new Set(plan.rows.map((row) => row.table)).size,
    rows: plan.rows.length,
    renderArtifacts: plan.artifactHandoff.artifactCount,
    signedArtifactUrls: plan.artifactHandoff.manifestChecksum.startsWith("cc_artifact_"),
    idempotentReset: plan.safety.idempotentReset,
    rawContentStored: false,
    liveExternalCalls: false,
    realOrdersEnabled: false,
    blockers
  };
}

export function validateDemoSeedPlan(plan: DemoSeedPlan): string[] {
  const issues: string[] = [];
  const tables = new Set(plan.rows.map((row) => row.table));
  const ids = new Set<string>();

  for (const table of requiredDemoTables) {
    if (!tables.has(table)) issues.push(`Demo seed missing table: ${table}`);
  }
  for (const row of plan.rows) {
    if (!row.id) issues.push(`Demo seed row in ${row.table} is missing id.`);
    const rowKey = `${row.table}:${row.id}`;
    if (ids.has(rowKey)) issues.push(`Duplicate demo seed row: ${rowKey}`);
    ids.add(rowKey);
    if (!row.id.includes("demo") && row.table !== "relationship_memories") {
      issues.push(`Demo seed row ${rowKey} must use an explicit demo id.`);
    }
    if (row.values.raw_content_stored === true) issues.push(`Demo seed row ${rowKey} must not store raw content.`);
    if (row.values.real_orders_enabled === true || row.values.live_quote === true) {
      issues.push(`Demo seed row ${rowKey} must not enable live commerce.`);
    }
  }
  if (!plan.safety.idempotentReset) issues.push("Demo seed reset must be idempotent.");
  if (plan.safety.rawContentStored) issues.push("Demo seed must not store raw content.");
  if (plan.safety.liveExternalCalls) issues.push("Demo seed must not require live external calls.");
  if (plan.safety.realOrdersEnabled) issues.push("Demo seed must not enable real orders.");
  if (plan.safety.productionCredentialsRequired) issues.push("Demo seed must not require production credentials.");
  if (plan.artifactHandoff.artifactCount < 6) issues.push("Demo seed must include the full print artifact handoff.");

  return issues;
}

export function buildDemoSeedSqlPreview(plan: DemoSeedPlan): DemoSeedSqlPreview {
  const resetSql = [...requiredDemoTables]
    .reverse()
    .map((table) => {
      const ids = plan.rows.filter((row) => row.table === table).map((row) => quoteSql(row.id));
      return `DELETE FROM ${table} WHERE ${ids.length ? `id IN (${ids.join(", ")})` : "FALSE"};`;
    });
  const insertSql = plan.rows.map((row) => {
    const columns = Object.keys(row.values);
    const values = columns.map((column) => sqlValue(row.values[column]));
    return `INSERT INTO ${row.table} (${columns.join(", ")}) VALUES (${values.join(", ")});`;
  });

  return { resetSql, insertSql };
}

function buildDemoSeedRows({
  workspace,
  signal,
  opportunity,
  draft,
  memories,
  artifactHandoff,
  generatedAtIso
}: {
  workspace: LocalWorkspace;
  signal: FreeImportSignal;
  opportunity: CardOpportunity;
  draft: CardDraft;
  memories: MemoryItem[];
  artifactHandoff: ArtifactHandoffContract;
  generatedAtIso: string;
}): DemoSeedRow[] {
  const projectId = artifactHandoff.projectId;
  const opportunityId = "opp-demo-anniversary";
  const renderPacketId = `render-packet-demo-${artifactHandoff.manifest.manifestChecksum.slice(-8)}`;

  return [
    row("users", "user-demo", {
      id: "user-demo",
      email: workspace.email,
      locale: "en-US",
      region: "US",
      platform: "web",
      created_at: generatedAtIso
    }),
    row("users", "admin-demo", {
      id: "admin-demo",
      email: "admin@customcard.local",
      locale: "en-US",
      region: "US",
      platform: "web",
      created_at: generatedAtIso
    }),
    row("auth_sessions", "session-demo-customer", {
      id: "session-demo-customer",
      user_id: "user-demo",
      session_hash: "seeded_customer_session_hash_32chars",
      role: "customer",
      expires_at: "2026-06-04T12:00:00.000Z",
      revoked_at: null
    }),
    row("auth_sessions", "session-demo-admin", {
      id: "session-demo-admin",
      user_id: "admin-demo",
      session_hash: "seeded_admin_session_hash_32chars__",
      role: "admin",
      expires_at: "2026-06-04T12:00:00.000Z",
      revoked_at: null
    }),
    row("provider_connections", "provider-demo-ics", {
      id: "provider-demo-ics",
      user_id: "user-demo",
      provider: "ics-paste",
      status: "connected",
      adapter_version: "ics-paste-demo-v1",
      metadata_schema: { kind: "manual_calendar_export", rawContentAllowed: false },
      raw_content_stored: false
    }),
    row("imported_events", "event-demo-anniversary", {
      id: "event-demo-anniversary",
      connection_id: "provider-demo-ics",
      title: signal.title,
      starts_at: signal.isoDate ?? "2026-07-12",
      source_evidence: signal.evidence,
      recipient_hint: signal.recipients,
      raw_content_stored: false
    }),
    row("card_opportunities", opportunityId, {
      id: opportunityId,
      event_id: "event-demo-anniversary",
      recipient_name: opportunity.recipient,
      decision: "generate",
      confidence: opportunity.confidence
    }),
    row("draft_states", "draft-state-demo-current", {
      id: "draft-state-demo-current",
      user_id: "user-demo",
      status: "in-progress",
      draft_input: draft.input,
      opportunity_id: opportunityId,
      opportunity_decision: "accepted",
      vendor_id: "walgreens",
      locale: "en-US",
      raw_content_stored: false,
      updated_at: generatedAtIso
    }),
    ...memories.map((memory) =>
      row("relationship_memories", memory.id, {
        id: memory.id,
        user_id: "user-demo",
        recipient_name: memory.recipient,
        approved: memory.approved,
        forgotten_at: null,
        text: memory.note,
        sensitivity: memory.sensitivity
      })
    ),
    row("card_projects", projectId, {
      id: projectId,
      opportunity_id: opportunityId,
      approved_memory_ids: opportunity.memoryIds,
      draft_id: draft.id,
      locale: "en-US"
    }),
    row("render_packets", renderPacketId, {
      id: renderPacketId,
      project_id: projectId,
      kind: "validated_print_packet",
      width: 1500,
      height: 2100,
      dpi: 300,
      locale: "en-US",
      direction: "ltr",
      safe_zone_passed: true,
      text_overflow: false,
      checksum: artifactHandoff.manifest.manifestChecksum.replace("cc_artifact_", "cc_"),
      artifact_uri: artifactHandoff.artifacts[0]?.artifactUri ?? "file:///tmp/customcard-artifacts/demo",
      storage_provider: artifactHandoff.storageProvider,
      artifact_count: artifactHandoff.artifacts.length,
      artifact_manifest: artifactHandoff.manifest,
      signed_url_expires_at: artifactHandoff.expiresAtIso,
      external_share_approval_required: true,
      real_orders_enabled: false
    }),
    row("orders", "order-demo-manual-handoff", {
      id: "order-demo-manual-handoff",
      project_id: projectId,
      status: "vendor_handoff_blocked",
      certification_recorded: false,
      recovery_actions: ["manual_upload", "choose_another_printer", "cancel"],
      real_orders_enabled: false
    }),
    row("order_events", "order-event-demo-blocked", {
      id: "order-event-demo-blocked",
      order_id: "order-demo-manual-handoff",
      event_type: "vendor_handoff_blocked",
      payload: { reason: "Live vendor order APIs remain disabled.", realOrdersEnabled: false }
    }),
    row("vendor_quotes", "quote-demo-review-only", {
      id: "quote-demo-review-only",
      order_id: "order-demo-manual-handoff",
      vendor: "walgreens",
      live_quote: false,
      quote_cents: null
    }),
    row("consent_records", "consent-demo-external-share", {
      id: "consent-demo-external-share",
      user_id: "user-demo",
      action: "vendor_share",
      granted: false,
      created_at: generatedAtIso
    }),
    row("data_requests", "data-request-demo-export", {
      id: "data-request-demo-export",
      user_id: "user-demo",
      request_type: "export",
      status: "queued",
      created_at: generatedAtIso
    }),
    row("audit_log", "audit-demo-reset", {
      id: "audit-demo-reset",
      subject_type: "demo_seed",
      subject_id: "seed-demo-reset",
      actor_id: "admin-demo",
      action: "demo.reset.accepted",
      metadata: { resetKey: artifactHandoff.manifest.manifestChecksum, realOrdersEnabled: false },
      raw_content_stored: false
    })
  ];
}

function row(table: DemoSeedTable, id: string, values: Record<string, unknown>): DemoSeedRow {
  return { table, id, values };
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (Array.isArray(value) || typeof value === "object") return `${quoteSql(JSON.stringify(value))}::jsonb`;
  return quoteSql(String(value));
}

function quoteSql(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
