variable "project_name" {
  description = "Short service name used for tags and default resource names."
  type        = string
  default     = "customcard"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,30}$", var.project_name))
    error_message = "project_name must be lowercase kebab-case and 3-31 characters."
  }
}

variable "environment" {
  description = "Deployment environment name, such as prod or staging."
  type        = string
  default     = "prod"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}$", var.environment))
    error_message = "environment must be lowercase kebab-case and 2-21 characters."
  }
}

variable "artifact_bucket_name" {
  description = "Optional globally unique S3 bucket name. Defaults to project-environment-artifacts."
  type        = string
  default     = ""

  validation {
    condition     = var.artifact_bucket_name == "" || can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", var.artifact_bucket_name))
    error_message = "artifact_bucket_name must be a valid S3 bucket name or empty."
  }
}

variable "artifact_retention_days" {
  description = "How long uploaded render artifacts remain in the production bucket."
  type        = number
  default     = 30

  validation {
    condition     = var.artifact_retention_days >= 7 && var.artifact_retention_days <= 365
    error_message = "artifact_retention_days must be between 7 and 365."
  }
}

variable "noncurrent_artifact_retention_days" {
  description = "How long noncurrent object versions remain after artifact replacement."
  type        = number
  default     = 14

  validation {
    condition     = var.noncurrent_artifact_retention_days >= 1 && var.noncurrent_artifact_retention_days <= 90
    error_message = "noncurrent_artifact_retention_days must be between 1 and 90."
  }
}

variable "allow_force_destroy" {
  description = "Production safety valve. Keep false unless explicitly tearing down an ephemeral environment."
  type        = bool
  default     = false
}

variable "app_role_name" {
  description = "Optional existing IAM role name for the CustomCard web/API runtime."
  type        = string
  default     = ""
}

variable "worker_role_name" {
  description = "Optional existing IAM role name for the CustomCard worker runtime."
  type        = string
  default     = ""
}
