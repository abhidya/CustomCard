export type BenchmarkRedactionEnv = Record<string, string | undefined>;

export function redactHeaders(
  headers: Headers | Record<string, string | number | boolean | null | undefined>,
  env?: BenchmarkRedactionEnv
): Record<string, string>;

export function redactUrl(value: string, env?: BenchmarkRedactionEnv): string;

export function sanitizeForLog<T>(value: T, env: BenchmarkRedactionEnv): T;
