import {
  CircleCheck,
  ClipboardCheck,
  Cloud,
  Globe2,
  Image,
  KeyRound,
  Lock,
  CreditCard,
  PackageCheck,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Info,
  Store,
  Search,
  UserRound,
  WandSparkles,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  type AiProviderReadinessItem,
  type AiQueueOperationsItem,
  type BusinessEngagementReadinessItem,
  type CloudArtifactProofReadinessItem,
  type E2eCoverageItem,
  type ExternalAuditReadinessItem,
  type HostedApiReadinessItem,
  type LegalComplianceItem,
  type MobileRenderReadinessItem,
  type ObservabilityReadinessItem,
  type PaymentReadinessItem,
  type ReadinessSummary,
  type RetailFulfillmentReadinessItem,
  type ReviewerDbSeedReadinessItem
} from "./readinessSummary";
import {
  capabilityLabels,
  providerCatalog,
  providerStatusLabel,
  type AdminPanelModel,
  type ProviderAdapter,
  type ProviderCapability,
  type ProviderStatus
} from "./providerCatalog";
import {
  type LocalizationReadinessSummary,
} from "./localization";
import { type ProviderGovernanceSummary } from "./providerGovernance";
import { buildProviderOpsModel, providerOpsMetricSourceForAdapter } from "./providerOps";
import { type RuntimeReadiness } from "./providerRuntime";
import { buildAdminOperationsWorkflow, type AdminOperationsWorkflow, type AdminOperationTask } from "./adminOperations";
import {
  buildAdminPortalModel,
  filterAdminPortalRecords,
  type AdminPortalArea,
  type AdminPortalModel,
  type AdminPortalOrderQueueItem,
  type AdminPortalRecord,
  type AdminPortalSectionId,
  type AdminPortalStatus
} from "./adminPortal";
import {
  productionLaunchGates,
  type ProductionLaunchGate,
  type ProductionReadinessSummary
} from "./productionReadiness";
import { type AiFlowAdminConfig, type AiFlowConfigSummary } from "./aiFlowConfig";
import { type AiGenerationJobEvidence } from "./aiGenerationJobs";
import { AdminReadinessMiniList, readinessStatusClass } from "./adminReadinessRenderer";
type AdapterStatusFilter = ProviderStatus | "all";
type AdapterCapabilityFilter = ProviderCapability | "all";
type AdminPortalStatusFilter = AdminPortalStatus | "all";

