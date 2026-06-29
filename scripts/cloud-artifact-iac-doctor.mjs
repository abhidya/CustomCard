import { readFileSync } from "node:fs";
import { checkAbsent, checkIncludes } from "./doctor-harness.mjs";

const files = {
  main: "infra/aws/artifact-store/main.tf",
  variables: "infra/aws/artifact-store/variables.tf",
  outputs: "infra/aws/artifact-store/outputs.tf"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const checks = [
  checkIncludes("bucket", "s3-bucket-versioned-and-encrypted", contents.main, [
    'resource "aws_s3_bucket" "artifacts"',
    'resource "aws_s3_bucket_versioning" "artifacts"',
    'status = "Enabled"',
    'resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts"',
    'sse_algorithm = "AES256"'
  ]),
  checkIncludes("bucket", "s3-public-access-blocked", contents.main, [
    'resource "aws_s3_bucket_public_access_block" "artifacts"',
    "block_public_acls       = true",
    "block_public_policy     = true",
    "ignore_public_acls      = true",
    "restrict_public_buckets = true",
    'object_ownership = "BucketOwnerEnforced"'
  ]),
  checkIncludes("bucket", "s3-lifecycle-bounded-storage-cost", contents.main, [
    'resource "aws_s3_bucket_lifecycle_configuration" "artifacts"',
    'id     = "expire-render-artifacts"',
    'prefix = "projects/"',
    "days_after_initiation = 1",
    "noncurrent_days = var.noncurrent_artifact_retention_days",
    "days = var.artifact_retention_days"
  ]),
  checkIncludes("policy", "bucket-policy-denies-unsafe-access", contents.main, [
    'sid    = "DenyInsecureTransport"',
    'variable = "aws:SecureTransport"',
    'values   = ["false"]',
    'sid    = "DenyUnencryptedObjectUploads"',
    'variable = "s3:x-amz-server-side-encryption"',
    'values   = ["AES256"]'
  ]),
  checkIncludes("iam", "writer-policy-is-prefix-scoped", contents.main, [
    'data "aws_iam_policy_document" "artifact_writer"',
    'sid    = "ListArtifactPrefix"',
    'variable = "s3:prefix"',
    'values   = ["projects/*"]',
    'sid    = "WriteReadDeleteRenderArtifacts"',
    '"s3:PutObject"',
    '"s3:GetObject"',
    '"s3:DeleteObject"',
    'resources = ["${aws_s3_bucket.artifacts.arn}/${local.object_prefix}"]'
  ]),
  checkIncludes("iam", "app-and-worker-role-attachments", contents.main, [
    'resource "aws_iam_role_policy_attachment" "app_artifact_writer"',
    'resource "aws_iam_role_policy_attachment" "worker_artifact_writer"',
    "var.app_role_name == \"\" ? 0 : 1",
    "var.worker_role_name == \"\" ? 0 : 1"
  ]),
  checkIncludes("inputs", "safe-production-defaults", contents.variables, [
    'default     = "customcard"',
    'default     = "prod"',
    "artifact_retention_days >= 7",
    "artifact_retention_days <= 365",
    "noncurrent_artifact_retention_days >= 1",
    "noncurrent_artifact_retention_days <= 90",
    "default     = false"
  ]),
  checkIncludes("outputs", "runtime-env-contract", contents.outputs, [
    'OBJECT_STORE_URL                = "s3://${aws_s3_bucket.artifacts.bucket}"',
    "OBJECT_STORE_BUCKET             = aws_s3_bucket.artifacts.bucket",
    "OBJECT_STORE_REGION             = data.aws_region.current.name",
    'OBJECT_STORE_SIGNING_SECRET     = "set-in-secret-manager"',
    'ARTIFACT_SIGNED_URL_TTL_MINUTES = "15"'
  ]),
  checkAbsent("safety", "no-public-or-destructive-defaults", `${contents.main}\n${contents.variables}\n${contents.outputs}`, [
    "public-read",
    "public-read-write",
    "acl    =",
    "force_destroy = true",
    "Principal = \"*\""
  ])
];

const lanes = Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
  const laneChecks = checks.filter((check) => check.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((check) => check.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((check) => check.passed) ? "repo-consistent" : "contract-drift"
  };
});

const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-cloud-artifact-iac-doctor",
      status: failed.length === 0 ? "repo-consistent" : "contract-drift",
      scope: "repo-local",
      module: "infra/aws/artifact-store",
      liveCloudCalls: false,
      realOrdersEnabled: false,
      lanes,
      checks,
      registerIssues: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

