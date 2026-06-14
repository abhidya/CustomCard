import { benchmarkResultRecords } from "./benchmarkResultsData";

export type BenchmarkPhase = "pipeline-quality" | "typography" | "smoke" | "full";
export type BenchmarkStatus = "succeeded" | "failed" | "partial" | "blocked";
export type BenchmarkGradeStatus = "manual" | "needs-manual-grade" | "failure" | "ai-only";

export interface BenchmarkEvidenceLinks {
  outputDir: string;
  summaryPath: string;
  providerHttpPath?: string;
  runDir?: string;
  manualGradePath?: string;
  contactSheetPath?: string;
  previewPaths: string[];
  promptPaths: string[];
  payloadPaths: string[];
  failurePaths: string[];
}

export interface BenchmarkResultRecord {
  id: string;
  runId: string;
  createdAtIso: string;
  phase: BenchmarkPhase;
  storyId: string;
  status: BenchmarkStatus;
  statusCode?: number;
  textCandidateId: string;
  textProvider: string;
  textModel: string;
  imageCandidateId: string;
  imageProvider: string;
  imageModel: string;
  panelCount: number;
  providerCallCount: number;
  nativePanelCount: number;
  productScore?: number;
  contractScore?: number;
  tier: string;
  gradeStatus: BenchmarkGradeStatus;
  aiNotes: string[];
  humanNotes: string[];
  blockers: string[];
  evidence: BenchmarkEvidenceLinks;
}

export interface BenchmarkResultFilter {
  query?: string;
  status?: BenchmarkStatus | "all";
  phase?: BenchmarkPhase | "all";
  provider?: string | "all";
  minProductScore?: number;
}

export interface BenchmarkManualGrade {
  productScore?: number;
  contractScore?: number;
  tier?: string;
  visibleJudgment?: string;
  blockers: string[];
}

export interface BenchmarkRecommendation {
  label: string;
  status: "candidate" | "blocked";
  productScore?: number;
  contractScore?: number;
  evidencePath?: string;
  rationale: string;
  blockers: string[];
}

export interface BenchmarkResultsSummary {
  totalRuns: number;
  latestRunId: string;
  latestCreatedAtIso: string;
  gradedRuns: number;
  failedRuns: number;
  providerFailures: number;
  bestProductScore?: number;
}

export interface BenchmarkResultsModel {
  summary: BenchmarkResultsSummary;
  latestRuns: BenchmarkResultRecord[];
  records: BenchmarkResultRecord[];
  providers: string[];
  phases: BenchmarkPhase[];
  recommendation: BenchmarkRecommendation;
  remainingBlockers: string[];
}

export const benchmarkResultsModel = buildBenchmarkResultsModel(benchmarkResultRecords);

export function buildBenchmarkResultsModel(records: BenchmarkResultRecord[] = benchmarkResultRecords): BenchmarkResultsModel {
  const sorted = [...records].sort((first, second) => second.createdAtIso.localeCompare(first.createdAtIso));
  const graded = sorted.filter((record) => typeof record.productScore === "number");
  const failed = sorted.filter((record) => record.status === "failed" || record.status === "blocked");
  const providerFailures = sorted.filter((record) => record.blockers.some((blocker) => /missing|quota|credit|429|402|failure|failed/i.test(blocker))).length;
  const bestProductScore = graded.reduce<number | undefined>(
    (best, record) => (best === undefined ? record.productScore : Math.max(best, record.productScore ?? best)),
    undefined
  );
  const recommendation = buildBenchmarkRecommendation(sorted);
  const remainingBlockers = uniqueStrings([
    ...recommendation.blockers,
    ...failed.flatMap((record) => record.blockers),
    ...sorted
      .filter((record) => record.status === "succeeded" && (record.productScore ?? 0) < 80)
      .flatMap((record) => record.blockers)
  ]).slice(0, 8);

  return {
    summary: {
      totalRuns: sorted.length,
      latestRunId: sorted[0]?.runId ?? "",
      latestCreatedAtIso: sorted[0]?.createdAtIso ?? "",
      gradedRuns: graded.length,
      failedRuns: failed.length,
      providerFailures,
      bestProductScore
    },
    latestRuns: sorted.slice(0, 6),
    records: sorted,
    providers: uniqueStrings(sorted.flatMap((record) => [record.textProvider, record.imageProvider]).filter(Boolean)).sort(),
    phases: uniqueStrings(sorted.map((record) => record.phase)).sort() as BenchmarkPhase[],
    recommendation,
    remainingBlockers
  };
}

export function filterBenchmarkResults(
  records: BenchmarkResultRecord[],
  filter: BenchmarkResultFilter = {}
): BenchmarkResultRecord[] {
  const query = normalizeSearch(filter.query ?? "");
  const status = filter.status ?? "all";
  const phase = filter.phase ?? "all";
  const provider = filter.provider ?? "all";
  const minProductScore = filter.minProductScore ?? 0;

  return records.filter((record) => {
    const score = record.productScore ?? -1;
    const providerValues = [record.textProvider, record.imageProvider, record.textCandidateId, record.imageCandidateId];
    return (
      (status === "all" || record.status === status) &&
      (phase === "all" || record.phase === phase) &&
      (provider === "all" || providerValues.includes(provider)) &&
      (minProductScore <= 0 || score >= minProductScore) &&
      (!query || benchmarkSearchText(record).includes(query))
    );
  });
}

