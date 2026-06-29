import {
  cloudArtifactProofReadinessItems,
  summarizeCloudArtifactProofReadiness,
  validateCloudArtifactProofReadiness
} from "../src/cloudArtifactProofReadinessData.mjs";
import {
  checkArrayIncludes,
  checkExact,
  checkIncludes,
  checkItemsHaveKeys,
  checkNoBlockers,
  readTextFiles,
  runDoctorManifest
} from "./doctor-harness.mjs";

const files = {
  readinessTest: "src/cloudArtifactProofReadiness.test.ts",
  terraformMain: "infra/aws/artifact-store/main.tf",
  terraformVariables: "infra/aws/artifact-store/variables.tf",
  terraformOutputs: "infra/aws/artifact-store/outputs.tf",
  cloudIacDoctor: "scripts/cloud-artifact-iac-doctor.mjs",
  s3LiveDoctor: "scripts/artifact-store-s3-live-doctor.mjs",
  artifactStore: "src/artifactStore.ts",
  readinessData: "src/cloudArtifactProofReadinessData.mjs",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  readinessSummaryData: "src/readinessSummaryData.mjs",
  adminApp: "src/App.tsx",
  e2eCoverage: "src/e2eCoverageData.mjs",
  platformDocs: "docs/platform-expansion-design.md",
  verificationDocs: "docs/verification.md",
  readme: "README.md",
  finalPackage: "docs/final-package.md",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  viteConfig: "vite.config.ts"
};

const contents = readTextFiles(files);

const summary = summarizeCloudArtifactProofReadiness(cloudArtifactProofReadinessItems);
const validationBlockers = validateCloudArtifactProofReadiness(cloudArtifactProofReadinessItems);
const itemIds = cloudArtifactProofReadinessItems.map((item) => item.id);
const terraformSource = `${contents.terraformMain}\n${contents.terraformVariables}\n${contents.terraformOutputs}`;
const localObjectStoreSource = `${contents.cloudIacDoctor}\n${contents.s3LiveDoctor}\n${contents.artifactStore}`;
const adminApiSource = `${contents.adminApp}\n${contents.apiContracts}\n${contents.apiServer}\n${contents.readinessSummaryData}`;
const docsSource = `${contents.platformDocs}\n${contents.verificationDocs}\n${contents.readme}\n${contents.finalPackage}`;
const ciSource = `${contents.packageJson}\n${contents.workflow}`;

