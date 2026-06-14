export interface BenchmarkCandidate {
  id: string;
  label?: string;
  adapterId: string;
  model?: string;
  configured?: boolean;
  missingEnv?: string[];
}

export interface TypographyMode {
  id: string;
  label: string;
  strategy: string;
}

export interface TypographyExperimentRun {
  phase: "typography";
  focus: "typography";
  storyId: string;
  text: BenchmarkCandidate;
  image: BenchmarkCandidate;
  typographyMode: TypographyMode;
}

export interface PipelineQualityRun {
  phase: "pipeline-quality";
  focus: "full-card-quality";
  storyId: string;
  story: BenchmarkStory;
  text: BenchmarkCandidate;
  image: BenchmarkCandidate;
}

export interface BenchmarkStory {
  id: string;
  customer_type: string;
  occasion: string;
  memory_load: string;
  request: {
    sender: string;
    recipient: string;
    relationship: string;
    occasion: string;
    tone: string;
    style: string;
    language: string;
    personal_note: string;
    memory_notes: string[];
  };
  must_include: string[];
  must_avoid: string[];
}

export interface TypographyExperimentSpec {
  id: string;
  panelType: string;
  size: string;
  output: string;
  style: string;
  palette: string;
  motif: string;
  mood: string;
  headline: string;
  body: string;
  headlineWordCount: number;
  bodySentenceCount: number;
  panels: Record<
    string,
    {
      id: string;
      panelType: string;
      role?: string;
      headline?: string;
      body?: string;
      composition?: string;
    }
  >;
}

export interface TypographyPromptPlan {
  modeId: string;
  panelId: string;
  renderTextInApp: boolean;
  prompt: string;
  negativePrompt: string;
}

export interface BenchmarkPhaseReadmeSummary {
  phase: string;
  createdAtIso: string;
  outputDir: string;
  runs: Array<{
    storyId: string;
    textCandidateId?: string;
    imageCandidateId: string;
    typographyModeLabel?: string;
    panelCount?: number;
    contactSheet?: string;
    status?: string;
    statusCode?: number;
    error?: string;
  }>;
}

export const typographyExperimentSpec: TypographyExperimentSpec;

export const stories: Record<string, BenchmarkStory>;

export function buildTypographyExperimentPrompt(
  modeId: string,
  spec?: TypographyExperimentSpec,
  panelId?: string
): TypographyPromptPlan;

export function typographyExperimentRuns(candidates: {
  image: BenchmarkCandidate[];
  text?: BenchmarkCandidate[];
}): TypographyExperimentRun[];

export function pipelineQualityRuns(candidates: {
  image?: BenchmarkCandidate[];
  text?: BenchmarkCandidate[];
}): PipelineQualityRun[];

export function buildPhaseReadme(summary: BenchmarkPhaseReadmeSummary): string;

export function sanitizeBenchmarkValue(value: undefined, env?: Record<string, string | undefined>): undefined;

export function sanitizeBenchmarkValue<T>(
  value: Exclude<T, undefined>,
  env?: Record<string, string | undefined>
): Exclude<T, undefined>;
