import { describe, expect, it } from "vitest";
import {
  buildAdminOperationsWorkflow,
  validateAdminOperationsWorkflow,
  type AdminOperationTask
} from "./adminOperations";
import { externalAuditReadinessItems } from "./externalAuditReadiness";
import { hostedApiReadinessItems } from "./hostedApiReadiness";
import { observabilityReadinessItems } from "./observabilityReadiness";
import { paymentReadinessItems } from "./paymentReadiness";
import { buildAdminPanelModel } from "./providerCatalog";
import { productionLaunchGates } from "./productionReadiness";
import { retailFulfillmentReadinessItems } from "./retailFulfillmentReadiness";

const workflowInput = {
  model: buildAdminPanelModel(),
  productionGates: productionLaunchGates,
  hostedApiReadinessItems,
  retailFulfillmentReadinessItems,
  paymentReadinessItems,
  observabilityReadinessItems,
  externalAuditReadinessItems
};

describe("admin operations workflow", () => {
  it("turns readiness evidence into owner lanes without live-production claims", () => {
    const workflow = buildAdminOperationsWorkflow(workflowInput);

    expect(validateAdminOperationsWorkflow(workflow)).toEqual([]);
    expect(workflow.summary).toMatchObject({
      ownerCount: 5,
      liveEnabled: 0,
      p0Tasks: expect.any(Number),
      evidenceRequired: expect.any(Number)
    });
    expect(workflow.summary.p0Tasks).toBeGreaterThanOrEqual(7);
    expect(workflow.summary.evidenceRequired).toBeGreaterThanOrEqual(12);
    expect(workflow.ownerLanes.map((lane) => lane.id)).toEqual([
      "identity-access",
      "provider-integrations",
      "commerce-fulfillment",
      "platform-infrastructure",
      "observability-audit"
    ]);
    expect(workflow.priorityTasks[0]).toMatchObject({
      id: "credential-vault-required-env",
      ownerId: "platform-infrastructure",
      priority: "p0",
      liveEnabled: false
    });
  });

  it("keeps credential vault, hosted Clerk token, and incident drill work explicit", () => {
    const workflow = buildAdminOperationsWorkflow(workflowInput);
    const credentialVault = workflow.tasks.find((task) => task.id === "credential-vault-required-env");
    const hostedToken = workflow.tasks.find((task) => task.id === "hosted-clerk-token-verification");
    const alertDrill = workflow.tasks.find((task) => task.id === "alert-routing-drill");
    const incidentRunbook = workflow.tasks.find((task) => task.id === "incident-review-runbook");

    expect(credentialVault).toMatchObject({
      label: "Credential vault setup",
      ownerId: "platform-infrastructure",
      status: "evidence-required",
      liveEnabled: false
    });
    expect(credentialVault?.envVarNames).toEqual(expect.arrayContaining(["DATABASE_URL", "AUTH_SESSION_SECRET"]));
    expect(credentialVault?.requiredEvidence).toEqual(
      expect.arrayContaining(["Secret manager path for every required environment variable", "Rotation owner"])
    );
    expect(hostedToken).toMatchObject({
      label: "Hosted Clerk token verification",
      ownerId: "identity-access",
      status: "evidence-required"
    });
    expect(hostedToken?.requiredEvidence).toEqual(expect.arrayContaining(["Hosted Clerk customer JWT probe"]));
    expect(alertDrill).toMatchObject({
      label: "Alert route drill",
      ownerId: "observability-audit",
      priority: "p0"
    });
    expect(incidentRunbook).toMatchObject({
      label: "Incident review runbook",
      ownerId: "observability-audit",
      priority: "p1"
    });
  });

  it("rejects unsafe or unactionable operations tasks", () => {
    const workflow = buildAdminOperationsWorkflow(workflowInput);
    const productionAuthTask = workflow.tasks.find((task) => task.id === "production-user-auth");
    if (!productionAuthTask) throw new Error("Missing production-user-auth task");
    const unsafeTask: AdminOperationTask = {
      ...productionAuthTask,
      ownerId: "" as AdminOperationTask["ownerId"],
      adminAction: "",
      requiredEvidence: [],
      liveEnabled: true
    };

    expect(validateAdminOperationsWorkflow({ ...workflow, tasks: [unsafeTask] })).toEqual(
      expect.arrayContaining([
        "Admin operation task production-user-auth must have a known owner.",
        "Admin operation task production-user-auth must name a concrete admin action.",
        "Admin operation task production-user-auth must list required evidence.",
        "Admin operation task production-user-auth must not claim live production enablement."
      ])
    );
  });
});
