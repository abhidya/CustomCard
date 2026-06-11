import { Activity, ChevronDown, ExternalLink, Image, Info, RefreshCw, Users } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { AiFlowAdminConfig, AiFlowConfigSummary } from "../../src/aiFlowConfig";
import type { AiGenerationJobEvidence } from "../../src/aiGenerationJobs";
import { providerCatalog } from "../../src/providerCatalog";
import { AdminCardGalleryView } from "./AdminCardGalleryView";

const adapterLabels = new Map(providerCatalog.map((adapter) => [adapter.id, adapter.label]));

function adapterLabel(adapterId: string): string {
  return adapterLabels.get(adapterId) ?? adapterId;
}

interface ProbeResult {
  ms: number;
  ok: boolean;
  status?: number;
}

interface ProbeTarget {
  id: string;
  name: string;
  url: string;
}

interface BucketObject {
  objectKey: string;
  fileName: string;
  byteLength: number;
  contentType: string;
  lastModifiedIso?: string;
  metadata?: Record<string, string>;
  signedDownload?: {
    url: string;
    expiresAtIso: string;
  } | null;
}

interface BucketViewerPayload {
  status?: string;
  objectStore?: {
    configured?: boolean;
    provider?: string;
    bucket?: string | null;
    endpoint?: string;
    credentialMode?: string;
    liveNetworkCalls?: boolean;
  };
  prefix?: string;
  objectCount?: number;
  truncated?: boolean;
  nextCursor?: string | null;
  objects?: BucketObject[];
  blockers?: string[];
}

function buildProbeTargets(): ProbeTarget[] {
  const cardGenUrl = (import.meta.env.VITE_CARD_GEN_URL as string | undefined) ?? "";
  return [
    { id: "web", name: "Web app", url: "/?probe=1" },
    { id: "api", name: "API health", url: "/api/health" },
    ...(cardGenUrl ? [{ id: "cardgen", name: "AI card generation", url: cardGenUrl }] : [])
  ];
}

async function probe(url: string): Promise<ProbeResult> {
  const start = performance.now();
  try {
    const response = await fetch(url, { cache: "no-store" });
    return { ms: Math.round(performance.now() - start), ok: response.ok, status: response.status };
  } catch {
    return { ms: Math.round(performance.now() - start), ok: false };
  }
}

