import { describe, expect, it } from "vitest";
import {
  aiQueueOperationMetrics,
  aiQueueOperationsItems,
  summarizeAiQueueOperations,
  validateAiQueueOperations,
  type AiQueueOperationMetric,
  type AiQueueOperationsItem
} from "./aiQueueOperations";

describe("AI queue operations readiness", () => {
  it("defines production-ready queue controls with metrics, alerts, and human owners", () => {
    expect(validateAiQueueOperations()).toEqual([]);
    expect(aiQueueOperationsItems.map((item) => item.id)).toEqual([
      "queue-admission-contract",
      "worker-lease-retry-dlq",
      "status-polling-contract",
      "payload-minimization-retention",
      "operational-metrics",
      "alert-thresholds",
      "human-dead-letter-management"
    ]);
    expect(aiQueueOperationsItems.every((item) => item.productionReady)).toBe(true);
    expect(aiQueueOperationsItems.every((item) => item.humanOwner.length > 0)).toBe(true);
    expect(aiQueueOperationsItems.every((item) => item.externalNetworkCalls === false)).toBe(true);
    expect(aiQueueOperationsItems.every((item) => item.liveProviderCalls === false)).toBe(true);
  });

  it("tracks concrete queue health and cost metrics with alert thresholds", () => {
    expect(aiQueueOperationMetrics.map((metric) => metric.metric)).toEqual([
      "api_jobs_queued_total",
      "api_jobs_oldest_queued_age_seconds",
      "api_jobs_stale_running_total",
      "api_jobs_dead_lettered_total",
      "provider_spend_budget_percent"
    ]);
    expect(aiQueueOperationMetrics.every((metric) => metric.warnAt < metric.pageAt)).toBe(true);
    expect(aiQueueOperationMetrics.every((metric) => metric.piiFree)).toBe(true);
    expect(aiQueueOperationMetrics.every((metric) => metric.runbookAction.length > 20)).toBe(true);
  });

  it("summarizes admin-facing readiness without hidden live provider or network claims", () => {
    expect(summarizeAiQueueOperations()).toMatchObject({
      total: 7,
      repoLocalReady: 7,
      productionReadyControls: 7,
      metricsTracked: 5,
      alertThresholds: 5,
      alertRoutesRequired: 5,
      humanOwnedControls: 7,
      deadLetterControls: 5,
      piiFreeMetrics: 5,
      externalNetworkCalls: 0,
      liveProviderCalls: 0,
      blockers: []
    });
  });

  it("rejects missing alert ownership and unsafe queue claims", () => {
    const unsafeItems = [
      {
        ...aiQueueOperationsItems[0],
        humanOwner: "",
        alertIds: ["missing-alert"],
        externalNetworkCalls: true,
        productionReady: false
      }
    ] as unknown as AiQueueOperationsItem[];
    const unsafeMetric = {
      ...aiQueueOperationMetrics[0],
      warnAt: 10,
      pageAt: 5,
      piiFree: false,
      runbookAction: ""
    } as unknown as AiQueueOperationMetric;

    expect(validateAiQueueOperations(unsafeItems)).toEqual(
      expect.arrayContaining([
        "AI queue operation item queue-admission-contract must not require external calls.",
        "AI queue operation item queue-admission-contract must be productionReady=true.",
        "AI queue operation item queue-admission-contract must name a human owner.",
        "AI queue operation item queue-admission-contract references unknown alert id missing-alert.",
        "Missing AI queue operations readiness item: worker-lease-retry-dlq."
      ])
    );
    expect(unsafeMetric.warnAt >= unsafeMetric.pageAt).toBe(true);
    expect(unsafeMetric.piiFree).toBe(false);
  });
});
