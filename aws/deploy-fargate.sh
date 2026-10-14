#!/usr/bin/env bash
# ==============================================================================
# ElasticCloud - Automated AWS ECS Fargate Deployment Script
# ==============================================================================
set -euo pipefail

# Configuration Defaults (override via environment variables)
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo '')}"
ECR_REPOSITORY="${ECR_REPOSITORY:-elasticcloud}"
ECS_CLUSTER="${ECS_CLUSTER:-elasticcloud-cluster}"
ECS_SERVICE="${ECS_SERVICE:-elasticcloud-service}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Error: Unable to detect AWS_ACCOUNT_ID. Please export AWS_ACCOUNT_ID or configure AWS credentials."
  exit 1
fi

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

echo "========================================================================"
echo "  Deploying ElasticCloud Control Plane to AWS ECS Fargate"
echo "  Region:      ${AWS_REGION}"
echo "  Account:     ${AWS_ACCOUNT_ID}"
echo "  Repository:  ${ECR_REPOSITORY}"
echo "  Cluster:     ${ECS_CLUSTER}"
echo "  Service:     ${ECS_SERVICE}"
echo "  Tag:         ${IMAGE_TAG}"
echo "========================================================================"

# Step 1: Ensure ECR repository exists
echo "[1/5] Checking ECR repository..."
aws ecr describe-repositories --repository-names "${ECR_REPOSITORY}" --region "${AWS_REGION}" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "${ECR_REPOSITORY}" --region "${AWS_REGION}"

# Step 2: Authenticate Docker / Podman to ECR
echo "[2/5] Authenticating container runtime to AWS ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | \
  (docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com" 2>/dev/null || \
   podman login -u AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com")

# Step 3: Build & Tag Image
echo "[3/5] Building and tagging container image..."
CONTAINER_TOOL="docker"
if ! command -v docker &> /dev/null && command -v podman &> /dev/null; then
  CONTAINER_TOOL="podman"
fi

${CONTAINER_TOOL} build -t "${ECR_REPOSITORY}:${IMAGE_TAG}" .
${CONTAINER_TOOL} tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"

# Step 4: Push to ECR
echo "[4/5] Pushing image to ECR (${ECR_URI}:${IMAGE_TAG})..."
${CONTAINER_TOOL} push "${ECR_URI}:${IMAGE_TAG}"

# Step 5: Update ECS Service
echo "[5/5] Updating ECS Service to trigger rolling deployment..."
TASK_DEF_TMP=$(mktemp)
sed -e "s/123456789012/${AWS_ACCOUNT_ID}/g" \
    -e "s/us-east-1/${AWS_REGION}/g" \
    aws/ecs-fargate-task-definition.json > "${TASK_DEF_TMP}"

REVISED_TASK_DEF=$(aws ecs register-task-definition \
  --cli-input-json "file://${TASK_DEF_TMP}" \
  --region "${AWS_REGION}" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)
rm -f "${TASK_DEF_TMP}"

echo "Registered new Task Definition revision: ${REVISED_TASK_DEF}"

aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --task-definition "${REVISED_TASK_DEF}" \
  --force-new-deployment \
  --region "${AWS_REGION}" >/dev/null

echo "Waiting for ECS service stability (rolling update in progress)..."
aws ecs wait services-stable \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}" \
  --region "${AWS_REGION}"

echo "========================================================================"
echo "  Deployment completed successfully!"
echo "========================================================================"
