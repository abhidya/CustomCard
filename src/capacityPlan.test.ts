import { describe, expect, it } from "vitest";
import {
  capacityEvidenceThresholds,
  capacityProfiles,
  summarizeCapacityPlan,
  validateCapacityEvidenceThresholds,
  validateCapacityProfiles,
  type CapacityEvidenceThreshold,
  type CapacityProfile
} from "./capacityPlan";

describe("capacity plan", () => {
  it("defines finite cheap-to-scale profiles without live provider or order claims", () => {
    expect(validateCapacityProfiles()).toEqual([]);
    expect(capacityProfiles.map((profile) => profile.id)).toEqual([
      "local-dev",
      "cheap-droplet",
      "cloud-native",
      "saas-scale"
    ]);
    expect(capacityProfiles.every((profile) => profile.realOrdersEnabled === false)).toBe(true);
    expect(capacityProfiles.every((profile) => profile.liveProviderCalls === false)).toBe(true);
    expect(capacityProfiles.every((profile) => Number.isFinite(profile.dailyCardCapacity))).toBe(true);
    expect(capacityProfiles.every((profile) => Number.isFinite(profile.dailyImageGenerationBudget))).toBe(true);
    expect(capacityProfiles.every((profile) => profile.costGuardrails.includes("Provider budget caps"))).toBe(true);
    expect(capacityProfiles.every((profile) => profile.costGuardrails.includes("Queue concurrency limit"))).toBe(true);
    expect(capacityProfiles.every((profile) => profile.costGuardrails.includes("Artifact retention window"))).toBe(true);
    expect(capacityProfiles.every((profile) => profile.costGuardrails.includes("Real-order kill switch"))).toBe(true);
  });

  it("keeps droplet, cloud, and SaaS shapes honest about their tradeoffs", () => {
    const cheapDroplet = capacityProfiles.find((profile) => profile.id === "cheap-droplet");
    const cloudNative = capacityProfiles.find((profile) => profile.id === "cloud-native");
    const saasScale = capacityProfiles.find((profile) => profile.id === "saas-scale");

    expect(cheapDroplet).toMatchObject({
      webReplicas: 1,
      workerReplicas: 1,
      databaseMode: "self-hosted-postgres",
      queueMode: "self-hosted-redis",
      objectStoreMode: "filesystem-mounted"
    });
    expect(cheapDroplet?.dailyImageGenerationBudget).toBeLessThanOrEqual(25);
    expect(cheapDroplet?.tradeoffs.join(" ")).toContain("single-host");
    expect(cloudNative?.webReplicas).toBeGreaterThanOrEqual(3);
    expect(cloudNative?.workerReplicas).toBeGreaterThanOrEqual(2);
    expect(cloudNative?.databaseMode).toBe("managed-postgres");
    expect(cloudNative?.objectStoreMode).toBe("managed-s3-compatible");
    expect(saasScale?.queueMode).toBe("managed-queue-sharded");
    expect(saasScale?.providerPolicy).toContain("budget gates");
  });

  it("summarizes reviewer-facing capacity without production evidence drift", () => {
    expect(summarizeCapacityPlan()).toMatchObject({
      total: 4,
      localProfiles: 1,
      cloudProfiles: 3,
      maxDailyCards: 12000,
      maxDailyImageGenerations: 1000,
      queueBackedProfiles: 4,
      objectStoreBackedProfiles: 4,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      sloThresholds: 4,
      workerBackedThresholds: 1,
      databaseThresholds: 1,
      artifactThresholds: 1,
      providerSpendThresholds: 1,
      measuredEvidenceRequired: 4,
      blockers: []
    });
  });

  it("defines measurable SLO thresholds for scaling evidence", () => {
    expect(validateCapacityEvidenceThresholds()).toEqual([]);
    expect(capacityEvidenceThresholds.map((threshold) => threshold.metric)).toEqual([
      "queued_api_jobs_per_worker",
      "postgres_pool_utilization_percent",
      "artifact_write_p95_ms",
      "provider_spend_budget_percent"
    ]);
    expect(capacityEvidenceThresholds.every((threshold) => threshold.warnAt < threshold.blockAt)).toBe(true);
    expect(capacityEvidenceThresholds.every((threshold) => threshold.requiredEvidence.length > 20)).toBe(true);
  });

  it("flags capacity plans that hide live traffic, remove queues, or overclaim scaling", () => {
    const unsafeProfiles = [
      {
        ...capacityProfiles[0],
        realOrdersEnabled: true,
        liveProviderCalls: true,
        costGuardrails: ["Provider budget caps"],
        queueMode: "none",
        objectStoreMode: "browser-local"
      },
      {
        ...capacityProfiles[1],
        dailyImageGenerationBudget: 200,
        webReplicas: 3
      },
      {
        ...capacityProfiles[2],
        workerReplicas: 1,
        objectStoreMode: "filesystem-mounted"
      }
    ] as unknown as CapacityProfile[];

    expect(validateCapacityProfiles(unsafeProfiles)).toEqual(
      expect.arrayContaining([
        "Missing capacity profile: saas-scale.",
        "Capacity profile local-dev must keep realOrdersEnabled=false.",
        "Capacity profile local-dev must keep liveProviderCalls=false.",
        "Capacity profile local-dev must include cost guardrail: Queue concurrency limit.",
        "Capacity profile local-dev must include cost guardrail: Artifact retention window.",
        "Capacity profile local-dev must include cost guardrail: Real-order kill switch.",
        "Capacity profile cheap-droplet must stay single-host with low image budget.",
        "Capacity profile cloud-native must use at least two worker replicas.",
        "Capacity profile cloud-native must use managed object storage."
      ])
    );
  });

  it("flags capacity evidence thresholds that cannot be measured", () => {
    const unsafeThresholds = [
      {
        ...capacityEvidenceThresholds[0],
        metric: "",
        profiles: ["missing-profile"],
        warnAt: 200,
        blockAt: 50,
        measuredBy: "",
        requiredEvidence: ""
      }
    ] as unknown as CapacityEvidenceThreshold[];

    expect(validateCapacityEvidenceThresholds(unsafeThresholds)).toEqual(
      expect.arrayContaining([
        "Capacity evidence threshold api-job-queue-depth must name a metric.",
        "Capacity evidence threshold api-job-queue-depth must name a measurement source.",
        "Capacity evidence threshold api-job-queue-depth must name required evidence.",
        "Capacity evidence threshold api-job-queue-depth must set warnAt lower than blockAt.",
        "Capacity evidence threshold api-job-queue-depth references unknown profile missing-profile.",
        "Missing capacity evidence threshold metric: queued_api_jobs_per_worker.",
        "Missing capacity evidence threshold metric: postgres_pool_utilization_percent.",
        "Missing capacity evidence threshold metric: artifact_write_p95_ms.",
        "Missing capacity evidence threshold metric: provider_spend_budget_percent."
      ])
    );
  });
});
