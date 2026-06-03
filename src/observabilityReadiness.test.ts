import { describe, expect, it } from "vitest";
import {
  observabilityReadinessItems,
  summarizeObservabilityReadiness,
  validateObservabilityReadiness,
  type ObservabilityReadinessItem
} from "./observabilityReadiness";

describe("observability readiness", () => {
  it("tracks telemetry and alerting readiness without live ingestion claims", () => {
    const summary = summarizeObservabilityReadiness();

    expect(validateObservabilityReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      total: 7,
      repoLocalReady: 4,
      evidenceMissing: 3,
      alertRoutesRequired: 4,
      piiRedacted: 7,
      providerContracts: 6,
      unsampledCriticalEvents: 1,
      maxRetentionDays: 365,
      liveIngestionEnabled: 0,
      externalNetworkCalls: 0,
      productionAlertsEnabled: 0,
      blockers: []
    });
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Telemetry endpoint proof",
        "PII redaction sample",
        "Alert route drill",
        "Retention policy approval",
        "Incident response drill"
      ])
    );
  });

  it("covers provider contracts and critical alert events explicitly", () => {
    const providerContracts = observabilityReadinessItems.find((item) => item.id === "observability-provider-contracts");
    const alertDrill = observabilityReadinessItems.find((item) => item.id === "alert-routing-drill");

    expect(providerContracts?.providerAdapterIds).toEqual(
      expect.arrayContaining([
        "sentry-error-observability",
        "posthog-product-observability",
        "opentelemetry-otlp-observability",
        "grafana-cloud-otlp-observability",
        "datadog-logs-observability",
        "betterstack-logs-observability"
      ])
    );
    expect(providerContracts).toMatchObject({
      liveIngestionEnabled: false,
      externalNetworkCalls: false,
      productionAlertEnabled: false,
      piiRedacted: true
    });
    expect(alertDrill).toMatchObject({
      alertRouteRequired: true,
      samplingPolicy: "Alert-triggering events are never sampled.",
      liveIngestionEnabled: false
    });
    expect(alertDrill?.eventNames).toEqual(
      expect.arrayContaining(["order.kill_switch.enabled", "vendor.order.blocked", "queue.age.slo_breached"])
    );
  });

  it("flags unsafe telemetry claims before they reach admin or API readiness", () => {
    const unsafeItems: ObservabilityReadinessItem[] = [
      {
        ...observabilityReadinessItems[0],
        liveIngestionEnabled: true,
        externalNetworkCalls: true,
        productionAlertEnabled: true,
        piiRedacted: false,
        samplingPolicy: "sample",
        retentionDays: 1000,
        eventNames: [],
        currentEvidence: [],
        requiredEvidence: ["one"]
      } as unknown as ObservabilityReadinessItem,
      {
        ...observabilityReadinessItems[0]
      }
    ];

    expect(validateObservabilityReadiness(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate observability readiness item: telemetry-event-schema.",
        "Observability readiness item telemetry-event-schema must keep liveIngestionEnabled=false.",
        "Observability readiness item telemetry-event-schema must not require live external network calls.",
        "Observability readiness item telemetry-event-schema must keep productionAlertEnabled=false.",
        "Observability readiness item telemetry-event-schema must require PII redaction.",
        "Observability readiness item telemetry-event-schema must describe its sampling policy.",
        "Observability readiness item telemetry-event-schema must use a finite retention window between 7 and 400 days.",
        "Observability readiness item telemetry-event-schema must list telemetry event names.",
        "Observability readiness item telemetry-event-schema must list current repo-local evidence.",
        "Observability readiness item telemetry-event-schema must list at least two required evidence items.",
        "Missing observability readiness item: alert-routing-drill.",
        "Missing observability readiness item: observability-provider-contracts."
      ])
    );

    expect(
      validateObservabilityReadiness([
        {
          ...observabilityReadinessItems.find((item) => item.id === "observability-provider-contracts")!,
          providerAdapterIds: ["sentry-error-observability"]
        }
      ])
    ).toEqual(expect.arrayContaining(["Observability provider contracts must include adapter: posthog-product-observability."]));
  });
});