const checks = [
  checkExact("register", "item-count", summary.total, 8),
  checkExact("register", "repo-local-ready-count", summary.repoLocalReady, 2),
  checkExact("register", "evidence-missing-count", summary.evidenceMissing, 6),
  checkExact("register", "applied-cloud-required-count", summary.appliedCloudRequired, 6),
  checkExact("register", "bucket-arn-proof-required-count", summary.bucketArnProofRequired, 2),
  checkExact("register", "iam-policy-proof-required-count", summary.iamPolicyProofRequired, 2),
  checkExact("register", "signed-url-probe-required-count", summary.signedUrlProbeRequired, 3),
  checkExact("register", "access-log-proof-required-count", summary.accessLogProofRequired, 2),
  checkExact("register", "secret-sync-required-count", summary.secretSyncRequired, 3),
  checkExact("register", "restore-drill-required-count", summary.restoreDrillRequired, 1),
  checkExact("register", "terraform-file-contract-count", summary.terraformFileContracts, 3),
  checkExact("register", "env-output-contract-count", summary.envOutputContracts, 5),
  checkExact("register", "no-terraform-apply-claim", summary.terraformApplyExecutions, 0),
  checkExact("register", "no-applied-bucket-proof-claim", summary.appliedBucketArnProofs, 0),
  checkExact("register", "no-iam-output-proof-claim", summary.iamPolicyOutputProofs, 0),
  checkExact("register", "no-signed-url-probe-claim", summary.signedUrlProbeProofs, 0),
  checkExact("register", "no-access-log-proof-claim", summary.accessLogProofs, 0),
  checkExact("register", "no-secret-sync-proof-claim", summary.secretSyncProofs, 0),
  checkExact("register", "no-restore-drill-proof-claim", summary.restoreDrillProofs, 0),
  checkExact("register", "no-live-external-network", summary.externalNetworkCalls, 0),
  checkExact("register", "no-live-provider-calls", summary.liveProviderCalls, 0),
  checkExact("register", "no-real-orders", summary.realOrdersEnabled, 0),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-cloud-artifact-proof-readiness-ids", itemIds, [
    "static-artifact-iac-contract",
    "terraform-plan-review-contract",
    "applied-bucket-arn-proof",
    "iam-policy-output-proof",
    "signed-url-cloud-probe",
    "cloud-access-log-proof",
    "secret-manager-env-sync",
    "retention-restore-drill"
  ]),
  checkItemsHaveKeys(
    "register",
    "cloud-artifact-proof-readiness-item-shape",
    cloudArtifactProofReadinessItems,
    [
      "id",
      "label",
      "lane",
      "status",
      "terraformFiles",
      "envOutputNames",
      "requiredSourceSignals",
      "requiresAppliedCloud",
      "requiresBucketArnProof",
      "requiresIamPolicyProof",
      "requiresSignedUrlProbe",
      "requiresAccessLogProof",
      "requiresSecretSync",
      "requiresRestoreDrill",
      "terraformApplyExecuted",
      "appliedBucketArnAttached",
      "iamPolicyOutputAttached",
      "signedUrlProbeAttached",
      "accessLogAttached",
      "secretSyncAttached",
      "restoreDrillAttached",
      "externalNetworkCalls",
      "liveProviderCalls",
      "realOrdersEnabled",
      "currentEvidence",
      "requiredEvidence",
      "blocker"
    ],
    {
      readyDetail: `Validated ${cloudArtifactProofReadinessItems.length} executable cloud artifact proof readiness item shapes.`,
      missingPrefix: "Missing cloud artifact proof readiness fields"
    }
  ),
  checkIncludes("tests", "cloud-artifact-proof-readiness-tests", contents.readinessTest, [
    "tracks applied cloud bucket and IAM evidence without claiming production proof",
    "covers Terraform source, runtime env outputs, signed URL probes, IAM, and restore requirements",
    "flags unsafe applied-cloud claims"
  ]),
  checkIncludes("terraform", "artifact-bucket-and-iam-source-signals", terraformSource, [
    "aws_s3_bucket_public_access_block",
    "aws_s3_bucket_server_side_encryption_configuration",
    "aws_s3_bucket_lifecycle_configuration",
    "DenyInsecureTransport",
    "DenyUnencryptedObjectUploads",
    "aws_iam_role_policy_attachment",
    "artifact_bucket_arn",
    "artifact_writer_policy_arn",
    "runtime_environment"
  ]),
  checkIncludes("object-store", "local-minio-object-store-doctor-signals", localObjectStoreSource, [
    "--confirm-live-s3-artifact-doctor",
    "OBJECT_STORE_URL",
    "writeS3CompatibleArtifactStore",
    "readback verification",
    "cloudWritesVerified"
  ]),
  checkIncludes("surfaces", "admin-api-cloud-artifact-proof-surfaces", adminApiSource, [
    "Cloud artifact proof readiness",
    "summarizeCloudArtifactProofReadiness",
    "cloudArtifactProofReadiness",
    "appliedBucketArnProofs",
    "iamPolicyOutputProofs"
  ]),
  checkIncludes("e2e", "cloud-artifact-proof-e2e-matrix", contents.e2eCoverage, [
    "cloud-artifact-proof-readiness",
    "Cloud artifact proof readiness",
    "npm run cloud:artifact:proof:doctor",
    "Applied cloud proof remains unclaimed"
  ]),
  checkIncludes("docs", "cloud-artifact-proof-docs", docsSource, [
    "Cloud artifact proof readiness",
    "`src/cloudArtifactProofReadiness.ts`",
    "`npm run cloud:artifact:proof:doctor`",
    "not live-applied cloud bucket/IAM proof"
  ]),
  checkIncludes("ci", "cloud-artifact-proof-doctor-scripted-and-gated", ciSource, [
    '"cloud:artifact:proof:doctor": "node scripts/cloud-artifact-proof-readiness-doctor.mjs"',
    "Validate cloud artifact proof readiness",
    "npm run cloud:artifact:proof:doctor"
  ]),
  checkIncludes("coverage", "cloud-artifact-proof-coverage-config", contents.viteConfig, [
    "src/cloudArtifactProofReadiness.ts",
    "src/cloudArtifactProofReadinessData.mjs"
  ]),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "terraform output artifact_bucket_arn",
    "terraform output artifact_writer_policy_arn",
    "Production bucket write/read transcript",
    "Signed URL GET probe",
    "Access log sample",
    "Secret manager key list",
    "Restore drill transcript"
  ])
];

runDoctorManifest({
  service: "customcard-cloud-artifact-proof-readiness-doctor",
  metrics: {
    items: summary.total,
    repoLocalReady: summary.repoLocalReady,
    evidenceMissing: summary.evidenceMissing,
    appliedCloudRequired: summary.appliedCloudRequired,
    bucketArnProofRequired: summary.bucketArnProofRequired,
    iamPolicyProofRequired: summary.iamPolicyProofRequired,
    signedUrlProbeRequired: summary.signedUrlProbeRequired,
    accessLogProofRequired: summary.accessLogProofRequired,
    secretSyncRequired: summary.secretSyncRequired,
    restoreDrillRequired: summary.restoreDrillRequired,
    terraformFileContracts: summary.terraformFileContracts,
    envOutputContracts: summary.envOutputContracts,
    terraformApplyExecutions: summary.terraformApplyExecutions,
    appliedBucketArnProofs: summary.appliedBucketArnProofs,
    iamPolicyOutputProofs: summary.iamPolicyOutputProofs,
    signedUrlProbeProofs: summary.signedUrlProbeProofs,
    accessLogProofs: summary.accessLogProofs,
    secretSyncProofs: summary.secretSyncProofs,
    restoreDrillProofs: summary.restoreDrillProofs,
    externalNetworkCalls: summary.externalNetworkCalls,
    liveProviderCalls: summary.liveProviderCalls,
    realOrdersEnabled: summary.realOrdersEnabled
  },
  checks
});
