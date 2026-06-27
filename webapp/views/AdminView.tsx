import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileJson,
  FlaskConical,
  Image,
  Info,
  Play,
  RefreshCw,
  Save,
  ShieldAlert,
  Users,
  WandSparkles
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AiFlowAdminConfig, AiFlowConfigSummary } from "../../src/aiFlowConfig";
import {
  adminAiFlowConfigsRoute,
  type AdminAiFlowConfigPayload
} from "../../src/adminRuntimeConfigData.mjs";
import type { AiGenerationJobEvidence } from "../../src/aiGenerationJobs";
import { buildBrowserIdempotencyKey, fetchBrowser, requestBrowserJson } from "../../src/browserRequestAdapter";
import { resolveCardGenerationEndpoint } from "../../src/browserGatePolicy";
import { providerCatalog } from "../../src/providerCatalog";
import { normalizeBrowserImageUrl } from "../browserImageUrl";
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

type SafetyVendorMode = "disabled_until_certified" | "sandbox" | "production";

interface AdminSafetyControlsPayload {
  service?: string;
  status?: string;
  realOrdersEnabled?: boolean;
  vendorModes?: Record<string, SafetyVendorMode>;
  vendorCertification?: Record<string, boolean>;
  productionMutationAcknowledged?: boolean;
  liveWriteAcknowledged?: boolean;
  updatedAtIso?: string | null;
  updatedBy?: string | null;
  allowedVendorModes?: SafetyVendorMode[];
  blockers?: string[];
}

interface ModelBenchmarkCandidate {
  id: string;
  label: string;
  adapterId: string;
  model?: string;
  configured?: boolean;
}

interface ModelBenchmarkStory {
  id: string;
  customerType: string;
  occasion: string;
  brief: string;
}

interface ModelBenchmarkCatalogPayload {
  service?: string;
  status?: string;
  phases?: string[];
  stories?: ModelBenchmarkStory[];
  textCandidates?: ModelBenchmarkCandidate[];
  imageCandidates?: ModelBenchmarkCandidate[];
  recentRuns?: Array<{ runDir?: string; storyId?: string; textCandidateId?: string; imageCandidateId?: string }>;
  liveRunsAllowed?: boolean;
  liveRunGate?: string;
  evidenceRoot?: string;
}

interface ModelBenchmarkRunPayload {
  service?: string;
  status?: string;
  dryRun?: boolean;
  phase?: string;
  outputDir?: string;
  summaryPath?: string | null;
  error?: string;
}

interface LocalAiLoopPayload {
  service?: string;
  status?: string;
  mode?: LocalAiLoopMode;
  dryRun?: boolean;
  write?: boolean;
  runWorker?: boolean;
  localOnly?: {
    llmBaseUrl?: string;
    llmModel?: string;
    comfyUrl?: string;
    comfyCheckpoint?: string;
    textAdapterId?: string;
    imageAdapterId?: string;
  };
  blockers?: string[];
  jobs?: Array<{
    id: string;
    routeId: string;
    storyId: string;
    status: string;
    body?: {
      sender?: string;
      recipient?: string;
      occasion?: string;
    };
  }>;
  queueResult?: {
    status?: string;
    inserted?: number;
    skipped?: number;
    error?: string;
  };
  workerResult?: {
    status?: string;
    reports?: Array<{
      status?: string;
      processed?: number;
      succeeded?: number;
      failed?: number;
      deadLettered?: number;
    }>;
  };
  report?: {
    jsonPath?: string;
    markdownPath?: string;
  };
  humanReview?: {
    required?: boolean;
    status?: string;
    nextSteps?: string[];
  };
  error?: string;
}

type LocalAiLoopMode = "plan" | "queue" | "queue-and-run";
type LocalAiWorkerReports = NonNullable<LocalAiLoopPayload["workerResult"]>["reports"];
type BucketSort = "lastModified" | "key";
type BucketOrder = "asc" | "desc";

