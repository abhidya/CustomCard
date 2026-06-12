export const cardGenerationBenchmarkDefaultFixtureIds: string[];
export const cardGenerationBenchmarkFixtures: Record<string, {
  id: string;
  category: string;
  qualityTarget: {
    passScore: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}>;

export function evaluateBenchmarkQuality(input: {
  fixture: Record<string, unknown>;
  payload: Record<string, unknown>;
  panelFiles: Array<Record<string, unknown>>;
}): {
  status: "pass" | "needs-improvement";
  score: number;
  passed: number;
  total: number;
  checks: Array<Record<string, unknown>>;
};

export type BenchmarkRedactionEnv = Record<string, string | undefined>;

export function redactHeaders(
  headers: Headers | Record<string, string | number | boolean | null | undefined>,
  env?: BenchmarkRedactionEnv
): Record<string, string>;

export function redactUrl(value: string, env?: BenchmarkRedactionEnv): string;

export function sanitizeForLog<T>(value: T, env: BenchmarkRedactionEnv): T;
