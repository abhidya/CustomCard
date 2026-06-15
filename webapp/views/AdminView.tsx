import { Activity, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, FileJson, Image, Info, RefreshCw, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AiFlowAdminConfig, AiFlowConfigSummary } from "../../src/aiFlowConfig";
import type { AiGenerationJobEvidence } from "../../src/aiGenerationJobs";
import { fetchBrowser, requestBrowserJson } from "../../src/browserRequestAdapter";
import { resolveCardGenerationEndpoint } from "../../src/browserGatePolicy";
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

interface BucketRenderPacketGroup {
  projectId: string;
  renderPacketId: string;
  objectPrefix: string;
  objectCount: number;
  byteLength: number;
  lastModifiedIso?: string;
  artifacts: BucketObject[];
  panelImages: BucketObject[];
  promptArtifacts: BucketObject[];
  manifestArtifact?: BucketObject | null;
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
  limit?: number;
  sort?: BucketSort;
  order?: BucketOrder;
  objectCount?: number;
  truncated?: boolean;
  nextCursor?: string | null;
  objects?: BucketObject[];
  renderPackets?: BucketRenderPacketGroup[];
  blockers?: string[];
}

interface BucketJsonPreview {
  status: "loading" | "ready" | "empty" | "failed";
  text?: string;
  data?: unknown;
  message?: string;
}

type BucketSort = "lastModified" | "key";
type BucketOrder = "asc" | "desc";

const defaultBucketPageSize = 5;

function buildProbeTargets(): ProbeTarget[] {
  const { legacyBaseUrl: cardGenUrl } = resolveCardGenerationEndpoint(import.meta.env);
  return [
    { id: "web", name: "Web app", url: "/?probe=1" },
    { id: "api", name: "API health", url: "/api/health" },
    ...(cardGenUrl ? [{ id: "cardgen", name: "AI card generation", url: cardGenUrl }] : [])
  ];
}

