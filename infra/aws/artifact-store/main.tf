terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

locals {
  bucket_name = var.artifact_bucket_name != "" ? var.artifact_bucket_name : "${var.project_name}-${var.environment}-artifacts"
  object_prefix = "projects/*"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    DataClass   = "customer-render-artifacts"
  }
}

resource "aws_s3_bucket" "artifacts" {
  bucket        = local.bucket_name
  force_destroy = var.allow_force_destroy

  tags = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "expire-render-artifacts"
    status = "Enabled"

    filter {
      prefix = "projects/"
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_artifact_retention_days
    }

    expiration {
      days = var.artifact_retention_days
    }
  }
}

data "aws_iam_policy_document" "artifact_bucket" {
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.artifacts.arn,
      "${aws_s3_bucket.artifacts.arn}/*"
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    sid    = "DenyUnencryptedObjectUploads"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.artifacts.arn}/${local.object_prefix}"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["AES256"]
    }
  }
}

resource "aws_s3_bucket_policy" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  policy = data.aws_iam_policy_document.artifact_bucket.json
}

data "aws_iam_policy_document" "artifact_writer" {
  statement {
    sid    = "ListArtifactPrefix"
    effect = "Allow"

    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.artifacts.arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["projects/*"]
    }
  }

  statement {
    sid    = "WriteReadDeleteRenderArtifacts"
    effect = "Allow"

    actions = [
      "s3:AbortMultipartUpload",
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:PutObject"
    ]

    resources = ["${aws_s3_bucket.artifacts.arn}/${local.object_prefix}"]
  }
}

resource "aws_iam_policy" "artifact_writer" {
  name        = "${var.project_name}-${var.environment}-artifact-writer"
  description = "Least-privilege CustomCard render artifact writer for app and worker runtimes."
  policy      = data.aws_iam_policy_document.artifact_writer.json
  tags        = local.common_tags
}

data "aws_iam_role" "app" {
  count = var.app_role_name == "" ? 0 : 1
  name  = var.app_role_name
}

data "aws_iam_role" "worker" {
  count = var.worker_role_name == "" ? 0 : 1
  name  = var.worker_role_name
}

resource "aws_iam_role_policy_attachment" "app_artifact_writer" {
  count      = var.app_role_name == "" ? 0 : 1
  role       = data.aws_iam_role.app[0].name
  policy_arn = aws_iam_policy.artifact_writer.arn
}

resource "aws_iam_role_policy_attachment" "worker_artifact_writer" {
  count      = var.worker_role_name == "" ? 0 : 1
  role       = data.aws_iam_role.worker[0].name
  policy_arn = aws_iam_policy.artifact_writer.arn
}
