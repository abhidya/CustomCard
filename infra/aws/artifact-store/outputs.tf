output "artifact_bucket_name" {
  description = "S3 bucket that stores render-packet artifacts."
  value       = aws_s3_bucket.artifacts.bucket
}

output "artifact_bucket_arn" {
  description = "S3 bucket ARN for audit and policy review."
  value       = aws_s3_bucket.artifacts.arn
}

output "artifact_writer_policy_arn" {
  description = "IAM policy ARN attached to the app and worker roles when role names are supplied."
  value       = aws_iam_policy.artifact_writer.arn
}

output "runtime_environment" {
  description = "Runtime env values that must be mirrored into the platform secret/config manager."
  value = {
    OBJECT_STORE_URL                = "s3://${aws_s3_bucket.artifacts.bucket}"
    OBJECT_STORE_BUCKET             = aws_s3_bucket.artifacts.bucket
    OBJECT_STORE_REGION             = data.aws_region.current.name
    OBJECT_STORE_SIGNING_SECRET     = "set-in-secret-manager"
    ARTIFACT_SIGNED_URL_TTL_MINUTES = "15"
  }
}

data "aws_region" "current" {}