export function AdminPanelView({
  aiFlowConfigs,
  aiFlowSummary,
  aiGenerationJobs,
  readiness,
  localizationSummary,
  model,
  onAiFlowConfigsChange,
  providerGovernance,
  productionReadiness,
  runtimeReadiness
}: {
  aiFlowConfigs: AiFlowAdminConfig[];
  aiFlowSummary: AiFlowConfigSummary;
  aiGenerationJobs: AiGenerationJobEvidence[];
  readiness: ReadinessSummary;
  localizationSummary: LocalizationReadinessSummary;
  model: AdminPanelModel;
  onAiFlowConfigsChange: (configs: AiFlowAdminConfig[]) => void;
  providerGovernance: ProviderGovernanceSummary;
  productionReadiness: ProductionReadinessSummary;
  runtimeReadiness: Map<string, RuntimeReadiness>;
}) {
  const [activeAdminSection, setActiveAdminSection] = useState<AdminPortalSectionId>("ops");
  const [adminPortalQuery, setAdminPortalQuery] = useState("");
  const [adminPortalStatus, setAdminPortalStatus] = useState<AdminPortalStatusFilter>("all");
  const { aiProvider, aiQueueOperations, businessEngagement, capacity, cloudArtifactProof, e2eCoverage, externalAudit, hostedApi, legalCompliance, mobileRender, observability, payment, retailFulfillment, reviewerDbSeed } = readiness;
  const aiProviderReadinessItems = aiProvider.items;
  const aiProviderReadinessSummary = aiProvider.summary;
  const aiQueueOperationsItems = aiQueueOperations.items;
  const aiQueueOperationsSummary = aiQueueOperations.summary;
  const capacityProfiles = capacity.profiles;
  const capacitySummary = capacity.summary;
  const e2eCoverageItems = e2eCoverage.items;
  const e2eCoverageSummary = e2eCoverage.summary;
  const externalAuditItems = externalAudit.items;
  const externalAuditSummary = externalAudit.summary;
  const observabilityItems = observability.items;
  const observabilitySummary = observability.summary;
  const retailFulfillmentItems = retailFulfillment.items;
  const retailFulfillmentSummary = retailFulfillment.summary;
  const paymentReadinessItems = payment.items;
  const paymentReadinessSummary = payment.summary;
  const mobileRenderReadinessItems = mobileRender.items;
  const mobileRenderReadinessSummary = mobileRender.summary;
  const hostedApiReadinessItems = hostedApi.items;
  const hostedApiReadinessSummary = hostedApi.summary;
  const legalComplianceItems = legalCompliance.items;
  const legalComplianceSummary = legalCompliance.summary;
  const reviewerDbSeedReadinessItems = reviewerDbSeed.items;
  const reviewerDbSeedReadinessSummary = reviewerDbSeed.summary;
  const cloudArtifactProofReadinessItems = cloudArtifactProof.items;
  const cloudArtifactProofReadinessSummary = cloudArtifactProof.summary;
  const businessEngagementReadinessItems = businessEngagement.items;
  const businessEngagementReadinessSummary = businessEngagement.summary;
  const runtimeSummary = summarizeRuntimeReadiness(runtimeReadiness);
  const providerOps = useMemo(
    () =>
      buildProviderOpsModel({
        model,
        readiness,
        providerGovernance,
        runtimeReadiness,
        aiFlowSummary
      }),
    [aiFlowSummary, model, providerGovernance, readiness, runtimeReadiness]
  );
  const visibleProviderEnv = providerOps.env.requiredForSelectedProviders.slice(0, 16);
  const hiddenProviderEnvCount = Math.max(providerOps.env.requiredForSelectedProviders.length - visibleProviderEnv.length, 0);
  const adminOperationsWorkflow = buildAdminOperationsWorkflow({
    model,
    productionGates: productionLaunchGates,
    hostedApiReadinessItems,
    retailFulfillmentReadinessItems: retailFulfillmentItems,
    paymentReadinessItems,
    observabilityReadinessItems: observabilityItems,
    externalAuditReadinessItems: externalAuditItems
  });
  const adminPortal = buildAdminPortalModel({
    model,
    readiness,
    providerGovernance,
    providerOps,
    productionReadiness,
    runtimeReadiness,
    adminOperationsWorkflow
  });
  const activePortalArea = adminPortal.areas[activeAdminSection];
  const filteredPortalRecords = filterAdminPortalRecords(activePortalArea.records, {
    query: adminPortalQuery,
    status: adminPortalStatus
  });

  return (
    <section className="adminPanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Operations</p>
          <h2>Admin panel</h2>
        </div>
        <StatusChip icon={ShieldCheck} label="Credential gates visible" tone="blue" />
      </div>

      <div className="adminHeroRow">
        <article className="adminHeroCard">
          <p className="eyebrow">Provider ops</p>
          <strong className="heroStat">{providerOps.summary.availableProviders}</strong>
          <span className="heroStatLabel">available here</span>
          <div className="heroSubStats">
            <span><span className="dot green" />{providerOps.summary.envConfiguredProviders} env configured</span>
            <span><span className="dot amber" />{providerOps.summary.selectedProviders} selected</span>
            <span><span className="dot red" />{providerOps.summary.missingSelectedEnv} env gaps</span>
          </div>
        </article>

        <article className="adminHeroCard safetyCard">
          <p className="eyebrow">Feature gates</p>
          <strong className="heroStat">{providerOps.summary.readyForLiveCalls}</strong>
          <span className="heroStatLabel">flow live-ready</span>
          <div className="heroSubStats">
            <span><span className="dot green" />{providerOps.summary.liveReadyProviders} provider live-ready</span>
            <span><span className="dot amber" />{providerOps.summary.liveGatedProviders} feature-gated</span>
            <span><span className="dot blue" />{providerOps.summary.fallbackQueues} fallback queues</span>
          </div>
        </article>

        <article className="adminHeroCard">
          <p className="eyebrow">ORR metrics</p>
          <strong className="heroStat">{providerOps.orr.alertRoutesRequired}</strong>
          <span className="heroStatLabel">alert routes</span>
          <div className="heroSubStats">
            <span><span className="dot red" />{providerOps.orr.latencyGateRequired} latency gates</span>
            <span><span className="dot amber" />{providerOps.orr.unsampledCriticalEvents} unsampled critical</span>
            <span><span className="dot blue" />{providerOps.orr.maxRetentionDays}d retention max</span>
          </div>
        </article>

        <article className="adminHeroCard">
          <p className="eyebrow">Users</p>
          <strong className="heroStat">{providerOps.users.adminTokenProofs + providerOps.users.customerTokenProofs}</strong>
          <span className="heroStatLabel">token proofs</span>
          <div className="heroSubStats">
            <span><span className="dot green" />{providerOps.users.hostedSeedProofs} seed proofs</span>
            <span><span className="dot amber" />{providerOps.users.optInGates} opt-in gates</span>
            <span><span className="dot blue" />{providerOps.users.userManagementRequiredEnv.length} user env</span>
          </div>
        </article>
      </div>

      <AdminPortalCommandCenter
        activeSection={activeAdminSection}
        area={activePortalArea}
        navigation={adminPortal.navigation}
        onQuery={setAdminPortalQuery}
        onSection={setActiveAdminSection}
        onStatus={setAdminPortalStatus}
        query={adminPortalQuery}
        records={filteredPortalRecords}
        status={adminPortalStatus}
        summary={adminPortal.summary}
      />

      <div className="adminGrid">
        <AdminOperationsWorkflowView workflow={adminOperationsWorkflow} />

        <article className="toolPanel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Dry-run runtime</p>
              <h3>No-network readiness</h3>
            </div>
            <StatusChip icon={ShieldCheck} label="No fetch" tone="green" />
          </div>
          <div className="runtimeGrid" aria-label="Provider runtime dry-run readiness">
            <Metric label="Local-ready" value={`${runtimeSummary.localResult}`} />
            <Metric label="Request-ready" value={`${runtimeSummary.preparedRequest}`} />
            <Metric label="Blocked" value={`${runtimeSummary.blocked}`} />
            <Metric label="Credential gaps" value={`${runtimeSummary.missingCredentials}`} />
          </div>
          <p className="panelNote">
            Credential-gated providers stay blocked here until env values and safety gates are explicitly present.
          </p>
        </article>

        <article className="toolPanel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Coverage</p>
              <h3>Capability matrix</h3>
            </div>
            <Cloud size={18} />
          </div>
          <div className="coverageList">
            {model.coverage.capabilities.map((capability) => (
              <div className="coverageLine" key={capability.capability}>
                <div>
                  <strong>{capability.label}</strong>
                  <span>
                    {capability.readyLocal} ready / {capability.total} total
                  </span>
                </div>
                <meter
                  aria-label={`${capability.label} ready-local adapter coverage`}
                  max={Math.max(capability.total, 1)}
                  min={0}
                  title={`${capability.readyLocal} of ${capability.total} adapters ready locally`}
                  value={capability.readyLocal}
                />
              </div>
            ))}
          </div>
        </article>

        <article className="toolPanel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Provider setup</p>
              <h3>Selected env routing</h3>
            </div>
            <KeyRound size={18} />
          </div>
          <div className="envChipGrid">
            {visibleProviderEnv.length === 0 ? <span>Selected provider env satisfied</span> : null}
            {visibleProviderEnv.map((envVar) => (
              <span key={envVar}>{envVar}</span>
            ))}
            {hiddenProviderEnvCount > 0 && <span>{`+${hiddenProviderEnvCount} more`}</span>}
          </div>
          <p className="panelNote">
            Only selected provider adapters are shown here, not the whole Provider Catalog.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">AI operations</p>
              <h3>AI queue operations</h3>
            </div>
            <StatusChip icon={RefreshCw} label="Queue gated" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="AI queue operations readiness">
            <Metric label="Controls" value={`${aiQueueOperationsSummary.total}`} />
            <Metric label="Metrics" value={`${aiQueueOperationsSummary.metricsTracked}`} />
            <Metric label="Alert rules" value={`${aiQueueOperationsSummary.alertThresholds}`} />
            <Metric label="Human owned" value={`${aiQueueOperationsSummary.humanOwnedControls}`} />
            <Metric label="DLQ controls" value={`${aiQueueOperationsSummary.deadLetterControls}`} />
            <Metric label="Live calls" value={`${aiQueueOperationsSummary.liveProviderCalls}`} />
          </div>
          <AiQueueOperationsList items={aiQueueOperationsItems} />
          <p className="panelNote">
            These are queue admission, worker retry/dead-letter, status polling, payload minimization, alert threshold, and human escalation contracts.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Cost controls</p>
              <h3>Provider governance</h3>
            </div>
            <StatusChip icon={ShieldCheck} label="Budget capped" tone="green" />
          </div>
          <div className="runtimeGrid" aria-label="Provider cost and rate governance">
            <Metric label="Zero spend" value={`${providerGovernance.zeroPlatformSpend}`} />
            <Metric label="Budget capped" value={`${providerGovernance.budgetCapped}`} />
            <Metric label="Blocked zero spend" value={`${providerGovernance.blockedZeroSpend}`} />
            <Metric label="Rate limited" value={`${providerGovernance.rateLimited}`} />
            <Metric label="Queued" value={`${providerGovernance.queueRequired}`} />
            <Metric label="Max request" value={formatCents(providerGovernance.maxPerRequestBudgetCents)} />
            <Metric label="Configured budget" value={formatCents(providerOps.usage.monthlyBudgetCents)} />
            <Metric label="Est. spend" value={formatCents(providerOps.usage.reservedOrSpentCents)} />
            <Metric label="Actual spend" value={formatCents(providerOps.usage.actualSpendCents)} />
            <Metric label="Req capacity" value={`${providerOps.usage.estimatedMonthlyRequestsAtBudget}`} />
            <Metric label="Provider sources" value={`${providerOps.usage.providerSourcedMetricAdapters}`} />
            <Metric label="Ledger-only" value={`${providerOps.usage.localLedgerMetricAdapters}`} />
          </div>
          <p className="panelNote">
            Env-configured provider flows stay budget-capped with provider-sourced metrics reconciled into the local ledger.
          </p>
        </article>

        <AiFlowConfigPanel
          configs={aiFlowConfigs}
          summary={aiFlowSummary}
          onChange={onAiFlowConfigsChange}
        />

        <AiGenerationJobsPanel jobs={aiGenerationJobs} />

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Localization</p>
              <h3>Locale readiness</h3>
            </div>
            <StatusChip icon={Globe2} label="Copy gated" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="Admin localization readiness">
            <Metric label="Supported" value={`${localizationSummary.supportedLocales}`} />
            <Metric label="Customer visible" value={`${localizationSummary.customerVisible}`} />
            <Metric label="RTL review" value={`${localizationSummary.rtlLocales}`} />
            <Metric label="Copy review" value={`${localizationSummary.copyReviewRequired}`} />
            <Metric label="Bundles" value={`${localizationSummary.completeBundles}`} />
            <Metric label="Live translate" value={localizationSummary.liveTranslationProvider ? "On" : "Off"} />
          </div>
          <p className="panelNote">
            Non-English and RTL card copy stays behind human review before any live translation provider is connected.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Production</p>
              <h3>Launch gates</h3>
            </div>
            <StatusChip icon={Lock} label="Evidence required" tone="red" />
          </div>
          <div className="runtimeGrid" aria-label="Production launch gate readiness">
            <Metric label="Tracked" value={`${productionReadiness.total}`} />
            <Metric label="Evidence missing" value={`${productionReadiness.evidenceMissing}`} />
            <Metric label="Blocked" value={`${productionReadiness.blocked}`} />
            <Metric label="Live enabled" value={`${productionReadiness.liveEnabled}`} />
          </div>
          <ProductionGateList gates={productionLaunchGates} />
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Verification</p>
              <h3>End-to-end coverage</h3>
            </div>
            <StatusChip
              icon={ClipboardCheck}
              label={`${e2eCoverageSummary.covered}/${e2eCoverageSummary.total} mapped journeys (repo-local)`}
              tone="amber"
            />
          </div>
          <div className="runtimeGrid" aria-label="End-to-end coverage readiness">
            <Metric label="Journeys" value={`${e2eCoverageSummary.total}`} />
            <Metric label="Covered" value={`${e2eCoverageSummary.covered}`} />
            <Metric label="Browser smoke" value={`${e2eCoverageSummary.browserSmokeCovered}`} />
            <Metric label="API/contracts" value={`${e2eCoverageSummary.contractTestCovered}`} />
            <Metric label="Doctors" value={`${e2eCoverageSummary.doctorCovered}`} />
            <Metric label="Live proofs" value={`${e2eCoverageSummary.liveProductionProofs}`} />
          </div>
          <E2eCoverageList items={e2eCoverageItems} />
          <p className="panelNote">
            This matrix maps repo-local reviewer workflows and CI-gated doctors against a hand-maintained journey list; live production auth, real payments, direct printer orders, signed native artifacts, and external audits remain outside this proof.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Mobile</p>
              <h3>Mobile render readiness</h3>
            </div>
            <StatusChip icon={Smartphone} label="Emulator proof missing" tone="red" />
          </div>
          <div className="runtimeGrid" aria-label="Mobile native render readiness">
            <Metric label="Items" value={`${mobileRenderReadinessSummary.total}`} />
            <Metric label="Screens" value={`${mobileRenderReadinessSummary.screenSections}`} />
            <Metric label="Viewports" value={`${mobileRenderReadinessSummary.viewportProfiles}`} />
            <Metric label="Profiles" value={`${mobileRenderReadinessSummary.nativeBuildProfiles}`} />
            <Metric label="Emulator req." value={`${mobileRenderReadinessSummary.emulatorRequired}`} />
            <Metric label="Emulator proof" value={`${mobileRenderReadinessSummary.emulatorRenderProofs}`} />
            <Metric label="Signed artifacts" value={`${mobileRenderReadinessSummary.signedArtifacts}`} />
            <Metric label="Live calls" value={`${mobileRenderReadinessSummary.liveProviderCalls}`} />
          </div>
          <MobileRenderReadinessList items={mobileRenderReadinessItems} />
          <p className="panelNote">
            These are source-render, viewport, customer-flow, RTL, preview-profile, emulator, and signed-artifact
            readiness contracts; not an emulator render proof or signed native build.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Hosted API</p>
              <h3>Hosted API proof readiness</h3>
            </div>
            <StatusChip icon={Cloud} label="Public DB proof missing" tone="red" />
          </div>
          <div className="runtimeGrid" aria-label="Hosted API Vercel and database proof readiness">
            <Metric label="Items" value={`${hostedApiReadinessSummary.total}`} />
            <Metric label="Routes" value={`${hostedApiReadinessSummary.routeContracts}`} />
            <Metric label="Env vars" value={`${hostedApiReadinessSummary.requiredEnvVars}`} />
            <Metric label="Hosted DB req." value={`${hostedApiReadinessSummary.hostedDbRequired}`} />
            <Metric label="Public proof req." value={`${hostedApiReadinessSummary.publicRouteProofRequired}`} />
            <Metric label="Env proof" value={`${hostedApiReadinessSummary.envSyncProofs}`} />
            <Metric label="DB proof" value={`${hostedApiReadinessSummary.hostedDbProofs}`} />
            <Metric label="Token proof" value={`${hostedApiReadinessSummary.hostedTokenVerificationProofs}`} />
          </div>
          <HostedApiReadinessList items={hostedApiReadinessItems} />
          <p className="panelNote">
            These are Vercel deployment, serverless route, environment, hosted Postgres, token verification, and backup
            readiness contracts; not public DB-backed Vercel proof or hosted account-token verification.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Reviewer database</p>
              <h3>Reviewer DB seed readiness</h3>
            </div>
            <StatusChip icon={KeyRound} label="Hosted seed proof missing" tone="red" />
          </div>
          <div className="runtimeGrid" aria-label="Reviewer database seed and account-token proof readiness">
            <Metric label="Items" value={`${reviewerDbSeedReadinessSummary.total}`} />
            <Metric label="Tables" value={`${reviewerDbSeedReadinessSummary.tableContracts}`} />
            <Metric label="Routes" value={`${reviewerDbSeedReadinessSummary.routeContracts}`} />
            <Metric label="Env vars" value={`${reviewerDbSeedReadinessSummary.requiredEnvVars}`} />
            <Metric label="Seed req." value={`${reviewerDbSeedReadinessSummary.hostedSeedExecutionRequired}`} />
            <Metric label="Token req." value={`${reviewerDbSeedReadinessSummary.hostedTokenProbeRequired}`} />
            <Metric label="Seed proof" value={`${reviewerDbSeedReadinessSummary.hostedSeedProofs}`} />
            <Metric label="Token proof" value={`${reviewerDbSeedReadinessSummary.hostedTokenProbeProofs}`} />
          </div>
          <ReviewerDbSeedReadinessList items={reviewerDbSeedReadinessItems} />
          <p className="panelNote">
            These are reviewer seed-plan, SQL-preview, Vercel env, hosted migration, token-probe, and rollback
            contracts; not hosted reviewer DB mutation or hosted account-token proof.
          </p>
        </article>

        <article className="toolPanel adminWide cloudProofCard">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Cloud artifacts</p>
              <h3>Cloud artifact proof readiness</h3>
            </div>
            <StatusChip icon={Cloud} label="Applied proof missing" tone="red" />
          </div>
          <div className="cloudProofOverview" aria-label="Cloud artifact bucket IAM and signed URL proof readiness">
            <div>
              <span>Repo-local ready</span>
              <strong>{cloudArtifactProofReadinessSummary.repoLocalReady}</strong>
            </div>
            <div>
              <span>Applied req.</span>
              <strong>{cloudArtifactProofReadinessSummary.appliedCloudRequired}</strong>
            </div>
            <div>
              <span>TF files</span>
              <strong>{cloudArtifactProofReadinessSummary.terraformFileContracts}</strong>
            </div>
            <div>
              <span>Env outputs</span>
              <strong>{cloudArtifactProofReadinessSummary.envOutputContracts}</strong>
            </div>
            <div>
              <span>Bucket proof</span>
              <strong>{cloudArtifactProofReadinessSummary.appliedBucketArnProofs}</strong>
            </div>
            <div>
              <span>IAM proof</span>
              <strong>{cloudArtifactProofReadinessSummary.iamPolicyOutputProofs}</strong>
            </div>
            <div>
              <span>URL proof</span>
              <strong>{cloudArtifactProofReadinessSummary.signedUrlProbeProofs}</strong>
            </div>
            <div>
              <span>Restore proof</span>
              <strong>{cloudArtifactProofReadinessSummary.restoreDrillProofs}</strong>
            </div>
          </div>
          <CloudArtifactProofReadinessList items={cloudArtifactProofReadinessItems} />
          <p className="panelNote">
            These are Terraform source, plan review, applied bucket, IAM output, signed URL, access log, secret-sync, and
            restore-drill contracts; not live-applied cloud bucket/IAM proof.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Business engagement</p>
              <h3>Business engagement readiness</h3>
            </div>
            <StatusChip icon={RefreshCw} label="Live sends off" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="Business CRM lifecycle engagement readiness">
            <Metric label="Items" value={`${businessEngagementReadinessSummary.total}`} />
            <Metric label="CRM adapters" value={`${businessEngagementReadinessSummary.crmAdapterContracts}`} />
            <Metric label="Workflows" value={`${businessEngagementReadinessSummary.workflowAdapterContracts}`} />
            <Metric label="Channels" value={`${businessEngagementReadinessSummary.notificationAdapterContracts}`} />
            <Metric label="Triggers" value={`${businessEngagementReadinessSummary.lifecycleTriggerKinds}`} />
            <Metric label="Opt-in gates" value={`${businessEngagementReadinessSummary.optInRequired}`} />
            <Metric label="OAuth req." value={`${businessEngagementReadinessSummary.liveOAuthRequired}`} />
            <Metric label="Live sends" value={`${businessEngagementReadinessSummary.liveMessagesEnabled}`} />
          </div>
          <BusinessEngagementReadinessList items={businessEngagementReadinessItems} />
          <p className="panelNote">
            These are CRM lifecycle source, trigger, approval, workflow, message-channel, consent, and feedback-loop
            contracts; not live CRM OAuth, customer messaging, CRM writeback, or production campaign analytics proof.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">AI operations</p>
              <h3>AI provider readiness</h3>
            </div>
            <StatusChip icon={WandSparkles} label="Live AI off" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="AI text and image provider readiness">
            <Metric label="Items" value={`${aiProviderReadinessSummary.total}`} />
            <Metric label="Text providers" value={`${aiProviderReadinessSummary.textProviderContracts}`} />
            <Metric label="Image providers" value={`${aiProviderReadinessSummary.imageProviderContracts}`} />
            <Metric label="Local fallbacks" value={`${aiProviderReadinessSummary.localFallbacks}`} />
            <Metric label="Prompt audits" value={`${aiProviderReadinessSummary.promptAuditRequired}`} />
            <Metric label="Human review" value={`${aiProviderReadinessSummary.humanReviewRequired}`} />
            <Metric label="Evidence gaps" value={`${aiProviderReadinessSummary.evidenceMissing}`} />
            <Metric label="Live calls" value={`${aiProviderReadinessSummary.liveProviderCallsEnabled}`} />
          </div>
          <AiProviderReadinessList items={aiProviderReadinessItems} />
          <p className="panelNote">
            These are text/image adapter, model allowlist, prompt audit, privacy, print QA, spend, evaluation, and rollout contracts; no live AI generation or model traffic is claimed.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Operations</p>
              <h3>Observability readiness</h3>
            </div>
            <StatusChip icon={Cloud} label="Live ingestion off" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="Observability telemetry and alerting readiness">
            <Metric label="Items" value={`${observabilitySummary.total}`} />
            <Metric label="Repo-local" value={`${observabilitySummary.repoLocalReady}`} />
            <Metric label="Evidence gaps" value={`${observabilitySummary.evidenceMissing}`} />
            <Metric label="Providers" value={`${observabilitySummary.providerContracts}`} />
            <Metric label="Alert routes" value={`${observabilitySummary.alertRoutesRequired}`} />
            <Metric label="PII redacted" value={`${observabilitySummary.piiRedacted}`} />
            <Metric label="Max retention" value={`${observabilitySummary.maxRetentionDays}d`} />
            <Metric label="Live ingestion" value={`${observabilitySummary.liveIngestionEnabled}`} />
          </div>
          <ObservabilityReadinessList items={observabilityItems} />
          <p className="panelNote">
            These are schema, redaction, sampling, retention, provider, and alert-route contracts; no live telemetry
            ingestion or production alert delivery is claimed.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Fulfillment</p>
              <h3>Retail fulfillment readiness</h3>
            </div>
            <StatusChip icon={Store} label="Direct orders off" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="Retail quote order and print fulfillment readiness">
            <Metric label="Items" value={`${retailFulfillmentSummary.total}`} />
            <Metric label="Retail adapters" value={`${retailFulfillmentSummary.liveVendorAdapterContracts}`} />
            <Metric label="Manual fallbacks" value={`${retailFulfillmentSummary.manualFallbacks}`} />
            <Metric label="Recovery events" value={`${retailFulfillmentSummary.recoveryDrillEvents}`} />
            <Metric label="Live quotes" value={`${retailFulfillmentSummary.liveQuoteEnabled}`} />
            <Metric label="Direct orders" value={`${retailFulfillmentSummary.directOrderEnabled}`} />
            <Metric label="Real payments" value={`${retailFulfillmentSummary.realPaymentsEnabled}`} />
            <Metric label="Print certs" value={`${retailFulfillmentSummary.physicalCertificationAttached}`} />
          </div>
          <RetailFulfillmentReadinessList items={retailFulfillmentItems} />
          <p className="panelNote">
            These are manual handoff, public pricing, quote, certification, kill-switch, recovery, payment, and
            physical-QA contracts; not live retail ordering or physical print certification.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Commerce</p>
              <h3>Payment readiness</h3>
            </div>
            <StatusChip icon={CreditCard} label="Live charges off" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="Payment charge refund and reconciliation readiness">
            <Metric label="Items" value={`${paymentReadinessSummary.total}`} />
            <Metric label="Providers" value={`${paymentReadinessSummary.paymentProviderContracts}`} />
            <Metric label="Fallbacks" value={`${paymentReadinessSummary.localFallbacks}`} />
            <Metric label="Ledger events" value={`${paymentReadinessSummary.ledgerEvents}`} />
            <Metric label="Webhooks" value={`${paymentReadinessSummary.webhookSignatureRequired}`} />
            <Metric label="Live charges" value={`${paymentReadinessSummary.liveChargesEnabled}`} />
            <Metric label="Live refunds" value={`${paymentReadinessSummary.liveRefundsEnabled}`} />
            <Metric label="PCI claims" value={`${paymentReadinessSummary.pciScopeApproved}`} />
          </div>
          <PaymentReadinessList items={paymentReadinessItems} />
          <p className="panelNote">
            These are no-payment fallback, sandbox payment, idempotency, card-storage, webhook, charge/capture,
            refund/dispute, and reconciliation contracts; not live payment processing.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Review evidence</p>
              <h3>External audit readiness</h3>
            </div>
            <StatusChip icon={ClipboardCheck} label="External proof missing" tone="red" />
          </div>
          <div className="runtimeGrid" aria-label="External audit readiness">
            <Metric label="Items" value={`${externalAuditSummary.total}`} />
            <Metric label="Internal baseline" value={`${externalAuditSummary.internalBaselineReady}`} />
            <Metric label="Evidence missing" value={`${externalAuditSummary.externalEvidenceMissing}`} />
            <Metric label="Cert blocked" value={`${externalAuditSummary.certificationBlocked}`} />
            <Metric label="Public claims" value={`${externalAuditSummary.publicClaimsAllowed}`} />
            <Metric label="Attached proof" value={`${externalAuditSummary.externalArtifactsAttached}`} />
          </div>
          <ExternalAuditList items={externalAuditItems} />
          <p className="panelNote">
            Internal doctors are readiness inputs only; external audit reports, signed native artifacts, public hosted DB proof, retail certification, and physical print certification are not attached.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Legal</p>
              <h3>EU and US legal readiness</h3>
            </div>
            <StatusChip icon={Globe2} label="Free tools only" tone="amber" />
          </div>
          <div className="runtimeGrid" aria-label="EU and US legal compliance readiness">
            <Metric label="Items" value={`${legalComplianceSummary.total}`} />
            <Metric label="EU" value={`${legalComplianceSummary.euRequirements}`} />
            <Metric label="US" value={`${legalComplianceSummary.usRequirements}`} />
            <Metric label="Free tools" value={`${legalComplianceSummary.freeToolOptions}`} />
            <Metric label="Open source" value={`${legalComplianceSummary.openSourceToolOptions}`} />
            <Metric label="Review req." value={`${legalComplianceSummary.externalReviewRequired}`} />
            <Metric label="Launch blocked" value={`${legalComplianceSummary.launchBlocked}`} />
            <Metric label="Public claims" value={`${legalComplianceSummary.publicClaimsAllowed}`} />
          </div>
          <LegalComplianceList items={legalComplianceItems} />
          <p className="panelNote">
            These rows track EU/US legal requirements and free policy/CMP paths; they are not attorney-approved
            policies and they keep launch blocked until evidence is attached.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Provider queue</p>
              <h3>Gated adapters</h3>
            </div>
            <StatusChip icon={Lock} label={`${model.gatedProviders.length} gated`} tone="red" />
          </div>
          <AdapterMiniList adapters={model.gatedProviders.slice(0, 12)} />
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Business systems</p>
              <h3>CRM and workflow integrations</h3>
            </div>
            <StatusChip icon={RefreshCw} label={`${model.integrationAdapters.length} integrations`} tone="blue" />
          </div>
          <AdapterMiniList adapters={model.integrationAdapters.slice(0, 14)} />
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Deployment</p>
              <h3>Cloud readiness</h3>
            </div>
            <StatusChip icon={Cloud} label="IaC present" tone="green" />
          </div>
          <AdapterMiniList adapters={model.deploymentAdapters} />
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Scaling</p>
              <h3>Capacity profiles</h3>
            </div>
            <StatusChip icon={PackageCheck} label="Cheap to scale" tone="green" />
          </div>
          <div className="runtimeGrid" aria-label="Capacity profile readiness">
            <Metric label="Profiles" value={`${capacitySummary.total}`} />
            <Metric label="Max daily cards" value={`${capacitySummary.maxDailyCards}`} />
            <Metric label="Image budget" value={`${capacitySummary.maxDailyImageGenerations}`} />
            <Metric label="Queue-backed profiles" value={`${capacitySummary.queueBackedProfiles}`} />
            <Metric label="Live calls" value={`${capacitySummary.liveProviderCalls}`} />
            <Metric label="Real orders" value={`${capacitySummary.realOrdersEnabled}`} />
          </div>
          <div className="capacityProfileList">
            {capacityProfiles.map((profile) => (
              <div className="capacityProfile" key={profile.id}>
                <div>
                  <strong>{profile.label}</strong>
                  <span>{profile.runtimeShape}</span>
                </div>
                <small>
                  {profile.dailyCardCapacity} cards/day / {profile.dailyImageGenerationBudget} image generations/day
                </small>
              </div>
            ))}
          </div>
          <p className="panelNote">
            These are planning contracts, not measured production benchmarks; live traffic remains blocked until evidence gates pass.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Order safety</p>
              <h3>Blocked live vendors</h3>
            </div>
            <StatusChip icon={XCircle} label="Real orders off" tone="red" />
          </div>
          <AdapterMiniList adapters={model.blockedProviders} />
        </article>
      </div>
    </section>
  );
}

