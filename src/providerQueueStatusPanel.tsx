import { CircleCheck, RefreshCw, XCircle, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { requestBrowserJson } from "./browserRequestAdapter";

export type ProviderQueueStatusState =
  | {
      status: "loading";
      refreshing?: boolean;
    }
  | {
      status: "ready";
      metrics: ProviderQueueMetrics;
      routeScope: string[];
      leaseTtlSeconds: number;
      updatedAtIso: string;
      refreshing?: boolean;
    }
  | {
      status: "blocked";
      detail: string;
      httpStatus?: number;
      updatedAtIso: string;
      refreshing?: boolean;
    };

export type ProviderQueueMetrics = {
  queued_total: number;
  running_total: number;
  stale_running_total: number;
  succeeded_total: number;
  dead_lettered_total: number;
  oldest_queued_age_seconds: number;
  max_active_attempt_count: number;
  max_attempts: number;
  last_succeeded_at: string | null;
  last_dead_lettered_at: string | null;
};

export function useProviderQueueStatus(getAdminApiToken?: () => Promise<string | undefined>) {
  const [state, setState] = useState<ProviderQueueStatusState>({ status: "loading" });
  const refresh = useCallback(async () => {
    setState((current) => (current.status === "loading" ? current : { ...current, refreshing: true }));
    setState(await fetchProviderQueueStatus(getAdminApiToken));
  }, [getAdminApiToken]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const next = await fetchProviderQueueStatus(getAdminApiToken);
      if (active) setState(next);
    };
    load();
    const intervalId = window.setInterval(load, 15_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [getAdminApiToken]);

  return { state, refresh };
}

export function ProviderQueueStatusPanel({
  className = "",
  onRefresh,
  state
}: {
  className?: string;
  onRefresh: () => void;
  state: ProviderQueueStatusState;
}) {
  const readyState = state.status === "ready" ? state : undefined;
  const blockedHttpStatus = state.status === "blocked" ? state.httpStatus : undefined;
  const blockedDetail = state.status === "blocked" ? state.detail : "";
  const statusChip =
    state.status === "ready"
      ? { icon: CircleCheck, label: "Live queue", tone: "green" as const }
      : state.status === "loading"
        ? { icon: RefreshCw, label: "Loading", tone: "blue" as const }
        : { icon: XCircle, label: blockedHttpStatus === 401 ? "Admin auth" : "Unavailable", tone: "red" as const };

  return (
    <article className={`toolPanel adminWide providerQueueMetrics ${className}`.trim()}>
      <div className="sectionHeader compact providerQueueHeader">
        <div>
          <p className="eyebrow">Live provider queue</p>
          <h3>ComfyUI worker health</h3>
        </div>
        <div className="providerQueueHeaderActions">
          <StatusChip icon={statusChip.icon} label={statusChip.label} tone={statusChip.tone} />
          <button
            className="quietButton providerQueueRefresh"
            disabled={state.status === "loading" || Boolean(state.refreshing)}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw size={16} />
            <span>{state.refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {readyState ? (
        <>
          <div className="runtimeGrid compactMetrics" aria-label="Live provider queue metrics">
            <Metric label="Queued" value={`${readyState.metrics.queued_total}`} />
            <Metric label="Running" value={`${readyState.metrics.running_total}`} />
            <Metric label="Stale" value={`${readyState.metrics.stale_running_total}`} />
            <Metric label="Dead" value={`${readyState.metrics.dead_lettered_total}`} />
            <Metric label="Succeeded" value={`${readyState.metrics.succeeded_total}`} />
            <Metric label="Oldest queued" value={formatDurationSeconds(readyState.metrics.oldest_queued_age_seconds)} />
            <Metric label="Active attempts" value={`${readyState.metrics.max_active_attempt_count}`} />
            <Metric label="Max attempts" value={`${readyState.metrics.max_attempts}`} />
          </div>
          <div className="providerQueueMeta" aria-label="Live provider queue details">
            <span>{readyState.routeScope.join(", ") || "No route scope"}</span>
            <span>{readyState.leaseTtlSeconds}s lease TTL</span>
            <span>Updated {new Date(readyState.updatedAtIso).toLocaleTimeString()}</span>
            <span>Last success {formatDateTime(readyState.metrics.last_succeeded_at)}</span>
            <span>Last dead {formatDateTime(readyState.metrics.last_dead_lettered_at)}</span>
          </div>
        </>
      ) : (
        <div className="adminPortalEmpty">
          {state.status === "loading" ? <RefreshCw size={18} /> : <XCircle size={18} />}
          <span>
            {state.status === "loading"
              ? "Loading live queue metrics."
              : blockedHttpStatus === 401
                ? "Sign in as an admin to view live queue metrics."
                : blockedDetail}
          </span>
        </div>
      )}
    </article>
  );
}

async function fetchProviderQueueStatus(getAdminApiToken?: () => Promise<string | undefined>): Promise<ProviderQueueStatusState> {
  const updatedAtIso = new Date().toISOString();
  try {
    const { payload, response } = await requestBrowserJson<Record<string, unknown>>(
      "/api/admin/provider/jobs/status?routes=ai-card-generate",
      {
        cache: "no-store",
        getToken: getAdminApiToken
      }
    );
    const payloadObject = asRecord(payload);
    if (!response.ok) {
      return {
        status: "blocked",
        httpStatus: response.status,
        detail: queueStatusErrorDetail(payloadObject, response),
        updatedAtIso
      };
    }
    return {
      status: "ready",
      metrics: normalizeProviderQueueMetrics(payloadObject.metrics),
      routeScope: Array.isArray(payloadObject.route_scope)
        ? payloadObject.route_scope.map((item) => String(item)).filter(Boolean)
        : [],
      leaseTtlSeconds: finiteNumber(payloadObject.lease_ttl_seconds),
      updatedAtIso
    };
  } catch (error) {
    return {
      status: "blocked",
      detail: error instanceof Error ? error.message : "Live queue metrics are unavailable.",
      updatedAtIso
    };
  }
}

function StatusChip({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: "green" | "blue" | "red" | "amber" }) {
  return (
    <span className={`statusChip ${tone}`}>
      <Icon size={15} />
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function queueStatusErrorDetail(payload: Record<string, unknown>, response: Response): string {
  const detail = String(payload.detail ?? payload.status ?? response.statusText ?? "").trim();
  if (response.status === 401) return "Admin authentication is required.";
  if (response.status === 403) return "Admin authorization is required.";
  return detail || "Live queue metrics are unavailable.";
}

function normalizeProviderQueueMetrics(value: unknown): ProviderQueueMetrics {
  const metrics = asRecord(value);
  return {
    queued_total: finiteNumber(metrics.queued_total),
    running_total: finiteNumber(metrics.running_total),
    stale_running_total: finiteNumber(metrics.stale_running_total),
    succeeded_total: finiteNumber(metrics.succeeded_total),
    dead_lettered_total: finiteNumber(metrics.dead_lettered_total),
    oldest_queued_age_seconds: finiteNumber(metrics.oldest_queued_age_seconds),
    max_active_attempt_count: finiteNumber(metrics.max_active_attempt_count),
    max_attempts: finiteNumber(metrics.max_attempts),
    last_succeeded_at: nullableString(metrics.last_succeeded_at),
    last_dead_lettered_at: nullableString(metrics.last_dead_lettered_at)
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function finiteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function nullableString(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function formatDurationSeconds(value: number): string {
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "None";
}