export function parseBenchmarkManualGrade(markdown: string): BenchmarkManualGrade {
  const productScore = parseScore(markdown, /product(?:_|\s+)quality(?:_|\s+)score(?:\s*\/100)?\s*[:`-]*\s*(\d{1,3})/i);
  const contractScore = parseScore(markdown, /(?:prompt\/pipeline|prompt_pipeline|pipeline)\s+contract(?:_|\s+)score(?:\s*\/100)?\s*[:`-]*\s*(\d{1,3})/i);
  const tier = matchLine(markdown, /tier[`:\s-]+([^\n]+)/i)?.replace(/^`|`$/g, "").trim();
  const visibleJudgment = sectionText(markdown, "Visible product judgment") || sectionText(markdown, "Judgment") || sectionText(markdown, "Notes");
  const blockers = [
    ...extractListAfterLabel(markdown, "Blocking failures"),
    ...extractListAfterLabel(markdown, "Hard failure caps triggered")
  ];

  return {
    productScore,
    contractScore,
    tier,
    visibleJudgment,
    blockers: uniqueStrings(blockers)
  };
}

function buildBenchmarkRecommendation(records: BenchmarkResultRecord[]): BenchmarkRecommendation {
  const gradedProviderRuns = records
    .filter((record) => record.status === "succeeded" && typeof record.productScore === "number")
    .sort((first, second) => (second.productScore ?? 0) - (first.productScore ?? 0));
  const best = gradedProviderRuns[0];

  if (!best) {
    return {
      label: "No scored provider route yet",
      status: "blocked",
      rationale: "Latest executable routes are either provider failures or prompt-contract-only runs.",
      blockers: ["Run a full pipeline-quality benchmark with a configured text and image provider."]
    };
  }

  if ((best.productScore ?? 0) < 80) {
    return {
      label: "No customer-quality recommendation",
      status: "blocked",
      productScore: best.productScore,
      contractScore: best.contractScore,
      evidencePath: best.evidence.manualGradePath ?? best.evidence.summaryPath,
      rationale: `${best.textProvider} + ${best.imageProvider} is the best scored provider evidence here, but ${best.productScore}/100 is below the visible product gate.`,
      blockers: best.blockers
    };
  }

  return {
    label: `${best.textProvider} + ${best.imageProvider}`,
    status: "candidate",
    productScore: best.productScore,
    contractScore: best.contractScore,
    evidencePath: best.evidence.manualGradePath ?? best.evidence.summaryPath,
    rationale: "Highest manually graded visible product score among executable provider runs.",
    blockers: best.blockers
  };
}

function benchmarkSearchText(record: BenchmarkResultRecord): string {
  return normalizeSearch(
    [
      record.id,
      record.runId,
      record.phase,
      record.storyId,
      record.status,
      record.tier,
      record.textCandidateId,
      record.textProvider,
      record.textModel,
      record.imageCandidateId,
      record.imageProvider,
      record.imageModel,
      ...record.aiNotes,
      ...record.humanNotes,
      ...record.blockers,
      record.evidence.outputDir,
      record.evidence.summaryPath,
      record.evidence.providerHttpPath,
      record.evidence.manualGradePath,
      record.evidence.contactSheetPath,
      ...record.evidence.previewPaths,
      ...record.evidence.promptPaths,
      ...record.evidence.payloadPaths,
      ...record.evidence.failurePaths
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function parseScore(markdown: string, pattern: RegExp): number | undefined {
  const score = Number.parseInt(markdown.match(pattern)?.[1] ?? "", 10);
  if (!Number.isFinite(score)) return undefined;
  return Math.max(0, Math.min(100, score));
}

function matchLine(markdown: string, pattern: RegExp): string | undefined {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(pattern)?.[1])
    .find((value): value is string => Boolean(value?.trim()));
}

function sectionText(markdown: string, heading: string): string | undefined {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "im");
  const match = pattern.exec(markdown);
  if (!match) return undefined;
  const tail = markdown.slice(match.index + match[0].length);
  return tail.split(/\n##\s+/)[0]?.trim().replace(/\s+/g, " ") || undefined;
}

function extractListAfterLabel(markdown: string, label: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const normalizedLabel = normalizeSearch(label);
  const values: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*]\s*/, "");
    const normalized = normalizeSearch(trimmed);
    if (!normalized.startsWith(normalizedLabel)) continue;
    const value = trimmed.replace(new RegExp(`^${escapeRegExp(label)}\\s*:?`, "i"), "").trim();
    if (value) values.push(value);
  }

  return values;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeSearch(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