const defaultBucketPageSize = 5;
const defaultBenchmarkPhase = "pipeline-quality";

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

  /* ---------- safety controls ---------- */
  const [safetyControls, setSafetyControls] = useState<AdminSafetyControlsPayload | null>(null);
  const [safetyDraft, setSafetyDraft] = useState<AdminSafetyControlsPayload | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetySaving, setSafetySaving] = useState(false);
  const [safetyError, setSafetyError] = useState("");

  const loadSafetyControls = useCallback(() => {
    setSafetyLoading(true);
    setSafetyError("");
    requestBrowserJson<AdminSafetyControlsPayload>("/api/admin/safety-controls", {
      cache: "no-store",
      getToken: getAdminApiToken
    })
      .then(({ payload, response }) => {
        if (!response.ok) throw new Error(payload?.status || `Safety controls returned HTTP ${response.status}`);
        setSafetyControls(payload ?? null);
        setSafetyDraft(payload ?? null);
      })
      .catch((error: unknown) => {
        setSafetyError(error instanceof Error ? error.message : "Safety controls are unavailable.");
      })
      .finally(() => setSafetyLoading(false));
  }, [getAdminApiToken]);

  useEffect(() => {
    loadSafetyControls();
  }, [loadSafetyControls]);

  const updateSafetyDraft = useCallback((patch: Partial<AdminSafetyControlsPayload>) => {
    setSafetyDraft((current) => ({ ...(current ?? safetyControls ?? {}), ...patch }));
  }, [safetyControls]);

  const updateSafetyVendorMode = useCallback((vendorId: string, mode: SafetyVendorMode) => {
    setSafetyDraft((current) => {
      const base = current ?? safetyControls ?? {};
      return { ...base, vendorModes: { ...(base.vendorModes ?? {}), [vendorId]: mode } };
    });
  }, [safetyControls]);

  const updateSafetyVendorCertification = useCallback((vendorId: string, certified: boolean) => {
    setSafetyDraft((current) => {
      const base = current ?? safetyControls ?? {};
      return { ...base, vendorCertification: { ...(base.vendorCertification ?? {}), [vendorId]: certified } };
    });
  }, [safetyControls]);

  const saveSafetyControls = useCallback(() => {
    setSafetySaving(true);
    setSafetyError("");
    requestBrowserJson<AdminSafetyControlsPayload>("/api/admin/safety-controls", {
      body: safetyDraft ?? {},
      getToken: getAdminApiToken,
      idempotencyKey: buildBrowserIdempotencyKey("/api/admin/safety-controls")
    })
      .then(({ payload, response }) => {
        if (!response.ok) throw new Error(payload?.status || `Safety controls save returned HTTP ${response.status}`);
        setSafetyControls(payload ?? null);
        setSafetyDraft(payload ?? null);
      })
      .catch((error: unknown) => {
        setSafetyError(error instanceof Error ? error.message : "Safety controls were not saved.");
      })
      .finally(() => setSafetySaving(false));
  }, [getAdminApiToken, safetyDraft]);

  const activeSafetyControls = safetyDraft ?? safetyControls;
  const safetyModeOptions: SafetyVendorMode[] = activeSafetyControls?.allowedVendorModes?.length
    ? activeSafetyControls.allowedVendorModes
    : ["disabled_until_certified", "sandbox", "production"];
  const walgreensMode = activeSafetyControls?.vendorModes?.walgreens ?? "disabled_until_certified";
  const walgreensCertified = Boolean(activeSafetyControls?.vendorCertification?.walgreens);
  const safetyBlockers = activeSafetyControls?.blockers ?? [];

  /* ---------- model benchmark loop ---------- */
  const [benchmarkCatalog, setBenchmarkCatalog] = useState<ModelBenchmarkCatalogPayload | null>(null);
  const [benchmarkCatalogLoading, setBenchmarkCatalogLoading] = useState(false);
  const [benchmarkCatalogError, setBenchmarkCatalogError] = useState("");
  const [benchmarkPhase, setBenchmarkPhase] = useState(defaultBenchmarkPhase);
  const [benchmarkStory, setBenchmarkStory] = useState("");
  const [benchmarkText, setBenchmarkText] = useState("");
  const [benchmarkImage, setBenchmarkImage] = useState("");
  const [benchmarkLiveRun, setBenchmarkLiveRun] = useState(false);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkRunResult, setBenchmarkRunResult] = useState<ModelBenchmarkRunPayload | null>(null);
  const [benchmarkRunError, setBenchmarkRunError] = useState("");
  const [localAiLoopMode, setLocalAiLoopMode] = useState<LocalAiLoopMode>("plan");
  const [localAiLoopStory, setLocalAiLoopStory] = useState("botanical-birthday");
  const [localAiLoopEnsureUser, setLocalAiLoopEnsureUser] = useState(true);
  const [localAiLoopRunning, setLocalAiLoopRunning] = useState(false);
  const [localAiLoopResult, setLocalAiLoopResult] = useState<LocalAiLoopPayload | null>(null);
  const [localAiLoopError, setLocalAiLoopError] = useState("");

  const loadModelBenchmarkCatalog = useCallback(() => {
    setBenchmarkCatalogLoading(true);
    setBenchmarkCatalogError("");
    requestBrowserJson<ModelBenchmarkCatalogPayload>("/api/admin/model-benchmarks", {
      cache: "no-store",
      getToken: getAdminApiToken
    })
      .then(({ payload, response }) => {
        if (!response.ok) throw new Error(payload?.status || `Model benchmark catalog returned HTTP ${response.status}`);
        setBenchmarkCatalog(payload ?? null);
      })
      .catch((error: unknown) => {
        setBenchmarkCatalog(null);
        setBenchmarkCatalogError(error instanceof Error ? error.message : "Model benchmark catalog is unavailable.");
      })
      .finally(() => setBenchmarkCatalogLoading(false));
  }, [getAdminApiToken]);

  useEffect(() => {
    loadModelBenchmarkCatalog();
  }, [loadModelBenchmarkCatalog]);

  useEffect(() => {
    const phases = benchmarkCatalog?.phases ?? [];
    const stories = benchmarkCatalog?.stories ?? [];
    const textCandidates = benchmarkCatalog?.textCandidates ?? [];
    const imageCandidates = benchmarkCatalog?.imageCandidates ?? [];
    if (phases.length && !phases.includes(benchmarkPhase)) setBenchmarkPhase(phases[0]);
    if (stories.length && !stories.some((story) => story.id === benchmarkStory)) setBenchmarkStory(stories[0].id);
    if (stories.length && !stories.some((story) => story.id === localAiLoopStory)) {
      setLocalAiLoopStory(stories.some((story) => story.id === "botanical-birthday") ? "botanical-birthday" : stories[0].id);
    }
    if (textCandidates.length && !textCandidates.some((candidate) => candidate.id === benchmarkText)) setBenchmarkText(textCandidates[0].id);
    if (imageCandidates.length && !imageCandidates.some((candidate) => candidate.id === benchmarkImage)) setBenchmarkImage(imageCandidates[0].id);
  }, [benchmarkCatalog, benchmarkImage, benchmarkPhase, benchmarkStory, benchmarkText, localAiLoopStory]);

  const runModelBenchmark = useCallback(() => {
    setBenchmarkRunning(true);
    setBenchmarkRunError("");
    requestBrowserJson<ModelBenchmarkRunPayload>("/api/admin/model-benchmarks/run", {
      body: {
        phase: benchmarkPhase,
        story: benchmarkStory,
        text: benchmarkText,
        image: benchmarkImage,
        live: benchmarkLiveRun
      },
      getToken: getAdminApiToken,
      idempotencyKey: buildBrowserIdempotencyKey("/api/admin/model-benchmarks/run")
    })
      .then(({ payload, response }) => {
        if (!response.ok) throw new Error(payload?.error || payload?.status || `Model benchmark run returned HTTP ${response.status}`);
        setBenchmarkRunResult(payload ?? null);
        loadModelBenchmarkCatalog();
      })
      .catch((error: unknown) => {
        setBenchmarkRunError(error instanceof Error ? error.message : "Model benchmark run failed.");
      })
      .finally(() => setBenchmarkRunning(false));
  }, [benchmarkImage, benchmarkLiveRun, benchmarkPhase, benchmarkStory, benchmarkText, getAdminApiToken, loadModelBenchmarkCatalog]);

  const runLocalAiLoop = useCallback(() => {
    setLocalAiLoopRunning(true);
    setLocalAiLoopError("");
    requestBrowserJson<LocalAiLoopPayload>("/api/admin/local-ai-loop/run", {
      body: {
        mode: localAiLoopMode,
        stories: localAiLoopStory,
        ensureUser: localAiLoopEnsureUser
      },
      getToken: getAdminApiToken,
      idempotencyKey: buildBrowserIdempotencyKey("/api/admin/local-ai-loop/run")
    })
      .then(({ payload, response }) => {
        if (!response.ok) throw new Error(payload?.error || payload?.queueResult?.error || payload?.status || `Local AI loop returned HTTP ${response.status}`);
        setLocalAiLoopResult(payload ?? null);
      })
      .catch((error: unknown) => {
        setLocalAiLoopError(error instanceof Error ? error.message : "Local AI loop failed.");
      })
      .finally(() => setLocalAiLoopRunning(false));
  }, [getAdminApiToken, localAiLoopEnsureUser, localAiLoopMode, localAiLoopStory]);

  /* ---------- provider policy edits ---------- */
  const [aiFlowPayload, setAiFlowPayload] = useState<AdminAiFlowConfigPayload | null>(null);
  const [aiFlowDraftConfigs, setAiFlowDraftConfigs] = useState<AiFlowAdminConfig[]>(aiFlowConfigs);
  const [aiFlowLoading, setAiFlowLoading] = useState(false);
  const [aiFlowSaving, setAiFlowSaving] = useState(false);
  const [aiFlowError, setAiFlowError] = useState("");

  const loadAiFlowConfigs = useCallback(() => {
    setAiFlowLoading(true);
    setAiFlowError("");
    requestBrowserJson<AdminAiFlowConfigPayload>(adminAiFlowConfigsRoute, {
      cache: "no-store",
      getToken: getAdminApiToken
    })
      .then(({ payload, response }) => {
        if (!response.ok) throw new Error(payload?.status || `Provider policy returned HTTP ${response.status}`);
        if (!payload?.configs?.length) throw new Error("Provider policy response did not include flow configs.");
        setAiFlowPayload(payload);
        setAiFlowDraftConfigs(payload.configs);
        onAiFlowConfigsChange(payload.configs);
      })
      .catch((error: unknown) => {
        setAiFlowError(error instanceof Error ? error.message : "Provider policy is unavailable.");
      })
      .finally(() => setAiFlowLoading(false));
  }, [getAdminApiToken, onAiFlowConfigsChange]);

  useEffect(() => {
    loadAiFlowConfigs();
  }, [loadAiFlowConfigs]);

  const saveAiFlowConfigs = useCallback(() => {
    setAiFlowSaving(true);
    setAiFlowError("");
    requestBrowserJson<AdminAiFlowConfigPayload>(adminAiFlowConfigsRoute, {
      body: { configs: aiFlowDraftConfigs },
      getToken: getAdminApiToken,
      idempotencyKey: buildBrowserIdempotencyKey(adminAiFlowConfigsRoute)
    })
      .then(({ payload, response }) => {
        if (!response.ok) throw new Error(payload?.status || `Provider policy save returned HTTP ${response.status}`);
        if (!payload?.configs?.length) throw new Error("Provider policy save did not return flow configs.");
        setAiFlowPayload(payload);
        setAiFlowDraftConfigs(payload.configs);
        onAiFlowConfigsChange(payload.configs);
      })
      .catch((error: unknown) => {
        setAiFlowError(error instanceof Error ? error.message : "Provider policy was not saved.");
      })
      .finally(() => setAiFlowSaving(false));
  }, [aiFlowDraftConfigs, getAdminApiToken, onAiFlowConfigsChange]);

  const effectiveAiFlowSummary = aiFlowPayload?.summary ?? aiFlowSummary;
  const savedAiFlowConfigs = aiFlowPayload?.configs ?? aiFlowConfigs;
  const aiFlowDirty = JSON.stringify(aiFlowDraftConfigs) !== JSON.stringify(savedAiFlowConfigs);

  function updateFlow(flowId: AiFlowAdminConfig["flowId"], patch: Partial<AiFlowAdminConfig>) {
    setAiFlowDraftConfigs((current) =>
      current.map((config) => (config.flowId === flowId ? { ...config, ...patch } : config))
    );
  }

  function updateFlowNumber(
    flowId: AiFlowAdminConfig["flowId"],
    key: keyof Pick<
      AiFlowAdminConfig,
      "maxRetries" | "maxTokens" | "monthlyBudgetCents" | "perRequestBudgetCents" | "rateLimitPerMinute" | "temperature"
    >,
    rawValue: string,
    options: { min?: number; scale?: number } = {}
  ) {
    const parsed = Number.parseFloat(rawValue);
    const min = options.min ?? 0;
    if (!Number.isFinite(parsed) || parsed < min) return;
    const scaled = parsed * (options.scale ?? 1);
    const normalized = key === "temperature" && !options.scale ? Number(parsed.toFixed(2)) : Math.round(scaled);
    updateFlow(flowId, { [key]: normalized } as Partial<AiFlowAdminConfig>);
  }

  /* ---------- full audit ---------- */
  const [auditOpen, setAuditOpen] = useState(false);
  const latestAiJobs = aiGenerationJobs.slice(0, 3);
  const latestAiJob = latestAiJobs[0];
  const generatedPanels = aiGenerationJobs.reduce((total, job) => total + job.imageCount, 0);
  const aiQueueLanes = buildAiQueueLanes(aiGenerationJobs);
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
    const url = normalizeBrowserImageUrl(artifact.signedDownload?.url);
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
                {effectiveAiFlowSummary.readyForLiveCalls}/{effectiveAiFlowSummary.total}
              </strong>
            </li>
            <li>
              <span>Live provider calls enabled</span>
              <strong>{effectiveAiFlowSummary.liveEnabled}</strong>
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

        {/* ---- Safety controls ---- */}
        <section className="panelcard opsCard">
          <div className="opsCardHead">
            <h2>Safety controls</h2>
            <span className="opsStatus" data-ok={Boolean(activeSafetyControls && safetyBlockers.length === 0)}>
              <ShieldAlert size={14} />
              {safetyLoading ? "Loading" : activeSafetyControls?.status === "ready" ? "Ready" : "Fail closed"}
            </span>
          </div>
          <ul className="opsFacts">
            <li>
              <span>Real orders</span>
              <strong>{activeSafetyControls?.realOrdersEnabled ? "Enabled" : "Off"}</strong>
            </li>
            <li>
              <span>Walgreens mode</span>
              <strong>{safetyModeLabel(walgreensMode)}</strong>
            </li>
            <li>
              <span>Live writes</span>
              <strong>{activeSafetyControls?.liveWriteAcknowledged ? "Acknowledged" : "Blocked"}</strong>
            </li>
          </ul>
          <div className="flowControls">
            <label>
              Walgreens
              <select
                disabled={safetyLoading || safetySaving}
                onChange={(event) => updateSafetyVendorMode("walgreens", event.target.value as SafetyVendorMode)}
                value={walgreensMode}
              >
                {safetyModeOptions.map((mode) => (
                  <option key={mode} value={mode}>
                    {safetyModeLabel(mode)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flowControls">
            <label>
              <input
                checked={Boolean(activeSafetyControls?.realOrdersEnabled)}
                disabled={safetyLoading || safetySaving}
                onChange={(event) => updateSafetyDraft({ realOrdersEnabled: event.target.checked })}
                type="checkbox"
              />
              Real order enablement
            </label>
            <label>
              <input
                checked={walgreensCertified}
                disabled={safetyLoading || safetySaving}
                onChange={(event) => updateSafetyVendorCertification("walgreens", event.target.checked)}
                type="checkbox"
              />
              Vendor certification
            </label>
            <label>
              <input
                checked={Boolean(activeSafetyControls?.productionMutationAcknowledged)}
                disabled={safetyLoading || safetySaving}
                onChange={(event) => updateSafetyDraft({ productionMutationAcknowledged: event.target.checked })}
                type="checkbox"
              />
              Production mutation acknowledgement
            </label>
            <label>
              <input
                checked={Boolean(activeSafetyControls?.liveWriteAcknowledged)}
                disabled={safetyLoading || safetySaving}
                onChange={(event) => updateSafetyDraft({ liveWriteAcknowledged: event.target.checked })}
                type="checkbox"
              />
              Explicit live-write acknowledgement
            </label>
          </div>
          {safetyError || safetyBlockers.length ? (
            <div className="opsEmpty">
              <Info size={16} />
              <span>{safetyError || safetyBlockers[0]}</span>
            </div>
          ) : null}
          <button className="btn btn-primary btn-sm" disabled={safetyLoading || safetySaving} onClick={saveSafetyControls} type="button">
            <Save size={14} />
            {safetySaving ? "Saving" : "Save controls"}
          </button>
        </section>

        {/* ---- Card gallery curation ---- */}
        <AdminCardGalleryView getAdminApiToken={getAdminApiToken} />

        {/* ---- Model benchmark loop ---- */}
        <section className="panelcard opsCard opsCard-wide">
          <div className="opsCardHead">
            <h2>Model benchmarks</h2>
            <span className="opsStatus" data-ok={Boolean(benchmarkCatalog && !benchmarkCatalogError)}>
              <FlaskConical size={14} />
              {benchmarkCatalogLoading ? "Loading" : benchmarkLiveRun ? "Live selected" : "Dry-run default"}
            </span>
          </div>
          <ul className="opsFacts opsFacts-five">
            <li>
              <span>Stories</span>
              <strong>{benchmarkCatalog?.stories?.length ?? 0}</strong>
            </li>
            <li>
              <span>Text candidates</span>
              <strong>{configuredBenchmarkCount(benchmarkCatalog?.textCandidates)}/{benchmarkCatalog?.textCandidates?.length ?? 0}</strong>
            </li>
            <li>
              <span>Image candidates</span>
              <strong>{configuredBenchmarkCount(benchmarkCatalog?.imageCandidates)}/{benchmarkCatalog?.imageCandidates?.length ?? 0}</strong>
            </li>
            <li>
              <span>Recent runs</span>
              <strong>{benchmarkCatalog?.recentRuns?.length ?? 0}</strong>
            </li>
            <li>
              <span>Evidence root</span>
              <strong>{benchmarkCatalog?.evidenceRoot ?? "docs/evidence"}</strong>
            </li>
          </ul>
          <div className="flowControls">
            <label>
              Phase
              <select onChange={(event) => setBenchmarkPhase(event.target.value)} value={benchmarkPhase}>
                {(benchmarkCatalog?.phases?.length ? benchmarkCatalog.phases : [defaultBenchmarkPhase]).map((phase) => (
                  <option key={phase} value={phase}>
                    {benchmarkPhaseLabel(phase)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Story
              <select onChange={(event) => setBenchmarkStory(event.target.value)} value={benchmarkStory}>
                {(benchmarkCatalog?.stories ?? []).map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.occasion} · {story.customerType}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Text
              <select onChange={(event) => setBenchmarkText(event.target.value)} value={benchmarkText}>
                {(benchmarkCatalog?.textCandidates ?? []).map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {benchmarkCandidateLabel(candidate)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Image
              <select onChange={(event) => setBenchmarkImage(event.target.value)} value={benchmarkImage}>
                {(benchmarkCatalog?.imageCandidates ?? []).map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {benchmarkCandidateLabel(candidate)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <input checked={benchmarkLiveRun} onChange={(event) => setBenchmarkLiveRun(event.target.checked)} type="checkbox" />
              Live provider calls
            </label>
          </div>
          {benchmarkCatalogError || benchmarkRunError ? (
            <div className="opsEmpty">
              <Info size={16} />
              <span>{benchmarkRunError || benchmarkCatalogError}</span>
            </div>
          ) : null}
          {benchmarkRunResult ? (
            <div className="opsEmpty">
              <Info size={16} />
              <span>
                {benchmarkRunResult.dryRun ? "Dry-run plan" : "Completed run"} · {benchmarkRunResult.phase ?? "benchmark"}
                {benchmarkRunResult.summaryPath ? ` · ${benchmarkRunResult.summaryPath}` : ""}
              </span>
            </div>
          ) : null}
          <div className="flowControls">
            <button className="btn btn-primary btn-sm" disabled={benchmarkRunning || benchmarkCatalogLoading} onClick={runModelBenchmark} type="button">
              {benchmarkRunning ? <RefreshCw size={14} /> : <Play size={14} />}
              {benchmarkLiveRun ? "Run live" : "Run dry"}
            </button>
            <button className="btn btn-ghost btn-sm" disabled={benchmarkCatalogLoading} onClick={loadModelBenchmarkCatalog} type="button">
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </section>

        {/* ---- Local AI admin loop ---- */}
        <section className="panelcard opsCard opsCard-wide">
          <div className="opsCardHead">
            <h2>Local AI loop</h2>
            <span className="opsStatus" data-ok={Boolean(localAiLoopResult && !localAiLoopError && localAiLoopResult.status !== "blocked")}>
              <WandSparkles size={14} />
              {localAiLoopRunning ? "Running" : localAiLoopResult?.status ? localAiLoopStatusLabel(localAiLoopResult.status) : "Admin gated"}
            </span>
          </div>
          <ul className="opsFacts opsFacts-five">
            <li>
              <span>Queue table</span>
              <strong>api_jobs</strong>
            </li>
            <li>
              <span>Text provider</span>
              <strong>{localAiLoopResult?.localOnly?.llmModel ?? "Local LLM"}</strong>
            </li>
            <li>
              <span>Image provider</span>
              <strong>{localAiLoopResult?.localOnly?.comfyCheckpoint ?? "Local ComfyUI"}</strong>
            </li>
            <li>
              <span>Jobs</span>
              <strong>{localAiLoopResult?.jobs?.length ?? 0}</strong>
            </li>
            <li>
              <span>Human review</span>
              <strong>{localAiLoopResult?.humanReview?.status ?? "required"}</strong>
            </li>
          </ul>
          <div className="flowControls">
            <label>
              Story
              <select onChange={(event) => setLocalAiLoopStory(event.target.value)} value={localAiLoopStory}>
                {(benchmarkCatalog?.stories?.length ? benchmarkCatalog.stories : [{ id: "botanical-birthday", occasion: "birthday", customerType: "returning consumer", brief: "" }]).map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mode
              <select onChange={(event) => setLocalAiLoopMode(event.target.value as LocalAiLoopMode)} value={localAiLoopMode}>
                <option value="plan">Plan only</option>
                <option value="queue">Queue</option>
                <option value="queue-and-run">Queue + run worker</option>
              </select>
            </label>
            <label>
              <input checked={localAiLoopEnsureUser} onChange={(event) => setLocalAiLoopEnsureUser(event.target.checked)} type="checkbox" />
              Ensure local admin user
            </label>
          </div>
          {localAiLoopError || localAiLoopResult?.blockers?.length ? (
            <div className="opsEmpty">
              <Info size={16} />
              <span>{localAiLoopError || localAiLoopResult?.blockers?.[0]}</span>
            </div>
          ) : null}
          {localAiLoopResult ? (
            <div className="opsLocalLoopResult">
              <div className="opsQueueBoard" aria-label="Local AI loop result">
                <article className="opsQueueLane" data-tone={localAiLoopResult.dryRun ? "idle" : "ok"}>
                  <span>Plan</span>
                  <strong>{localAiLoopResult.dryRun ? "Dry" : "Write"}</strong>
                  <small>{localAiLoopResult.report?.markdownPath ?? "Report pending"}</small>
                </article>
                <article className="opsQueueLane" data-tone={localAiLoopResult.queueResult?.status === "queued" ? "ok" : localAiLoopResult.queueResult?.status === "blocked" ? "warn" : "idle"}>
                  <span>Queue</span>
                  <strong>{localAiLoopResult.queueResult?.status ?? "Not run"}</strong>
                  <small>{localAiLoopResult.queueResult?.inserted ?? 0} inserted / {localAiLoopResult.queueResult?.skipped ?? 0} skipped</small>
                </article>
                <article className="opsQueueLane" data-tone={localAiLoopResult.workerResult?.status === "processed" ? "ok" : "idle"}>
                  <span>Worker</span>
                  <strong>{localAiLoopResult.workerResult?.status ?? "Skipped"}</strong>
                  <small>{summarizeLocalWorkerReports(localAiLoopResult.workerResult?.reports)}</small>
                </article>
              </div>
              <div className="opsJobList" aria-label="Local AI queued jobs">
                {(localAiLoopResult.jobs ?? []).map((job) => (
                  <section className="opsJob" key={job.id}>
                    <div className="opsJobHead">
                      <div>
                        <strong>{job.id}</strong>
                        <span>{job.routeId} / {job.storyId}</span>
                      </div>
                      <em>{job.status}</em>
                    </div>
                    <div className="opsJobMeta">
                      <span>{job.body?.sender ?? "sender"} to {job.body?.recipient ?? "recipient"}</span>
                      <span>{job.body?.occasion ?? "occasion"}</span>
                      <span>{localAiLoopResult.localOnly?.llmBaseUrl ?? "local LLM URL not configured"}</span>
                      <span>{localAiLoopResult.localOnly?.comfyUrl ?? "local ComfyUI URL not configured"}</span>
                    </div>
                  </section>
                ))}
              </div>
              {localAiLoopResult.humanReview?.nextSteps?.length ? (
                <ul className="opsFacts">
                  {localAiLoopResult.humanReview.nextSteps.map((step) => (
                    <li key={step}>
                      <span>Review step</span>
                      <strong>{step}</strong>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <div className="flowControls">
            <button className="btn btn-primary btn-sm" disabled={localAiLoopRunning} onClick={runLocalAiLoop} type="button">
              {localAiLoopRunning ? <RefreshCw size={14} /> : <Play size={14} />}
              {localAiLoopModeLabel(localAiLoopMode)}
            </button>
          </div>
          <small className="opsFoot">
            Uses localhost-only LM Studio/KoboldCPP and ComfyUI. Queue and worker modes require the API server to run with Postgres.
          </small>
        </section>

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

          <div className="opsQueueBoard" aria-label="AI jobs queue board">
            {aiQueueLanes.map((lane) => (
              <article className="opsQueueLane" data-tone={lane.tone} key={lane.id}>
                <span>{lane.label}</span>
                <strong>{lane.count}</strong>
                <small>{lane.detail}</small>
              </article>
            ))}
          </div>

          <div className="opsQueueFoot">
            <div>
              <span>Latest run</span>
              <strong>{latestAiJob ? aiGenerationJobStatusLabel(latestAiJob.status) : "No active generation jobs yet"}</strong>
              <small>
                {latestAiJob
                  ? `${formatJobTime(latestAiJob.createdAtIso)} · ${latestAiJob.generatedBy}`
                  : "Start a Studio draft to populate prompt, provider, and artifact evidence."}
              </small>
            </div>
            <a className="btn btn-ghost btn-sm" href="/?view=studio">
              Open Studio
            </a>
          </div>

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
                    {job.panels.map((panel) => {
                      const imageUrl = normalizeBrowserImageUrl(panel.imageUrl);
                      return (
                        <article className="opsJobPanel" key={`${job.id}-${panel.panelId}`}>
                          {imageUrl ? (
                            <img alt={`${panel.label} generated panel`} src={imageUrl} />
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
                      );
                    })}
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

        {/* ---- Provider policy ---- */}
        <section className="panelcard opsCard opsCard-wide">
          <div className="opsCardHead">
            <h2>Providers</h2>
            <span className="opsStatus" data-ok={effectiveAiFlowSummary.blocked === 0 && !aiFlowDirty}>
              {aiFlowDirty
                ? "Unsaved edits"
                : effectiveAiFlowSummary.blocked === 0
                  ? "All flows routable"
                  : `${effectiveAiFlowSummary.blocked} in fallback`}
            </span>
          </div>
          <div className="opsInlineActions">
            <button className="btn btn-secondary btn-sm" disabled={aiFlowLoading || aiFlowSaving} onClick={loadAiFlowConfigs} type="button">
              <RefreshCw size={14} />
              Reload
            </button>
            <button className="btn btn-primary btn-sm" disabled={!aiFlowDirty || aiFlowLoading || aiFlowSaving} onClick={saveAiFlowConfigs} type="button">
              <Save size={14} />
              {aiFlowSaving ? "Saving" : "Save"}
            </button>
          </div>
          {aiFlowError ? <p className="opsError">{aiFlowError}</p> : null}
          {aiFlowPayload ? (
            <small className="opsFoot">
              Server policy v{aiFlowPayload.version || 0}
              {aiFlowPayload.updatedAtIso ? ` saved ${new Date(aiFlowPayload.updatedAtIso).toLocaleString()}` : " from defaults"}
              {aiFlowPayload.updatedBy ? ` by ${aiFlowPayload.updatedBy}` : ""}.
            </small>
          ) : null}
          <div className="flowList">
            {effectiveAiFlowSummary.flows.map((flow) => {
              const config = aiFlowDraftConfigs.find((candidate) => candidate.flowId === flow.flowId);
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
                      Model
                      <input
                        onChange={(event) => updateFlow(flow.flowId, { model: event.target.value })}
                        value={config.model}
                      />
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
                      Rate/min
                      <input
                        inputMode="numeric"
                        min={1}
                        onChange={(event) => updateFlowNumber(flow.flowId, "rateLimitPerMinute", event.target.value, { min: 1 })}
                        type="number"
                        value={config.rateLimitPerMinute}
                      />
                    </label>
                    <label>
                      Request limit ($)
                      <input
                        defaultValue={(config.perRequestBudgetCents / 100).toFixed(2)}
                        inputMode="decimal"
                        min={0}
                        onBlur={(event) => updateFlowNumber(flow.flowId, "perRequestBudgetCents", event.target.value, { scale: 100 })}
                        step="0.01"
                        type="number"
                      />
                    </label>
                    <label>
                      Monthly limit ($)
                      <input
                        defaultValue={(config.monthlyBudgetCents / 100).toFixed(2)}
                        min={0}
                        inputMode="decimal"
                        onBlur={(event) => updateFlowNumber(flow.flowId, "monthlyBudgetCents", event.target.value, { scale: 100 })}
                        step="0.01"
                        type="number"
                      />
                    </label>
                  </div>
                  <div className="flowToggleRow" aria-label={`${flow.label} safety gates`}>
                    <label>
                      <input
                        checked={config.liveProviderCallsEnabled}
                        onChange={(event) => updateFlow(flow.flowId, { liveProviderCallsEnabled: event.target.checked })}
                        type="checkbox"
                      />
                      <span>Live provider</span>
                    </label>
                    <label>
                      <input
                        checked={config.queueEnabled}
                        onChange={(event) => updateFlow(flow.flowId, { queueEnabled: event.target.checked })}
                        type="checkbox"
                      />
                      <span>Queue primary</span>
                    </label>
                    <label>
                      <input
                        checked={config.fallbackQueueEnabled}
                        onChange={(event) => updateFlow(flow.flowId, { fallbackQueueEnabled: event.target.checked })}
                        type="checkbox"
                      />
                      <span>Queue fallback</span>
                    </label>
                  </div>
                  <details className="flowAdvanced">
                    <summary>Advanced policy</summary>
                    <div className="flowControls flowControls-advanced">
                      <label>
                        Max retries
                        <input
                          inputMode="numeric"
                          min={0}
                          onChange={(event) => updateFlowNumber(flow.flowId, "maxRetries", event.target.value)}
                          type="number"
                          value={config.maxRetries}
                        />
                      </label>
                      <label>
                        Max tokens
                        <input
                          inputMode="numeric"
                          min={0}
                          onChange={(event) => updateFlowNumber(flow.flowId, "maxTokens", event.target.value)}
                          type="number"
                          value={config.maxTokens}
                        />
                      </label>
                      <label>
                        Temperature
                        <input
                          inputMode="decimal"
                          max={2}
                          min={0}
                          onChange={(event) => updateFlowNumber(flow.flowId, "temperature", event.target.value)}
                          step="0.01"
                          type="number"
                          value={config.temperature}
                        />
                      </label>
                    </div>
                    <label className="flowPromptField">
                      Prompt instructions
                      <textarea
                        onChange={(event) => updateFlow(flow.flowId, { promptInstructions: event.target.value })}
                        value={config.promptInstructions}
                      />
                    </label>
                  </details>
                  <div className="flowMeta" aria-label={`${flow.label} effective provider policy`}>
                    <span>{formatCents(config.perRequestBudgetCents)} max/request</span>
                    <span>{formatCents(config.monthlyBudgetCents)} monthly</span>
                    <span>{config.rateLimitPerMinute}/min</span>
                    <span>{config.queueEnabled ? "Primary queued" : "Primary direct"}</span>
                    <span>{config.fallbackQueueEnabled ? "Fallback queued" : "Fallback direct"}</span>
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

function buildAiQueueLanes(jobs: AiGenerationJobEvidence[]) {
  const needsReview = jobs.filter((job) => job.status === "partial" || job.status === "copy-only").length;
  const generating = jobs.filter((job) => job.status === "queued").length;
  const completed = jobs.filter((job) => job.status === "succeeded").length;
  return [
    {
      id: "received",
      label: "Received",
      count: jobs.length,
      detail: jobs.length === 1 ? "1 recent browser job captured." : `${jobs.length} recent browser jobs captured.`,
      tone: jobs.length > 0 ? "ready" : "idle"
    },
    {
      id: "generating",
      label: "Generating",
      count: generating,
      detail:
        generating === 1
          ? "1 background AI job is queued or running."
          : `${generating} background AI jobs are queued or running.`,
      tone: generating > 0 ? "ready" : "idle"
    },
    {
      id: "review",
      label: "Needs review",
      count: needsReview,
      detail:
        needsReview === 1 ? "1 job needs human review." : `${needsReview} jobs need human review.`,
      tone: needsReview > 0 ? "warn" : "idle"
    },
    {
      id: "completed",
      label: "Completed",
      count: completed,
      detail: completed === 1 ? "1 generated job is complete." : `${completed} generated jobs are complete.`,
      tone: completed > 0 ? "ok" : "idle"
    }
  ];
}

function aiGenerationJobStatusLabel(status: AiGenerationJobEvidence["status"]): string {
  const labels: Record<AiGenerationJobEvidence["status"], string> = {
    "copy-only": "Copy only",
    partial: "Partial",
    queued: "Queued",
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

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function configuredBenchmarkCount(candidates: ModelBenchmarkCandidate[] | undefined): number {
  return (candidates ?? []).filter((candidate) => candidate.configured).length;
}

function benchmarkPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    smoke: "Smoke",
    full: "Full",
    "pipeline-quality": "Pipeline quality",
    typography: "Typography"
  };
  return labels[phase] ?? phase;
}

function localAiLoopModeLabel(mode: LocalAiLoopMode): string {
  const labels: Record<LocalAiLoopMode, string> = {
    plan: "Plan local loop",
    queue: "Queue local job",
    "queue-and-run": "Queue and run"
  };
  return labels[mode];
}

function localAiLoopStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    blocked: "Blocked",
    planned: "Planned",
    processed: "Processed",
    queued: "Queued"
  };
  return labels[status] ?? status;
}

function summarizeLocalWorkerReports(reports: LocalAiWorkerReports = []): string {
  if (!reports.length) return "No worker run";
  const processed = reports.reduce((total, report) => total + (report.processed ?? 0), 0);
  const succeeded = reports.reduce((total, report) => total + (report.succeeded ?? 0), 0);
  const failed = reports.reduce((total, report) => total + (report.failed ?? 0) + (report.deadLettered ?? 0), 0);
  return `${processed} processed / ${succeeded} succeeded / ${failed} failed`;
}

function benchmarkCandidateLabel(candidate: ModelBenchmarkCandidate): string {
  const model = candidate.model ? ` · ${candidate.model}` : "";
  const missing = candidate.configured ? "" : " · missing env";
  return `${candidate.label}${model}${missing}`;
}

function safetyModeLabel(mode: SafetyVendorMode): string {
  const labels: Record<SafetyVendorMode, string> = {
    disabled_until_certified: "Disabled until certified",
    sandbox: "Sandbox",
    production: "Production"
  };
  return labels[mode] ?? mode;
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
            const signedUrl = normalizeBrowserImageUrl(artifact.signedDownload?.url);
            const preview = signedUrl && artifact.contentType.startsWith("image/") ? (
              <img alt={`${artifact.fileName} preview`} src={signedUrl} />
            ) : (
              <span aria-hidden="true">
                <Image size={16} />
              </span>
            );
            const label = <em>{shortPanelFileName(artifact.fileName)}</em>;
            return signedUrl ? (
              <a href={signedUrl} key={artifact.objectKey} rel="noreferrer" target="_blank">
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
            {promptArtifacts.map((artifact) => {
              const signedUrl = normalizeBrowserImageUrl(artifact.signedDownload?.url);
              return (
                <section className="opsPromptArtifact" key={artifact.objectKey}>
                  <div className="opsPromptArtifactHead">
                    <strong>{promptArtifactLabel(artifact.fileName)}</strong>
                    <div className="opsBucketMeta">
                      <span>{artifact.fileName}</span>
                      <span>{formatBytes(artifact.byteLength)}</span>
                      {signedUrl ? (
                        <a href={signedUrl} rel="noreferrer" target="_blank">
                          Open signed
                          <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <BucketJsonPreviewPane artifact={artifact} preview={jsonPreviews[artifact.objectKey]} />
                </section>
              );
            })}
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
      {objects.map((object) => {
        const signedUrl = normalizeBrowserImageUrl(object.signedDownload?.url);
        return (
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
              {signedUrl ? (
                <a href={signedUrl} rel="noreferrer" target="_blank">
                  Open signed
                  <ExternalLink size={12} />
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
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
