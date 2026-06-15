import { useMemo } from "react";
import { AdminPanelView } from "../src/App";
import type { AiFlowAdminConfig, AiFlowConfigSummary } from "../src/aiFlowConfig";
import type { AiGenerationJobEvidence } from "../src/aiGenerationJobs";
import { buildAdminPanelModel, providerCatalog } from "../src/providerCatalog";
import { summarizeProviderGovernance } from "../src/providerGovernance";
import { getProviderRuntimeReadiness, type RuntimeReadiness } from "../src/providerRuntime";
import { summarizeProductionReadiness } from "../src/productionReadiness";
import { buildReadinessSummary } from "../src/readinessSummary";
import { summarizeLocalizationReadiness } from "../src/localization";
import type { ViewId } from "../src/appStateOrchestrator";
import { AdminView } from "./views/AdminView";
import { LegalView } from "./views/LegalView";

export default function AdminOperationalView({
  activeView,
  aiFlowConfigs,
  aiGenerationJobs,
  aiFlowSummary,
  getAdminApiToken,
  onAiFlowConfigsChange
}: {
  activeView: ViewId;
  aiFlowConfigs: AiFlowAdminConfig[];
  aiGenerationJobs: AiGenerationJobEvidence[];
  aiFlowSummary: AiFlowConfigSummary;
  getAdminApiToken?: () => Promise<string | undefined>;
  onAiFlowConfigsChange: (configs: AiFlowAdminConfig[]) => void;
}) {
  const operationalState = useAdminOperationalState();

  if (activeView === "legal") {
    return (
      <LegalView
        items={operationalState.readiness.legalCompliance.items}
        summary={operationalState.readiness.legalCompliance.summary}
      />
    );
  }

  return (
    <AdminView
      aiFlowConfigs={aiFlowConfigs}
      aiGenerationJobs={aiGenerationJobs}
      aiFlowSummary={aiFlowSummary}
      getAdminApiToken={getAdminApiToken}
      onAiFlowConfigsChange={onAiFlowConfigsChange}
      fullAudit={
        <AdminPanelView
          aiFlowConfigs={aiFlowConfigs}
          aiFlowSummary={aiFlowSummary}
          aiGenerationJobs={aiGenerationJobs}
          localizationSummary={operationalState.localizationSummary}
          model={operationalState.adminPanelModel}
          onAiFlowConfigsChange={onAiFlowConfigsChange}
          productionReadiness={operationalState.productionReadiness}
          providerGovernance={operationalState.providerGovernance}
          readiness={operationalState.readiness}
          runtimeReadiness={operationalState.runtimeReadiness}
        />
      }
    />
  );
}

function useAdminOperationalState() {
  const adminPanelModel = useMemo(() => buildAdminPanelModel(), []);
  const localizationSummary = useMemo(() => summarizeLocalizationReadiness(), []);
  const providerGovernance = useMemo(() => summarizeProviderGovernance(), []);
  const productionReadiness = useMemo(() => summarizeProductionReadiness(), []);
  const readiness = useMemo(() => buildReadinessSummary(), []);
  const runtimeReadiness = useMemo(() => buildRuntimeReadinessMap(), []);

  return {
    adminPanelModel,
    localizationSummary,
    providerGovernance,
    productionReadiness,
    readiness,
    runtimeReadiness
  };
}

function buildRuntimeReadinessMap(): Map<string, RuntimeReadiness> {
  return new Map(providerCatalog.map((adapter) => [adapter.id, getProviderRuntimeReadiness(adapter.id)]));
}