function AdminPortalCommandCenter({
  activeSection,
  area,
  navigation,
  onQuery,
  onSection,
  onStatus,
  query,
  records,
  status,
  summary
}: {
  activeSection: AdminPortalSectionId;
  area: AdminPortalArea;
  navigation: AdminPortalModel["navigation"];
  onQuery: (query: string) => void;
  onSection: (section: AdminPortalSectionId) => void;
  onStatus: (status: AdminPortalStatusFilter) => void;
  query: string;
  records: AdminPortalRecord[];
  status: AdminPortalStatusFilter;
  summary: AdminPortalModel["summary"];
}) {
  return (
    <article className="toolPanel adminWide adminPortalCard">
      <div className="sectionHeader compact">
        <div>
          <p className="eyebrow">Command center</p>
          <h3>Admin portal</h3>
        </div>
        <StatusChip icon={ShieldCheck} label="Live actions off" tone="green" />
      </div>

      <div className="adminPortalSummaryGrid" aria-label="Admin portal safety summary">
        <Metric label="Areas" value={`${summary.sections}`} />
        <Metric label="Order queues" value={`${summary.orderQueues}`} />
        <Metric label="User queues" value={`${summary.userQueues}`} />
        <Metric label="Asset queues" value={`${summary.assetQueues}`} />
        <Metric label="Provider queues" value={`${summary.providerQueues}`} />
        <Metric label="Live mutations" value={`${summary.liveMutationsEnabled}`} />
        <Metric label="Raw content" value={`${summary.rawContentExposed}`} />
      </div>

      <div className="adminPortalTabs" role="tablist" aria-label="Admin portal sections">
        {navigation.map((item) => (
          <button
            aria-selected={item.id === activeSection}
            className={`adminPortalTab ${item.status}${item.id === activeSection ? " active" : ""}`}
            key={item.id}
            onClick={() => onSection(item.id)}
            role="tab"
            type="button"
          >
            {adminPortalIcon(item.id)}
            <span>{item.label}</span>
            <em>{item.count}</em>
          </button>
        ))}
      </div>

      <div className="adminPortalToolbar" aria-label="Admin portal filters">
        <label className="searchField">
          <Search size={16} />
          <span>Search portal</span>
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Owner, source, action"
          />
        </label>
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => onStatus(event.target.value as AdminPortalStatusFilter)}>
            <option value="all">All statuses</option>
            <option value="ready">Ready</option>
            <option value="attention">Attention</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
        <div className="adapterToolbarCount">
          <strong>{records.length}</strong>
          <span>shown</span>
        </div>
      </div>

      <div className="adminPortalAreaHeader">
        <div>
          <p className="eyebrow">{area.eyebrow}</p>
          <h4>{area.label}</h4>
        </div>
        <p>{area.summary}</p>
      </div>

      <div className="runtimeGrid compactMetrics" aria-label={`${area.label} metrics`}>
        {area.metrics.map((metric) => (
          <Metric key={`${area.id}-${metric.label}`} label={metric.label} value={metric.value} />
        ))}
      </div>

      <div className="adminPortalControlStrip" aria-label={`${area.label} controls`}>
        {area.controls.map((control) => (
          <label className="adminPortalControl" key={control.id}>
            <input aria-label={control.label} checked={control.enabled} readOnly type="checkbox" />
            <span>
              <strong>{control.label}</strong>
              <small>{control.detail}</small>
            </span>
            <em>{control.enabled ? "On" : "Off"}</em>
          </label>
        ))}
      </div>

      <AdminPortalOrderQueue rows={area.orderQueue ?? []} />

      <AdminPortalRecordGrid records={records} />
    </article>
  );
}

