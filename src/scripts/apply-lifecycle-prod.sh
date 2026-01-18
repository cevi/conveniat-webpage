#!/bin/bash

# Load environment variables if .env exists
if [ -f .env ]; then
  # Use set -a to export variables automatically
  set -a
  source .env
  set +a
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo "AWS CLI is not installed. Please install it to run this script."
  exit 1
fi

# Check for bucket name
if [ -z "$MINIO_BUCKET_NAME" ]; then
    echo "Error: MINIO_BUCKET_NAME environment variable is not set."
    exit 1
fi

echo "Applying S3 lifecycle policy to bucket: $MINIO_BUCKET_NAME"

# Note: If using S3-compatible service (not AWS), endpoint-url might be needed.
# But this script assumes AWS usage for production or configured AWS CLI default profile.
# If using specific profile or endpoint, please adjust command below.

aws s3api put-bucket-lifecycle-configuration \
    --bucket "$MINIO_BUCKET_NAME" \
    --lifecycle-configuration file://src/scripts/s3-lifecycle-policy.json

if [ $? -eq 0 ]; then
    echo "Successfully applied lifecycle policy."
else
    echo "Failed to apply lifecycle policy."
    exit 1
fi