async function probe(url: string): Promise<ProbeResult> {
  const start = performance.now();
  try {
    const response = await fetchBrowser(url, { cache: "no-store" });
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
  const [bucketSort, setBucketSort] = useState<BucketSort>("lastModified");
  const [bucketOrder, setBucketOrder] = useState<BucketOrder>("desc");
  const [bucketPageSize, setBucketPageSize] = useState(defaultBucketPageSize);
  const [bucketPageIndex, setBucketPageIndex] = useState(0);
  const [bucketCursorHistory, setBucketCursorHistory] = useState<string[]>([""]);
  const [bucketPayload, setBucketPayload] = useState<BucketViewerPayload | null>(null);
  const [bucketLoading, setBucketLoading] = useState(false);
  const [bucketError, setBucketError] = useState("");
  const [bucketJsonPreviews, setBucketJsonPreviews] = useState<Record<string, BucketJsonPreview>>({});

  const loadBucketObjects = useCallback((cursor = "", pageIndex = 0, cursorHistory: string[] = [""]) => {
    const params = new URLSearchParams({
      prefix: bucketPrefix,
      limit: String(bucketPageSize),
      sort: bucketSort,
      order: bucketOrder
    });
    if (cursor) params.set("cursor", cursor);
    setBucketLoading(true);
    setBucketError("");
    requestBrowserJson<BucketViewerPayload & { status?: string }>(`/api/admin/artifacts/bucket?${params.toString()}`, {
      cache: "no-store",
      getToken: getAdminApiToken
    })
      .then(({ payload, response }) => {
        if (!response.ok) throw new Error(payload?.status || `Bucket viewer returned HTTP ${response.status}`);
        setBucketPayload(payload as BucketViewerPayload);
        setBucketPageIndex(pageIndex);
        setBucketCursorHistory(cursorHistory);
      })
      .catch((error: unknown) => {
        if (pageIndex === 0) setBucketPayload(null);
        setBucketError(error instanceof Error ? error.message : "Bucket viewer is unavailable.");
      })
      .finally(() => setBucketLoading(false));
  }, [bucketOrder, bucketPageSize, bucketPrefix, bucketSort, getAdminApiToken]);

  useEffect(() => {
    loadBucketObjects("", 0, [""]);
  }, [loadBucketObjects]);

  const renderPacketGroups = useMemo(
    () => sortBucketRenderPacketGroups(
      bucketPayload?.renderPackets?.length ? bucketPayload.renderPackets : groupBucketObjects(bucketPayload?.objects ?? []),
      bucketSort,
      bucketOrder
    ),
    [bucketOrder, bucketPayload, bucketSort]
  );
  const sortedBucketObjects = useMemo(
    () => sortBucketObjects(bucketPayload?.objects ?? [], bucketSort, bucketOrder),
    [bucketOrder, bucketPayload?.objects, bucketSort]
  );
  const bucketSortLabel = bucketSort === "lastModified"
    ? bucketOrder === "desc" ? "newest first" : "oldest first"
    : bucketOrder === "desc" ? "key Z-A" : "key A-Z";
  const bucketPageHasPrevious = bucketPageIndex > 0;
  const bucketPageHasNext = Boolean(bucketPayload?.truncated && bucketPayload.nextCursor);
  const bucketPageObjectCount = bucketPayload?.objectCount ?? 0;
  const bucketPageRangeStart = bucketPageObjectCount > 0 ? bucketPageIndex * bucketPageSize + 1 : 0;
  const bucketPageRangeEnd = bucketPageIndex * bucketPageSize + bucketPageObjectCount;

  const loadPreviousBucketPage = useCallback(() => {
    const previousIndex = Math.max(0, bucketPageIndex - 1);
    loadBucketObjects(bucketCursorHistory[previousIndex] ?? "", previousIndex, bucketCursorHistory);
  }, [bucketCursorHistory, bucketPageIndex, loadBucketObjects]);

  const loadNextBucketPage = useCallback(() => {
    const nextCursor = bucketPayload?.nextCursor;
    if (!nextCursor) return;
    const nextIndex = bucketPageIndex + 1;
    const nextHistory = [...bucketCursorHistory.slice(0, nextIndex), nextCursor];
    loadBucketObjects(nextCursor, nextIndex, nextHistory);
  }, [bucketCursorHistory, bucketPageIndex, bucketPayload?.nextCursor, loadBucketObjects]);

  const loadBucketJsonPreview = useCallback((artifact: BucketObject) => {
    const url = artifact.signedDownload?.url;
    if (!url) return;
    setBucketJsonPreviews((current) => ({
      ...current,
      [artifact.objectKey]: current[artifact.objectKey] ?? { status: "loading" }
    }));
    void fetchBrowser(url, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (!text.trim()) {
          setBucketJsonPreviews((current) => ({ ...current, [artifact.objectKey]: { status: "empty" } }));
          return;
        }
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          data = undefined;
        }
        setBucketJsonPreviews((current) => ({
          ...current,
          [artifact.objectKey]: {
            status: "ready",
            text: data ? JSON.stringify(data, null, 2) : text.slice(0, 12_000),
            data
          }
        }));
      })
      .catch((error: unknown) => {
        setBucketJsonPreviews((current) => ({
          ...current,
          [artifact.objectKey]: {
            status: "failed",
            message: error instanceof Error ? error.message : "Preview unavailable"
          }
        }));
      });
  }, []);

  useEffect(() => {
    const artifacts = renderPacketGroups
      .flatMap((group) => group.promptArtifacts)
      .filter((artifact) => artifact.signedDownload?.url)
      .slice(0, 8);
    for (const artifact of artifacts) {
      if (!bucketJsonPreviews[artifact.objectKey]) loadBucketJsonPreview(artifact);
    }
  }, [bucketJsonPreviews, loadBucketJsonPreview, renderPacketGroups]);

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
              {apiResult === "running" || apiResult === undefined ? "Checking" : serviceUp ? "Live" : "Check API"}
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
                      : `${result.ms} ms${result.ok ? "" : result.status ? ` · HTTP ${result.status}` : " · unavailable"}`}
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
              {bucketLoading ? "Loading" : bucketPayload?.objectStore?.configured ? "Configured" : "Not configured"}
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
            <label>
              Sort
              <select
                onChange={(event) => {
                  const [sort, order] = event.target.value.split(":") as [BucketSort, BucketOrder];
                  setBucketSort(sort);
                  setBucketOrder(order);
                }}
                value={`${bucketSort}:${bucketOrder}`}
              >
                <option value="lastModified:desc">Newest</option>
                <option value="lastModified:asc">Oldest</option>
                <option value="key:asc">Key A-Z</option>
                <option value="key:desc">Key Z-A</option>
              </select>
            </label>
            <label>
              Page size
              <select
                onChange={(event) => setBucketPageSize(Number.parseInt(event.target.value, 10) || defaultBucketPageSize)}
                value={String(bucketPageSize)}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
            </label>
            <button className="btn btn-ghost btn-sm" onClick={() => loadBucketObjects()} type="button">
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          <ul className="opsFacts opsFacts-five">
            <li>
              <span>Provider</span>
              <strong>{bucketPayload?.objectStore?.provider ?? "Unknown"}</strong>
            </li>
            <li>
              <span>Bucket</span>
              <strong>{bucketPayload?.objectStore?.bucket ?? "Not configured"}</strong>
            </li>
            <li>
              <span>Page objects</span>
              <strong>{bucketPayload?.objectCount ?? 0}{bucketPayload?.truncated ? "+" : ""}</strong>
            </li>
            <li>
              <span>Render packets</span>
              <strong>{renderPacketGroups.length}{bucketPayload?.truncated ? "+" : ""}</strong>
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

          {bucketPayload ? (
            <div className="opsBucketPagination" aria-label="Bucket pagination">
              <button
                className="btn btn-ghost btn-sm"
                disabled={!bucketPageHasPrevious || bucketLoading}
                onClick={loadPreviousBucketPage}
                type="button"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <span>
                Page {bucketPageIndex + 1}
                {bucketPageObjectCount > 0 ? ` · ${bucketPageRangeStart}-${bucketPageRangeEnd}` : ""}
                {` · ${bucketPageSize} per page · ${bucketSortLabel}`}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={!bucketPageHasNext || bucketLoading}
                onClick={loadNextBucketPage}
                type="button"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          ) : null}

          {renderPacketGroups.length ? (
            <div className="opsBucketPackets" aria-label="Object-store render packets">
              {renderPacketGroups.map((group) => (
                <BucketRenderPacketCard group={group} jsonPreviews={bucketJsonPreviews} key={`${group.projectId}-${group.renderPacketId}`} />
              ))}
            </div>
          ) : sortedBucketObjects.length ? (
            <BucketRawObjectList objects={sortedBucketObjects} />
          ) : !bucketLoading && !bucketError ? (
            <div className="opsEmpty">
              <Info size={16} />
              <span>No bucket objects found for this prefix.</span>
            </div>
          ) : null}
          {bucketPayload?.objects?.length && renderPacketGroups.length ? (
            <details className="opsBucketRaw">
              <summary>Raw object list</summary>
              <BucketRawObjectList objects={sortedBucketObjects} />
            </details>
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
              {aiFlowSummary.blocked === 0 ? "All flows routable" : `${aiFlowSummary.blocked} in fallback`}
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
                      {flow.readyForLiveCalls ? "Ready" : "Local fallback"}
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
                    <small className="flowBlocked">Setup note: {flow.blockedReasons[0]}</small>
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

function BucketRenderPacketCard({
  group,
  jsonPreviews
}: {
  group: BucketRenderPacketGroup;
  jsonPreviews: Record<string, BucketJsonPreview>;
}) {
  const promptArtifacts = group.promptArtifacts.filter((artifact) => artifact.contentType.includes("json") || artifact.fileName.endsWith(".json"));
  const otherArtifacts = group.artifacts.filter((artifact) => !promptArtifacts.some((prompt) => prompt.objectKey === artifact.objectKey));
  return (
    <article className="opsBucketPacket">
      <div className="opsBucketPacketHead">
        <div>
          <strong>{group.renderPacketId}</strong>
          <span>{group.projectId}</span>
          <span>{group.objectPrefix}</span>
        </div>
        <div className="opsBucketMeta">
          <span>{group.objectCount} files</span>
          <span>{formatBytes(group.byteLength)}</span>
          {group.lastModifiedIso ? <span>{formatJobTime(group.lastModifiedIso)}</span> : null}
        </div>
      </div>

      {group.panelImages.length ? (
        <div className="opsBucketThumbs" aria-label={`${group.renderPacketId} panel artifacts`}>
          {group.panelImages.slice(0, 8).map((artifact) => {
            const preview = artifact.signedDownload?.url && artifact.contentType.startsWith("image/") ? (
              <img alt={`${artifact.fileName} preview`} src={artifact.signedDownload.url} />
            ) : (
              <span aria-hidden="true">
                <Image size={16} />
              </span>
            );
            const label = <em>{shortPanelFileName(artifact.fileName)}</em>;
            return artifact.signedDownload?.url ? (
              <a href={artifact.signedDownload.url} key={artifact.objectKey} rel="noreferrer" target="_blank">
                {preview}
                {label}
              </a>
            ) : (
              <div key={artifact.objectKey}>
                {preview}
                {label}
              </div>
            );
          })}
        </div>
      ) : null}

      <details className="opsPromptDetails" open={promptArtifacts.length > 0}>
        <summary>
          <FileJson size={14} />
          Inputs and prompts ({promptArtifacts.length})
        </summary>
        {promptArtifacts.length ? (
          <div className="opsPromptList">
            {promptArtifacts.map((artifact) => (
              <section className="opsPromptArtifact" key={artifact.objectKey}>
                <div className="opsPromptArtifactHead">
                  <strong>{promptArtifactLabel(artifact.fileName)}</strong>
                  <div className="opsBucketMeta">
                    <span>{artifact.fileName}</span>
                    <span>{formatBytes(artifact.byteLength)}</span>
                    {artifact.signedDownload?.url ? (
                      <a href={artifact.signedDownload.url} rel="noreferrer" target="_blank">
                        Open signed
                        <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </div>
                </div>
                <BucketJsonPreviewPane artifact={artifact} preview={jsonPreviews[artifact.objectKey]} />
              </section>
            ))}
          </div>
        ) : (
          <div className="opsEmpty">
            <Info size={16} />
            <span>No prompt JSON found in this page of bucket results.</span>
          </div>
        )}
      </details>

      {otherArtifacts.length ? (
        <details className="opsBucketRaw">
          <summary>Files in packet</summary>
          <BucketRawObjectList objects={group.artifacts} />
        </details>
      ) : null}
    </article>
  );
}

function BucketJsonPreviewPane({ artifact, preview }: { artifact: BucketObject; preview?: BucketJsonPreview }) {
  if (!artifact.signedDownload?.url) {
    return <p className="opsFoot">Signed preview is not available for this JSON artifact.</p>;
  }
  if (!preview || preview.status === "loading") return <p className="opsFoot">Loading JSON preview...</p>;
  if (preview.status === "empty") return <p className="opsFoot">JSON artifact is empty.</p>;
  if (preview.status === "failed") return <p className="opsFoot">Preview unavailable{preview.message ? `: ${preview.message}` : ""}.</p>;

  const sections = buildPromptPreviewSections(artifact.fileName, preview.data);
  return (
    <div className="opsPromptPreview">
      {sections.length ? (
        sections.map((section) => (
          <section className="opsPromptBlock" key={section.title}>
            <strong>{section.title}</strong>
            {section.rows?.length ? (
              <dl>
                {section.rows.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {section.prompts?.length ? (
              <div className="opsPromptPanels">
                {section.prompts.map((prompt) => (
                  <article key={`${section.title}-${prompt.panelId}`}>
                    <strong>{panelLabel(prompt.panelId)}</strong>
                    {prompt.headline ? <span>{prompt.headline}</span> : null}
                    {prompt.body ? <p>{prompt.body}</p> : null}
                    {prompt.prompt ? <pre>{prompt.prompt}</pre> : null}
                    {prompt.revisedPrompt ? <pre>{prompt.revisedPrompt}</pre> : null}
                    {prompt.negativePrompt ? <pre>{prompt.negativePrompt}</pre> : null}
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ))
      ) : null}
      <details>
        <summary>Raw JSON</summary>
        <pre>{preview.text}</pre>
      </details>
    </div>
  );
}

function BucketRawObjectList({ objects }: { objects: BucketObject[] }) {
  return (
    <div className="opsBucketList" aria-label="Object-store bucket objects">
      {objects.map((object) => (
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
  );
}

type PromptPreviewSection = {
  title: string;
  rows?: Array<[string, string]>;
  prompts?: Array<{
    panelId: string;
    headline?: string;
    body?: string;
    prompt?: string;
    revisedPrompt?: string;
    negativePrompt?: string;
  }>;
};

function buildPromptPreviewSections(fileName: string, data: unknown): PromptPreviewSection[] {
  const record = asRecord(data);
  if (!record) return [];
  if (fileName === "persisted-effective-prompts.json") {
    const requestBody = asRecord(record.requestBody);
    const rows = requestBody
      ? compactRows([
          ["Recipient", jsonText(requestBody.recipient)],
          ["Sender", jsonText(requestBody.sender)],
          ["Relationship", jsonText(requestBody.relationship)],
          ["Occasion", jsonText(requestBody.occasion)],
          ["Tone", jsonText(requestBody.tone)],
          ["Style", jsonText(requestBody.style)],
          ["Language", jsonText(requestBody.language)],
          ["Personal note", jsonText(requestBody.personal_note ?? requestBody.personalNote)],
          ["Memory notes", jsonStringList(requestBody.memory_notes ?? requestBody.memoryNotes).join(" | ")]
        ])
      : [];
    const panelPrompts = jsonArray(record.panelPrompts)
      .map((prompt) => asRecord(prompt))
      .filter(Boolean)
      .map((prompt) => ({
        panelId: jsonText(prompt?.panelId ?? prompt?.panel_id) || "panel",
        prompt: jsonText(prompt?.prompt)
      }));
    return [
      ...(rows.length ? [{ title: "Input used", rows }] : []),
      ...(panelPrompts.length ? [{ title: "Prompts sent", prompts: panelPrompts }] : [])
    ];
  }

  if (fileName === "persisted-customcard-ai-output.json") {
    const cardCopy = asRecord(record.card_copy ?? record.cardCopy);
    const themeGuide = asRecord(cardCopy?.theme_guide ?? cardCopy?.themeGuide);
    const themeRows = themeGuide
      ? compactRows([
          ["Theme", jsonText(themeGuide.theme_title ?? themeGuide.themeTitle)],
          ["Palette", jsonStringList(themeGuide.palette).join(", ")],
          ["Motifs", jsonStringList(themeGuide.motifs).join(", ")]
        ])
      : [];
    const panels = jsonArray(cardCopy?.panels)
      .map((panel) => asRecord(panel))
      .filter(Boolean)
      .map((panel) => ({
        panelId: jsonText(panel?.id) || "panel",
        headline: jsonText(panel?.headline),
        body: jsonText(panel?.body),
        prompt: jsonText(panel?.image_prompt ?? panel?.imagePrompt),
        negativePrompt: jsonText(panel?.image_negative_prompt ?? panel?.imageNegativePrompt)
      }));
    const generatedPrompts = jsonArray(record.images)
      .map((image) => asRecord(image))
      .filter(Boolean)
      .map((image) => ({
        panelId: jsonText(image?.panel_id ?? image?.panelId) || "panel",
        revisedPrompt: jsonText(image?.revised_prompt ?? image?.revisedPrompt)
      }))
      .filter((image) => image.revisedPrompt);
    return [
      ...(themeRows.length ? [{ title: "Generated theme", rows: themeRows }] : []),
      ...(panels.length ? [{ title: "Generated copy and image prompts", prompts: panels }] : []),
      ...(generatedPrompts.length ? [{ title: "Generated prompts returned", prompts: generatedPrompts }] : [])
    ];
  }

  return [];
}

function groupBucketObjects(objects: BucketObject[]): BucketRenderPacketGroup[] {
  const groups = new Map<string, BucketRenderPacketGroup>();
  for (const object of objects) {
    const match = object.objectKey.match(/^projects\/([^/]+)\/render-packets\/([^/]+)\//);
    if (!match) continue;
    const projectId = object.metadata?.projectId ?? object.metadata?.projectid ?? match[1];
    const renderPacketId = object.metadata?.renderPacketId ?? object.metadata?.renderpacketid ?? match[2];
    const key = `${projectId}/${renderPacketId}`;
    const group = groups.get(key) ?? {
      projectId,
      renderPacketId,
      objectPrefix: `projects/${projectId}/render-packets/${renderPacketId}/`,
      objectCount: 0,
      byteLength: 0,
      lastModifiedIso: "",
      artifacts: [],
      panelImages: [],
      promptArtifacts: [],
      manifestArtifact: null
    };
    group.objectCount += 1;
    group.byteLength += object.byteLength;
    group.lastModifiedIso = latestIso(group.lastModifiedIso, object.lastModifiedIso);
    group.artifacts.push(object);
    if (isPromptArtifact(object)) group.promptArtifacts.push(object);
    if (isPanelArtifact(object)) group.panelImages.push(object);
    if (object.fileName === "artifact-handoff-manifest.json") group.manifestArtifact = object;
    groups.set(key, group);
  }
  return Array.from(groups.values()).sort((first, second) => (second.lastModifiedIso ?? "").localeCompare(first.lastModifiedIso ?? ""));
}

function sortBucketRenderPacketGroups(groups: BucketRenderPacketGroup[], sort: BucketSort, order: BucketOrder): BucketRenderPacketGroup[] {
  return [...groups].sort((first, second) => compareBucketDisplayItems(
    { key: first.objectPrefix, lastModifiedIso: first.lastModifiedIso },
    { key: second.objectPrefix, lastModifiedIso: second.lastModifiedIso },
    sort,
    order
  ));
}

function sortBucketObjects(objects: BucketObject[], sort: BucketSort, order: BucketOrder): BucketObject[] {
  return [...objects].sort((first, second) => compareBucketDisplayItems(
    { key: first.objectKey, lastModifiedIso: first.lastModifiedIso },
    { key: second.objectKey, lastModifiedIso: second.lastModifiedIso },
    sort,
    order
  ));
}

function compareBucketDisplayItems(
  first: { key: string; lastModifiedIso?: string },
  second: { key: string; lastModifiedIso?: string },
  sort: BucketSort,
  order: BucketOrder
): number {
  const compared = sort === "lastModified"
    ? (first.lastModifiedIso ?? "").localeCompare(second.lastModifiedIso ?? "") || first.key.localeCompare(second.key)
    : first.key.localeCompare(second.key);
  return order === "desc" ? -compared : compared;
}

function isPromptArtifact(object: BucketObject): boolean {
  return object.fileName.endsWith(".json") && object.fileName !== "artifact-handoff-manifest.json";
}

function isPanelArtifact(object: BucketObject): boolean {
  const kind = object.metadata?.kind ?? "";
  return object.contentType.startsWith("image/") || kind === "panel-svg" || object.fileName.startsWith("provider-") || object.fileName.startsWith("preview-");
}

function promptArtifactLabel(fileName: string): string {
  if (fileName === "persisted-customcard-ai-output.json") return "Generated output";
  if (fileName === "persisted-effective-prompts.json") return "Inputs and prompts used";
  return fileName;
}

function shortPanelFileName(fileName: string): string {
  return fileName.replace(/^provider-/, "").replace(/^preview-/, "").replace(/\.(png|jpg|jpeg|webp|svg)$/i, "");
}

function panelLabel(panelId: string): string {
  return panelId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function jsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function jsonText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

function jsonStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => jsonText(item)).filter(Boolean) : [];
}

function compactRows(rows: Array<[string, string]>): Array<[string, string]> {
  return rows.filter(([, value]) => value.trim().length > 0);
}

function latestIso(first = "", second = ""): string {
  if (!first) return second || "";
  if (!second) return first;
  return second.localeCompare(first) > 0 ? second : first;
}