function AdminPortalOrderQueue({ rows }: { rows: AdminPortalOrderQueueItem[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="adminOrderQueue" aria-label="Order status queue">
      <div className="adminOrderQueueHeader">
        <div>
          <p className="eyebrow">Order queue</p>
          <h4>Tracked order status</h4>
        </div>
        <StatusChip icon={PackageCheck} label={`${rows.length} rows`} tone="blue" />
      </div>
      <div className="adminOrderRows">
        {rows.map((row) => (
          <article className="adminOrderRow" key={row.id}>
            <div className="adminOrderMain">
              <strong>{row.id}</strong>
              <span>{row.customer}</span>
            </div>
            <div>
              <span>Project</span>
              <strong>{row.projectId}</strong>
            </div>
            <div>
              <span>Provider</span>
              <strong>{row.provider}</strong>
            </div>
            <div>
              <span>Status</span>
              <em>{orderStatusLabel(row.status)}</em>
            </div>
            <div>
              <span>Quote</span>
              <strong>{row.quote}</strong>
            </div>
            <div>
              <span>Pickup</span>
              <strong>{row.pickup}</strong>
            </div>
            <p>{row.nextAction}</p>
            <div className="adminOrderEvidence">
              <span>{row.source}</span>
              {row.evidence.slice(0, 3).map((evidence) => (
                <span key={`${row.id}-${evidence}`}>{evidence}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminPortalRecordGrid({ records }: { records: AdminPortalRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="adminPortalEmpty">
        <Info size={18} />
        <span>No admin records match the current filters.</span>
      </div>
    );
  }

  return (
    <div className="adminPortalRecordGrid" aria-label="Admin portal records">
      {records.map((record) => (
        <article className={`adminPortalRecord ${record.status}`} key={record.id}>
          <div className="adminPortalRecordHeader">
            <div className="adminPortalRecordTitle">
              <span className="adminPortalRecordIcon">{adminPortalRecordIcon(record)}</span>
              <div>
                <span>{record.domain}</span>
                <strong>{record.label}</strong>
              </div>
            </div>
            <em>{adminPortalStatusLabel(record.status)}</em>
          </div>
          <p>{record.detail}</p>
          <div className="adminPortalAction">
            <strong>Action</strong>
            <span>{record.action}</span>
          </div>
          <div className="adminPortalEvidence">
            {record.evidence.slice(0, 4).map((evidence) => (
              <span key={`${record.id}-${evidence}`}>{evidence}</span>
            ))}
          </div>
          <div className="adminPortalMeta">
            <span>{record.owner}</span>
            <span>{record.source}</span>
            <span>{adminPortalRiskLabel(record.risk)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function AiFlowConfigPanel({
  configs,
  summary,
  onChange
}: {
  configs: AiFlowAdminConfig[];
  summary: AiFlowConfigSummary;
  onChange: (configs: AiFlowAdminConfig[]) => void;
}) {
  const configById = new Map(configs.map((config) => [config.flowId, config]));

  function patchFlow(flowId: AiFlowAdminConfig["flowId"], patch: Partial<AiFlowAdminConfig>) {
    onChange(configs.map((config) => (config.flowId === flowId ? { ...config, ...patch } : config)));
  }

  return (
    <article className="toolPanel adminWide aiFlowPanel">
      <div className="sectionHeader compact">
        <div>
          <p className="eyebrow">AI control plane</p>
          <h3>Flow provider policy</h3>
        </div>
        <StatusChip
          icon={WandSparkles}
          label={`${summary.readyForLiveCalls}/${summary.total} live-ready`}
          tone={summary.readyForLiveCalls > 0 ? "green" : "amber"}
        />
      </div>

      <div className="runtimeGrid compactMetrics" aria-label="AI flow policy summary">
        <Metric label="Live toggled" value={`${summary.liveEnabled}`} />
        <Metric label="Queued" value={`${summary.queued}`} />
        <Metric label="Fallback queue" value={`${summary.fallbackQueued}`} />
        <Metric label="Blocked" value={`${summary.blocked}`} />
      </div>

      <div className="aiFlowRows" aria-label="AI flow provider configuration">
        {summary.flows.map((flow) => {
          const config = configById.get(flow.flowId);
          if (!config) return null;
          const metricSource = providerOpsMetricSourceForAdapter(config.primaryAdapterId);
          return (
            <section className="aiFlowRow" key={flow.flowId}>
              <div className="aiFlowRowHeader">
                <div>
                  <strong>{flow.label}</strong>
                  <span>{flow.capability}</span>
                </div>
                <StatusChip
                  icon={flow.readyForLiveCalls ? CircleCheck : Lock}
                  label={flow.readyForLiveCalls ? "Ready" : "Fallback"}
                  tone={flow.readyForLiveCalls ? "green" : "amber"}
                />
              </div>

              <div className="aiFlowControls">
                <label className="fieldStack">
                  <span>Provider</span>
                  <select
                    value={config.primaryAdapterId}
                    onChange={(event) => patchFlow(flow.flowId, { primaryAdapterId: event.target.value })}
                  >
                    {flow.allowedAdapterIds.map((adapterId) => (
                      <option key={adapterId} value={adapterId}>
                        {providerAdapterLabel(adapterId)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="fieldStack">
                  <span>Fallback</span>
                  <select
                    value={config.fallbackAdapterId}
                    onChange={(event) => patchFlow(flow.flowId, { fallbackAdapterId: event.target.value })}
                  >
                    {flow.allowedAdapterIds.map((adapterId) => (
                      <option key={adapterId} value={adapterId}>
                        {providerAdapterLabel(adapterId)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="fieldStack">
                  <span>Model</span>
                  <input
                    value={config.model}
                    onChange={(event) => patchFlow(flow.flowId, { model: event.target.value })}
                  />
                </label>

                <label className="fieldStack">
                  <span>Rate/min</span>
                  <input
                    min={1}
                    type="number"
                    value={config.rateLimitPerMinute}
                    onChange={(event) => patchFlow(flow.flowId, { rateLimitPerMinute: Number(event.target.value) })}
                  />
                </label>

                <label className="fieldStack">
                  <span>Max/request</span>
                  <input
                    min={0}
                    type="number"
                    value={config.perRequestBudgetCents}
                    onChange={(event) => patchFlow(flow.flowId, { perRequestBudgetCents: Number(event.target.value) })}
                  />
                </label>

                <label className="fieldStack">
                  <span>Monthly</span>
                  <input
                    min={0}
                    type="number"
                    value={config.monthlyBudgetCents}
                    onChange={(event) => patchFlow(flow.flowId, { monthlyBudgetCents: Number(event.target.value) })}
                  />
                </label>
              </div>

              <div className="aiFlowToggleRow">
                <label>
                  <input
                    checked={config.liveProviderCallsEnabled}
                    onChange={(event) => patchFlow(flow.flowId, { liveProviderCallsEnabled: event.target.checked })}
                    type="checkbox"
                  />
                  <span>Live provider</span>
                </label>
                <label>
                  <input
                    checked={config.queueEnabled}
                    onChange={(event) => patchFlow(flow.flowId, { queueEnabled: event.target.checked })}
                    type="checkbox"
                  />
                  <span>Queue primary</span>
                </label>
                <label>
                  <input
                    checked={config.fallbackQueueEnabled}
                    onChange={(event) => patchFlow(flow.flowId, { fallbackQueueEnabled: event.target.checked })}
                    type="checkbox"
                  />
                  <span>Queue fallback</span>
                </label>
              </div>

              <label className="fieldStack aiPromptField">
                <span>Prompt instructions</span>
                <textarea
                  value={config.promptInstructions}
                  onChange={(event) => patchFlow(flow.flowId, { promptInstructions: event.target.value })}
                />
              </label>

              <div className="aiFlowMeta">
                <span>{formatCents(config.perRequestBudgetCents)} max/request</span>
                <span>{formatCents(config.monthlyBudgetCents)} monthly</span>
                <span>{metricSource.label}</span>
                <span>{metricSource.usageUnit}</span>
                {flow.blockedReasons.slice(0, 2).map((reason) => (
                  <span key={`${flow.flowId}-${reason}`}>{reason}</span>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function AiGenerationJobsPanel({ jobs }: { jobs: AiGenerationJobEvidence[] }) {
  const latestJobs = jobs.slice(0, 5);
  const totalImages = jobs.reduce((total, job) => total + job.imageCount, 0);
  const failedProviders = jobs.filter((job) => job.textProviderFailure || job.imageProviderFailure).length;

  return (
    <article className="toolPanel adminWide aiJobsPanel">
      <div className="sectionHeader compact">
        <div>
          <p className="eyebrow">AI job evidence</p>
          <h3>Generation jobs</h3>
        </div>
        <StatusChip icon={Image} label={`${jobs.length} recent`} tone={jobs.length > 0 ? "green" : "amber"} />
      </div>

      <div className="runtimeGrid compactMetrics" aria-label="AI generation job summary">
        <Metric label="Jobs" value={`${jobs.length}`} />
        <Metric label="Panels generated" value={`${totalImages}`} />
        <Metric label="Provider issues" value={`${failedProviders}`} />
        <Metric label="History cap" value="10" />
      </div>

      {latestJobs.length === 0 ? (
        <div className="adminPortalEmpty">
          <Info size={18} />
          <span>Generate an AI card to capture per-panel prompts, providers, and generated artwork here.</span>
        </div>
      ) : (
        <div className="aiJobList" aria-label="Recent AI generation jobs">
          {latestJobs.map((job) => (
            <section className={`aiJobRow ${job.status}`} key={job.id}>
              <div className="aiJobHeader">
                <div>
                  <strong>{job.draftId}</strong>
                  <span>{new Date(job.createdAtIso).toLocaleString()} - {job.generatedBy}</span>
                </div>
                <em>{aiGenerationJobStatusLabel(job.status)}</em>
              </div>

              <div className="aiJobMeta">
                <span>Copy: {job.copyProvider} / {job.copyModel}</span>
                <span>Image: {job.imageProvider} / {job.imageModel}</span>
                <span>{job.imageCount}/{job.panelCount} panels</span>
                {job.textProviderFailure ? <span>{job.textProviderFailure}</span> : null}
                {job.imageProviderFailure ? <span>{job.imageProviderFailure}</span> : null}
              </div>

              <div className="aiJobPanelList">
                {job.panels.map((panel) => (
                  <div className={`aiJobPanel ${panel.status}`} key={`${job.id}-${panel.panelId}`}>
                    {panel.imageUrl ? (
                      <img alt={`${panel.label} generated panel`} src={panel.imageUrl} />
                    ) : (
                      <span className="aiJobImageMissing" aria-label={`${panel.label} image missing`}>
                        <Image size={18} />
                      </span>
                    )}
                    <div className="aiJobPanelBody">
                      <div className="aiJobPanelTitle">
                        <strong>{panel.label}</strong>
                        <span>{panel.width} x {panel.height}</span>
                      </div>
                      <p>{panel.headline}</p>
                      <small>{panel.body}</small>
                      {panel.visualCue ? (
                        <details>
                          <summary>Visual cue</summary>
                          <pre>{panel.visualCue}</pre>
                        </details>
                      ) : null}
                      {panel.textLayout ? (
                        <details>
                          <summary>Text layout</summary>
                          <pre>{JSON.stringify(panel.textLayout, null, 2)}</pre>
                        </details>
                      ) : null}
                      <details>
                        <summary>Image prompt</summary>
                        <pre>{panel.revisedPrompt || panel.imagePrompt || "No image prompt captured."}</pre>
                      </details>
                      {panel.negativePrompt ? (
                        <details>
                          <summary>Negative prompt</summary>
                          <pre>{panel.negativePrompt}</pre>
                        </details>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}

function aiGenerationJobStatusLabel(status: AiGenerationJobEvidence["status"]): string {
  const labels: Record<AiGenerationJobEvidence["status"], string> = {
    "copy-only": "Copy only",
    partial: "Partial",
    succeeded: "Generated"
  };
  return labels[status];
}

function AdminOperationsWorkflowView({ workflow }: { workflow: AdminOperationsWorkflow }) {
  return (
    <article className="toolPanel adminWide adminOperationsCard">
      <div className="sectionHeader compact">
        <div>
          <p className="eyebrow">Integration ownership</p>
          <h3>Integration owner workflow</h3>
        </div>
        <StatusChip icon={ClipboardCheck} label={`${workflow.summary.p0Tasks} P0 actions`} tone="red" />
      </div>

      <div className="adminOpsOverview" aria-label="Admin operations workflow summary">
        <Metric label="Owners" value={`${workflow.summary.ownerCount}`} />
        <Metric label="Tasks" value={`${workflow.summary.taskCount}`} />
        <Metric label="Evidence req." value={`${workflow.summary.evidenceRequired}`} />
        <Metric label="Credential tasks" value={`${workflow.summary.credentialTasks}`} />
        <Metric label="Blocked" value={`${workflow.summary.blocked}`} />
        <Metric label="Live enabled" value={`${workflow.summary.liveEnabled}`} />
      </div>

      <div className="adminOpsLaneGrid" aria-label="Admin operation owner lanes">
        {workflow.ownerLanes.map((lane) => (
          <div className="adminOpsLane" key={lane.id}>
            <div>
              <strong>{lane.label}</strong>
              <span>{lane.description}</span>
            </div>
            <small>
              {lane.p0Tasks} P0 / {lane.evidenceRequired} evidence
            </small>
          </div>
        ))}
      </div>

      <div className="adminOpsTaskList" aria-label="Priority admin operation tasks">
        {workflow.priorityTasks.map((task) => (
          <AdminOperationTaskRow key={task.id} sourceLabel={workflow.sourceLabels[task.source]} task={task} />
        ))}
      </div>

      <p className="panelNote">
        This is an operator queue, not a live launch switch: every row needs attached evidence before credentials,
        provider calls, payment, telemetry, hosted auth, or retail ordering can move past readiness.
      </p>
    </article>
  );
}

function AdminOperationTaskRow({ sourceLabel, task }: { sourceLabel: string; task: AdminOperationTask }) {
  return (
    <div className={`adminOpsTask ${task.status}`}>
      <div className="adminOpsTaskHeader">
        <div>
          <span>{sourceLabel}</span>
          <strong>{task.label}</strong>
        </div>
        <em>{adminOperationStatusLabel(task.status)}</em>
      </div>
      <p>{task.adminAction}</p>
      <div className="adminOpsTaskEvidence">
        <span>{task.requiredEvidence[0]}</span>
        {task.envVarNames.length > 0 && <small>{task.envVarNames.slice(0, 3).join(", ")}</small>}
      </div>
    </div>
  );
}

export function AdaptersView({ runtimeReadiness }: { runtimeReadiness: Map<string, RuntimeReadiness> }) {
  const [statusFilter, setStatusFilter] = useState<AdapterStatusFilter>("all");
  const [capabilityFilter, setCapabilityFilter] = useState<AdapterCapabilityFilter>("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const sortedAdapters = useMemo(
    () =>
      providerCatalog
        .filter((adapter) => statusFilter === "all" || adapter.status === statusFilter)
        .filter((adapter) => capabilityFilter === "all" || adapter.capability === capabilityFilter)
        .filter((adapter) => {
          if (!normalizedQuery) return true;
          return [adapter.label, adapter.provider, adapter.detail, adapter.lane, capabilityLabels[adapter.capability]]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        })
        .sort((first, second) => first.priority - second.priority || first.label.localeCompare(second.label)),
    [capabilityFilter, normalizedQuery, statusFilter]
  );

  return (
    <section className="adaptersView">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Coverage</p>
          <h2>Adapter readiness</h2>
        </div>
        <StatusChip icon={ShieldCheck} label={`${providerCatalog.length} adapters`} tone="green" />
      </div>

      <div className="adapterToolbar" aria-label="Adapter filters">
        <label className="searchField">
          <Search size={16} />
          <span>Search adapters</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Provider, capability, lane"
          />
        </label>
        <label>
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AdapterStatusFilter)}>
            <option value="all">All statuses</option>
            <option value="ready-local">Ready local</option>
            <option value="credential-gated">Credential gated</option>
            <option value="contract-only">Contract only</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
        <label>
          <span>Capability</span>
          <select
            value={capabilityFilter}
            onChange={(event) => setCapabilityFilter(event.target.value as AdapterCapabilityFilter)}
          >
            <option value="all">All capabilities</option>
            {(Object.keys(capabilityLabels) as ProviderCapability[]).map((capability) => (
              <option key={capability} value={capability}>
                {capabilityLabels[capability]}
              </option>
            ))}
          </select>
        </label>
        <div className="adapterToolbarCount">
          <strong>{sortedAdapters.length}</strong>
          <span>shown</span>
        </div>
      </div>

      <div className="adapterMatrix">
        {sortedAdapters.map((adapter) => {
          const readiness = runtimeReadiness.get(adapter.id);

          return (
            <article
              className={`adapterRow ${adapter.status}`}
              key={adapter.id}
            >
              {adapterIcon(adapter)}
              <div>
                <strong>{adapter.label}</strong>
                <span>
                  {capabilityLabels[adapter.capability]} - {adapter.detail}
                </span>
                <small>{adapter.provider}</small>
                {readiness && (
                  <small className="runtimeHint">
                    Dry run: {runtimeModeLabel(readiness.mode)}
                    {readiness.missingCredentials.length > 0
                      ? ` - missing ${readiness.missingCredentials.slice(0, 2).join(", ")}`
                      : ""}
                  </small>
                )}
              </div>
              <em>{providerStatusLabel(adapter.status)}</em>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AdapterMiniList({ adapters }: { adapters: ProviderAdapter[] }) {
  return (
    <AdminReadinessMiniList
      items={adapters.map((adapter) => ({
        id: adapter.id,
        eyebrow: capabilityLabels[adapter.capability],
        label: adapter.label,
        detail: providerStatusLabel(adapter.status),
        className: adapter.status
      }))}
    />
  );
}

function ProductionGateList({ gates }: { gates: ProductionLaunchGate[] }) {
  return (
    <AdminReadinessMiniList
      items={gates.map((gate) => ({
        id: gate.id,
        eyebrow: gate.category,
        label: gate.label,
        detail: gate.status === "blocked" ? "Blocked" : "Evidence missing",
        className: gate.status === "blocked" ? "blocked" : "credential-gated"
      }))}
    />
  );
}

function ExternalAuditList({ items }: { items: ExternalAuditReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.category,
        label: item.label,
        detail: externalAuditStatusLabel(item.status),
        className: readinessStatusClass(item.status, { blocked: ["certification-blocked"] })
      }))}
    />
  );
}

function LegalComplianceList({ items }: { items: LegalComplianceItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: `${item.region.toUpperCase()} · ${item.category}`,
        label: item.label,
        detail: item.status === "repo-local-ready" ? "Local contract" : "Evidence required",
        className: readinessStatusClass(item.status)
      }))}
    />
  );
}

function E2eCoverageList({ items }: { items: E2eCoverageItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.surface,
        label: item.label,
        detail: e2eAutomationLabel(item.automationType),
        className: "ready-local"
      }))}
    />
  );
}

function ObservabilityReadinessList({ items }: { items: ObservabilityReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.liveIngestionEnabled ? "Live ingestion" : "Live ingestion off",
        className: readinessStatusClass(item.status)
      }))}
    />
  );
}

function AiProviderReadinessList({ items }: { items: AiProviderReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.liveProviderCallsEnabled ? "Live AI" : "Live AI off",
        className: readinessStatusClass(item.status)
      }))}
    />
  );
}

function AiQueueOperationsList({ items }: { items: AiQueueOperationsItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: `${item.metrics.length} metrics · ${item.humanOwner}`,
        className: readinessStatusClass(item.status)
      }))}
    />
  );
}

function RetailFulfillmentReadinessList({ items }: { items: RetailFulfillmentReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.directOrderEnabled ? "Direct orders" : "Orders off",
        className: readinessStatusClass(item.status, { blocked: ["certification-blocked"] })
      }))}
    />
  );
}

function PaymentReadinessList({ items }: { items: PaymentReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.liveChargesEnabled ? "Live charge" : "Charges off",
        className: readinessStatusClass(item.status, { blocked: ["certification-blocked"] })
      }))}
    />
  );
}

function MobileRenderReadinessList({ items }: { items: MobileRenderReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.emulatorRenderProofAttached || item.nativeArtifactSigned ? "Proof attached" : "Proof missing",
        className: readinessStatusClass(item.status, { blocked: ["artifact-blocked"] })
      }))}
    />
  );
}

function HostedApiReadinessList({ items }: { items: HostedApiReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail:
          item.publicRouteProofAttached || item.hostedDbConnected || item.hostedTokenVerificationAttached
            ? "Proof attached"
            : "Proof missing",
        className: readinessStatusClass(item.status, { blocked: ["protection-blocked"] })
      }))}
    />
  );
}

function ReviewerDbSeedReadinessList({ items }: { items: ReviewerDbSeedReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.hostedSeedExecuted || item.hostedTokenProbeAttached ? "Proof attached" : "Proof missing",
        className: readinessStatusClass(item.status)
      }))}
    />
  );
}

function CloudArtifactProofReadinessList({ items }: { items: CloudArtifactProofReadinessItem[] }) {
  const repoLocalItems = items.filter((item) => item.status === "repo-local-ready");
  const evidenceItems = items.filter((item) => item.status !== "repo-local-ready");

  return (
    <div className="cloudProofColumns">
      <div>
        <p className="eyebrow">Source contracts</p>
        <div className="cloudProofList">
          {repoLocalItems.map((item) => (
            <CloudArtifactProofRow item={item} key={item.id} />
          ))}
        </div>
      </div>
      <div>
        <p className="eyebrow">Evidence required</p>
        <div className="cloudProofList">
          {evidenceItems.map((item) => (
            <CloudArtifactProofRow item={item} key={item.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CloudArtifactProofRow({ item }: { item: CloudArtifactProofReadinessItem }) {
  const stateLabel = item.status === "repo-local-ready" ? "Repo-local ready" : "Proof missing";

  return (
    <div className={`cloudProofRow ${readinessStatusClass(item.status)}`}>
      <div>
        <span>{item.lane}</span>
        <strong>{item.label}</strong>
      </div>
      <small>{stateLabel}</small>
    </div>
  );
}

function BusinessEngagementReadinessList({ items }: { items: BusinessEngagementReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.liveMessagesEnabled || item.crmWritesEnabled ? "Live enabled" : "Live off",
        className: readinessStatusClass(item.status, { blocked: ["approval-blocked"] })
      }))}
    />
  );
}

function e2eAutomationLabel(type: E2eCoverageItem["automationType"]): string {
  if (type === "browser-smoke") return "Browser smoke";
  if (type === "contract-test") return "Contract test";
  if (type === "ci-workflow") return "CI workflow";
  return "Doctor";
}

function externalAuditStatusLabel(status: ExternalAuditReadinessItem["status"]): string {
  if (status === "internal-baseline-ready") return "Internal baseline only";
  if (status === "certification-blocked") return "Certification blocked";
  return "Evidence missing";
}

function adapterIcon(adapter: ProviderAdapter) {
  if (adapter.status === "ready-local") return <CircleCheck size={19} />;
  if (adapter.status === "blocked") return <XCircle size={19} />;
  return <Lock size={19} />;
}

function providerAdapterLabel(adapterId: string): string {
  const adapter = providerCatalog.find((candidate) => candidate.id === adapterId);
  return adapter ? adapter.label : formatOption(adapterId);
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

function summarizeRuntimeReadiness(readinessMap: Map<string, RuntimeReadiness>) {
  const readiness = Array.from(readinessMap.values());

  return {
    blocked: readiness.filter((item) => item.mode === "blocked").length,
    localResult: readiness.filter((item) => item.mode === "local-result").length,
    missingCredentials: readiness.reduce((total, item) => total + item.missingCredentials.length, 0),
    preparedRequest: readiness.filter((item) => item.mode === "prepared-request").length
  };
}

function adminPortalIcon(section: AdminPortalSectionId): ReactNode {
  const props = { size: 17 };
  if (section === "ops") return <Cloud {...props} />;
  if (section === "orders") return <Store {...props} />;
  if (section === "users") return <UserRound {...props} />;
  if (section === "assets") return <Image {...props} />;
  if (section === "providers") return <Settings {...props} />;
  return <Lock {...props} />;
}

function adminPortalRecordIcon(record: AdminPortalRecord): ReactNode {
  const label = `${record.domain} ${record.label}`.toLowerCase();
  const props = { size: 17 };
  if (label.includes("user") || label.includes("account") || label.includes("identity") || label.includes("support")) return <UserRound {...props} />;
  if (label.includes("asset") || label.includes("panel") || label.includes("artifact") || label.includes("mobile")) return <Image {...props} />;
  if (label.includes("payment") || label.includes("commerce")) return <CreditCard {...props} />;
  if (label.includes("retail") || label.includes("fulfillment")) return <Store {...props} />;
  if (label.includes("provider")) return <Settings {...props} />;
  if (label.includes("launch") || label.includes("auth")) return <Lock {...props} />;
  return <ShieldCheck {...props} />;
}

function adminPortalStatusLabel(status: AdminPortalStatus): string {
  const labels: Record<AdminPortalStatus, string> = {
    attention: "Attention",
    blocked: "Blocked",
    ready: "Ready"
  };
  return labels[status];
}

function orderStatusLabel(status: AdminPortalOrderQueueItem["status"]): string {
  const labels: Record<AdminPortalOrderQueueItem["status"], string> = {
    cancelled: "Cancelled",
    draft: "Draft",
    event_moved_up: "Event moved up",
    external_share_approved: "External share approved",
    fulfilled: "Fulfilled",
    quoted: "Quoted",
    rendered: "Rendered",
    vendor_handoff_blocked: "Handoff blocked",
    vendor_handoff_ready: "Handoff ready",
    vendor_rejected: "Vendor rejected",
    wrong_store: "Wrong store"
  };
  return labels[status];
}

function adminPortalRiskLabel(risk: "low" | "medium" | "high"): string {
  const labels: Record<typeof risk, string> = {
    high: "High risk",
    low: "Low risk",
    medium: "Medium risk"
  };
  return labels[risk];
}

function adminOperationStatusLabel(status: AdminOperationTask["status"]): string {
  const labels: Record<AdminOperationTask["status"], string> = {
    blocked: "Blocked",
    "certification-blocked": "Certification",
    "evidence-required": "Evidence",
    "protection-blocked": "Protected",
    "repo-local-ready": "Local ready"
  };
  return labels[status];
}

function runtimeModeLabel(mode: RuntimeReadiness["mode"]): string {
  const labels: Record<RuntimeReadiness["mode"], string> = {
    blocked: "blocked by gates",
    "local-result": "local fallback ready",
    "prepared-request": "request contract ready"
  };
  return labels[mode];
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatOption(value: string): string {
  return value
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