/** Focused operator console: live status, dependency latency, users, provider policy. */
export function AdminView({
  aiFlowConfigs,
  aiGenerationJobs,
  aiFlowSummary,
  onAiFlowConfigsChange,
  getAdminApiToken,
  fullAudit
}: {
  aiFlowConfigs: AiFlowAdminConfig[];
  aiGenerationJobs: AiGenerationJobEvidence[];
  aiFlowSummary: AiFlowConfigSummary;
  onAiFlowConfigsChange: (configs: AiFlowAdminConfig[]) => void;
  getAdminApiToken?: () => Promise<string | undefined>;
  fullAudit: ReactNode;
}) {
  /* ---------- live dependency probes ---------- */
  const [targets] = useState(buildProbeTargets);
  const [results, setResults] = useState<Record<string, ProbeResult | "running">>({});
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const runProbes = useCallback(() => {
    for (const target of targets) {
      setResults((current) => ({ ...current, [target.id]: "running" }));
      void probe(target.url).then((result) => {
        setResults((current) => ({ ...current, [target.id]: result }));
      });
    }
    setLastRunAt(new Date().toLocaleTimeString());
  }, [targets]);

  useEffect(() => {
    runProbes();
  }, [runProbes]);

  const apiResult = results.api;
  const serviceUp = apiResult !== undefined && apiResult !== "running" && apiResult.ok;

  /* ---------- provider policy edits ---------- */
  function updateFlow(flowId: string, patch: Partial<AiFlowAdminConfig>) {
    onAiFlowConfigsChange(
      aiFlowConfigs.map((config) => (config.flowId === flowId ? { ...config, ...patch } : config))
    );
  }

  /* ---------- full audit ---------- */
  const [auditOpen, setAuditOpen] = useState(false);
  const latestAiJobs = aiGenerationJobs.slice(0, 3);
  const latestAiJob = latestAiJobs[0];
  const generatedPanels = aiGenerationJobs.reduce((total, job) => total + job.imageCount, 0);
  const [bucketPrefix, setBucketPrefix] = useState("projects/");
  const [bucketPayload, setBucketPayload] = useState<BucketViewerPayload | null>(null);
  const [bucketLoading, setBucketLoading] = useState(false);
  const [bucketError, setBucketError] = useState("");

  const loadBucketObjects = useCallback((cursor?: string) => {
    const params = new URLSearchParams({ prefix: bucketPrefix, limit: "20" });
    if (cursor) params.set("cursor", cursor);
    setBucketLoading(true);
    setBucketError("");
    const headers = new Headers();
    Promise.resolve(getAdminApiToken?.())
      .then((token) => {
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(`/api/admin/artifacts/bucket?${params.toString()}`, { cache: "no-store", headers });
      })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.status || `Bucket viewer returned HTTP ${response.status}`);
        setBucketPayload((current) => mergeBucketPayload(current, payload as BucketViewerPayload, Boolean(cursor)));
      })
      .catch((error: unknown) => {
        if (!cursor) setBucketPayload(null);
        setBucketError(error instanceof Error ? error.message : "Bucket viewer is unavailable.");
      })
      .finally(() => setBucketLoading(false));
  }, [bucketPrefix, getAdminApiToken]);

  useEffect(() => {
    loadBucketObjects();
  }, [loadBucketObjects]);

  return (
    <section className="opsShell reveal">
      <header className="pagehead">
        <h1>Operations</h1>
        <p>Service health, critical dependencies, users, and provider policy — the full audit lives one click deeper.</p>
      </header>

      <div className="opsGrid">
        {/* ---- Service status ---- */}
        <section className="panelcard opsCard">
          <div className="opsCardHead">
            <h2>Service</h2>
            <span className="opsStatus" data-ok={serviceUp}>
              <Activity size={14} />
              {apiResult === "running" || apiResult === undefined ? "Checking" : serviceUp ? "Live" : "API unreachable"}
            </span>
          </div>
          <ul className="opsFacts">
            <li>
              <span>AI flows ready for live calls</span>
              <strong>
                {aiFlowSummary.readyForLiveCalls}/{aiFlowSummary.total}
              </strong>
            </li>
            <li>
              <span>Live provider calls enabled</span>
              <strong>{aiFlowSummary.liveEnabled}</strong>
            </li>
            <li>
              <span>Retail orders &amp; payments</span>
              <strong>Manual handoff only</strong>
            </li>
          </ul>
          <button className="textlink" onClick={() => setAuditOpen((open) => !open)} type="button">
            {auditOpen ? "Hide full operational audit" : "Open full operational audit"}
            <ChevronDown className="importExpanderChevron" data-open={auditOpen} size={14} style={{ verticalAlign: "-2px", marginLeft: 6 }} />
          </button>
        </section>

        {/* ---- Dependency latency ---- */}
        <section className="panelcard opsCard">
          <div className="opsCardHead">
            <h2>Dependency latency</h2>
            <button className="btn btn-ghost btn-sm" onClick={runProbes} type="button">
              <RefreshCw size={14} />
              Re-run
            </button>
          </div>
          <ul className="opsProbes">
            {targets.map((target) => {
              const result = results[target.id];
              return (
                <li key={target.id}>
                  <span className="opsProbeDot" data-state={result === "running" || result === undefined ? "wait" : result.ok ? "ok" : "fail"} />
                  <span className="opsProbeName">{target.name}</span>
                  <span className="opsProbeMs">
                    {result === undefined || result === "running"
                      ? "…"
                      : `${result.ms} ms${result.ok ? "" : result.status ? ` · HTTP ${result.status}` : " · failed"}`}
                  </span>
                </li>
              );
            })}
          </ul>
          <small className="opsFoot">Measured from this browser{lastRunAt ? ` · last run ${lastRunAt}` : ""}.</small>
        </section>

        {/* ---- Card gallery curation ---- */}
        <AdminCardGalleryView getAdminApiToken={getAdminApiToken} />

        {/* ---- AI generation jobs ---- */}
        <section className="panelcard opsCard opsCard-wide opsJobsCard">
          <div className="opsCardHead">
            <h2>AI generation jobs</h2>
            <span className="opsStatus" data-ok={Boolean(latestAiJob && latestAiJob.imageCount > 0)}>
              <Image size={14} />
              {latestAiJob ? `${latestAiJob.imageCount}/${latestAiJob.panelCount} panels` : "No runs yet"}
            </span>
          </div>
          <ul className="opsFacts opsFacts-four">
            <li>
              <span>Recent jobs</span>
              <strong>{aiGenerationJobs.length}</strong>
            </li>
            <li>
              <span>Generated panels</span>
              <strong>{generatedPanels}</strong>
            </li>
            <li>
              <span>Latest image provider</span>
              <strong>{latestAiJob?.imageProvider ?? "Waiting"}</strong>
            </li>
            <li>
              <span>History cap</span>
              <strong>10</strong>
            </li>
          </ul>

          {latestAiJobs.length === 0 ? (
            <div className="opsEmpty">
              <Info size={16} />
              <span>Generate a card to capture the exact per-panel prompts, provider route, and generated artwork.</span>
            </div>
          ) : (
            <div className="opsJobList" aria-label="Recent AI generation jobs">
              {latestAiJobs.map((job) => (
                <section className="opsJob" key={job.id}>
                  <div className="opsJobHead">
                    <div>
                      <strong>{job.draftId}</strong>
                      <span>{formatJobTime(job.createdAtIso)} · {job.generatedBy}</span>
                    </div>
                    <em>{aiGenerationJobStatusLabel(job.status)}</em>
                  </div>
                  <div className="opsJobMeta">
                    <span>Copy: {job.copyProvider} / {job.copyModel}</span>
                    <span>Image: {job.imageProvider} / {job.imageModel}</span>
                    {job.textProviderFailure ? <span>{job.textProviderFailure}</span> : null}
                    {job.imageProviderFailure ? <span>{job.imageProviderFailure}</span> : null}
                  </div>
                  <div className="opsJobPanels">
                    {job.panels.map((panel) => (
                      <article className="opsJobPanel" key={`${job.id}-${panel.panelId}`}>
                        {panel.imageUrl ? (
                          <img alt={`${panel.label} generated panel`} src={panel.imageUrl} />
                        ) : (
                          <span className="opsJobMissing" aria-label={`${panel.label} image missing`}>
                            <Image size={16} />
                          </span>
                        )}
                        <div className="opsJobPanelBody">
                          <div className="opsJobPanelTitle">
                            <strong>{panel.label}</strong>
                            <span>{panel.panelId} · {panel.width} x {panel.height}</span>
                          </div>
                          <p>{panel.headline}</p>
                          <small>{panel.body}</small>
                          <details>
                            <summary>Prompt sent</summary>
                            <pre>{panel.imagePrompt || "No image prompt captured."}</pre>
                          </details>
                          <details>
                            <summary>Generated prompt</summary>
                            <pre>{panel.revisedPrompt || panel.imagePrompt || "No generated prompt captured."}</pre>
                          </details>
                          {panel.negativePrompt ? (
                            <details>
                              <summary>Negative prompt</summary>
                              <pre>{panel.negativePrompt}</pre>
                            </details>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        {/* ---- Object bucket viewer ---- */}
        <section className="panelcard opsCard opsCard-wide opsBucketCard">
          <div className="opsCardHead">
            <h2>Bucket viewer</h2>
            <span className="opsStatus" data-ok={Boolean(bucketPayload?.objectStore?.configured)}>
              {bucketLoading ? "Loading" : bucketPayload?.objectStore?.configured ? "Configured" : "Needs object store"}
            </span>
          </div>

          <div className="opsBucketControls">
            <label>
              Prefix
              <input
                autoCapitalize="none"
                autoCorrect="off"
                onChange={(event) => setBucketPrefix(event.target.value)}
                spellCheck={false}
                value={bucketPrefix}
              />
            </label>
            <button className="btn btn-ghost btn-sm" onClick={() => loadBucketObjects()} type="button">
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          <ul className="opsFacts opsFacts-four">
            <li>
              <span>Provider</span>
              <strong>{bucketPayload?.objectStore?.provider ?? "Unknown"}</strong>
            </li>
            <li>
              <span>Bucket</span>
              <strong>{bucketPayload?.objectStore?.bucket ?? "Not configured"}</strong>
            </li>
            <li>
              <span>Objects</span>
              <strong>{bucketPayload?.objectCount ?? 0}{bucketPayload?.truncated ? "+" : ""}</strong>
            </li>
            <li>
              <span>Credentials</span>
              <strong>{bucketPayload?.objectStore?.credentialMode ?? "unconfigured"}</strong>
            </li>
          </ul>

          {bucketError ? (
            <div className="opsEmpty">
              <Info size={16} />
              <span>{bucketError}</span>
            </div>
          ) : null}
          {bucketPayload?.blockers?.length ? (
            <div className="opsEmpty">
              <Info size={16} />
              <span>{bucketPayload.blockers[0]}</span>
            </div>
          ) : null}
          {bucketPayload?.objects?.length ? (
            <div className="opsBucketList" aria-label="Object-store bucket objects">
              {bucketPayload.objects.map((object) => (
                <article className="opsBucketObject" key={object.objectKey}>
                  <div>
                    <strong>{object.fileName}</strong>
                    <span>{object.objectKey}</span>
                  </div>
                  <div className="opsBucketMeta">
                    <span>{formatBytes(object.byteLength)}</span>
                    <span>{object.contentType}</span>
                    {object.lastModifiedIso ? <span>{formatJobTime(object.lastModifiedIso)}</span> : null}
                    {object.metadata?.kind ? <span>{object.metadata.kind}</span> : null}
                    {object.signedDownload?.url ? (
                      <a href={object.signedDownload.url} rel="noreferrer" target="_blank">
                        Open signed
                        <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : !bucketLoading && !bucketError ? (
            <div className="opsEmpty">
              <Info size={16} />
              <span>No bucket objects found for this prefix.</span>
            </div>
          ) : null}
          {bucketPayload?.truncated && bucketPayload.nextCursor ? (
            <button className="btn btn-ghost btn-sm" disabled={bucketLoading} onClick={() => loadBucketObjects(bucketPayload.nextCursor ?? undefined)} type="button">
              <RefreshCw size={14} />
              Load more
            </button>
          ) : null}
        </section>

        {/* ---- Users ---- */}
        <section className="panelcard opsCard">
          <div className="opsCardHead">
            <h2>Users</h2>
            <Users size={16} />
          </div>
          <p className="opsNote">
            Accounts, sessions, bans, and roles are managed in Clerk. Admin access is granted by the{" "}
            <code>admin</code> role or the configured email allowlist.
          </p>
          <a className="btn btn-ghost btn-sm" href="https://dashboard.clerk.com" rel="noreferrer" target="_blank">
            Open Clerk user management
            <ExternalLink size={13} />
          </a>
        </section>

        {/* ---- Provider policy ---- */}
        <section className="panelcard opsCard opsCard-wide">
          <div className="opsCardHead">
            <h2>Providers</h2>
            <span className="opsStatus" data-ok={aiFlowSummary.blocked === 0}>
              {aiFlowSummary.blocked === 0 ? "All flows routable" : `${aiFlowSummary.blocked} blocked`}
            </span>
          </div>
          <div className="flowList">
            {aiFlowSummary.flows.map((flow) => {
              const config = aiFlowConfigs.find((candidate) => candidate.flowId === flow.flowId);
              if (!config) return null;
              return (
                <div className="flowRow" key={flow.flowId}>
                  <div className="flowRowHead">
                    <strong>{flow.label}</strong>
                    <span className="opsStatus" data-ok={flow.readyForLiveCalls}>
                      {flow.readyForLiveCalls ? "Ready" : "Needs credentials"}
                    </span>
                  </div>
                  <div className="flowControls">
                    <label>
                      Provider
                      <select
                        onChange={(event) => updateFlow(flow.flowId, { primaryAdapterId: event.target.value })}
                        value={config.primaryAdapterId}
                      >
                        {flow.allowedAdapterIds.map((adapterId) => (
                          <option key={adapterId} value={adapterId}>
                            {adapterLabel(adapterId)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Fallback
                      <select
                        onChange={(event) => updateFlow(flow.flowId, { fallbackAdapterId: event.target.value })}
                        value={config.fallbackAdapterId}
                      >
                        {flow.allowedAdapterIds.map((adapterId) => (
                          <option key={adapterId} value={adapterId}>
                            {adapterLabel(adapterId)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Monthly limit ($)
                      <input
                        inputMode="decimal"
                        onChange={(event) => {
                          const dollars = Number.parseFloat(event.target.value);
                          if (!Number.isNaN(dollars) && dollars >= 0) {
                            updateFlow(flow.flowId, { monthlyBudgetCents: Math.round(dollars * 100) });
                          }
                        }}
                        defaultValue={(config.monthlyBudgetCents / 100).toFixed(2)}
                      />
                    </label>
                  </div>
                  {flow.blockedReasons.length > 0 ? (
                    <small className="flowBlocked">{flow.blockedReasons[0]}</small>
                  ) : null}
                </div>
              );
            })}
          </div>
          <small className="opsFoot">
            Only adapters allowed for each flow are listed — the full provider catalog stays in the audit view.
          </small>
        </section>
      </div>

      {auditOpen ? <div className="opsAudit reveal">{fullAudit}</div> : null}
    </section>
  );
}

function aiGenerationJobStatusLabel(status: AiGenerationJobEvidence["status"]): string {
  const labels: Record<AiGenerationJobEvidence["status"], string> = {
    "copy-only": "Copy only",
    partial: "Partial",
    succeeded: "Generated"
  };
  return labels[status];
}

function formatJobTime(createdAtIso: string): string {
  const date = new Date(createdAtIso);
  if (Number.isNaN(date.getTime())) return createdAtIso;
  return date.toLocaleString();
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function mergeBucketPayload(current: BucketViewerPayload | null, next: BucketViewerPayload, append: boolean): BucketViewerPayload {
  if (!append || !current?.objects?.length) return next;
  const objects = [...current.objects, ...(next.objects ?? [])];
  return {
    ...next,
    objectCount: objects.length,
    objects
  };
}
