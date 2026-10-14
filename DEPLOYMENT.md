# ElasticCloud Container Deployment Guide 🚢

Production deployment guide for **ElasticCloud** (AWS EC2 Cloud Console & Compute Orchestrator) across container runtimes:
- **Docker / Podman** (Local & Bare-metal)
- **Docker Compose**
- **AWS ECS on AWS Fargate** (Serverless container runtime)
- **AWS EC2 Container Instances** (with Docker/Podman socket for real micro-VM container provisioning)
- **Kubernetes** (AWS EKS, Google GKE, Minikube, K3s)

---

## 🏗️ Architecture Overview

ElasticCloud is packaged as a unified, production-grade container:

```
                          Internet / Clients
                                  │
                  ┌───────────────▼───────────────┐
                  │ AWS ALB / K8s Ingress / Proxy │
                  └───────────────┬───────────────┘
                                  │ Port 3000
           ┌──────────────────────▼──────────────────────┐
           │        ElasticCloud Production Container    │
           │                                             │
           │  ┌────────────────┐    ┌─────────────────┐  │
           │  │ React 18 SPA   │    │ Express API &   │  │
           │  │ (client/dist)  │    │ WebSocket Hub   │  │
           │  └────────────────┘    └────────┬────────┘  │
           │                                 │           │
           │                 ┌───────────────┴────────┐  │
           │                 ▼                        ▼  │
           │     /var/run/docker.sock       Simulation   │
           │     (EC2 with socket mount)    Engine       │
           │     Real micro-VM containers   (Fargate/K8s)│
           │                                             │
           │  Persistent Storage: /data (SQLite WAL)    │
           └─────────────────────────────────────────────┘
```

### Key Production Capabilities:
1. **Single-Port Unification:** Port `3000` serves the built React Cloud Console SPA, all `/api/*` REST endpoints, and all WebSocket connections (`/ws/terminal`, `/ws/metrics`). No reverse proxy required for standalone use.
2. **Dual-Engine Compute Driver:**
   - **Container Runtime Mode:** When running on EC2 with `/var/run/docker.sock` mounted, ElasticCloud manages real Linux micro-VM containers (`elastic-ubuntu`, `elastic-debian`, `elastic-alpine`) with cgroup CPU/memory limits.
   - **Graceful Simulation Mode:** When running on serverless runtimes (AWS Fargate, Google Cloud Run, restricted K8s clusters) where Docker socket mounting is unavailable, ElasticCloud automatically activates its built-in realistic simulation engine with simulated SSH daemon and CloudWatch metrics.
3. **Signal Forwarding & Zombie Process Reaping:** Uses `dumb-init` as PID 1 to trap `SIGTERM`/`SIGINT`, draining WebSockets, closing database connections cleanly, and avoiding orphan processes.
4. **Non-Root Security Hardening:** Runs as unprivileged system user `elastic` (UID `1001`, GID `1001`).
5. **Orchestrator Probes:** Implements `/api/health` and `/healthz` for AWS Target Groups, ECS container healthchecks, and Kubernetes liveness/readiness/startup probes.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `production` | Runtime mode (`production` serves static client SPA; `development` proxies Vite) |
| `PORT` | `3000` | HTTP and WebSocket listening port |
| `HOST` | `0.0.0.0` | Network binding interface |
| `DATA_DIR` | `/data` | Directory where SQLite persistent database and keys are stored |
| `DB_PATH` | `/data/elastic.db` | Exact path to SQLite database file |
| `CLIENT_DIST` | `/app/client/dist` | Directory containing built React static assets |
| `CONTAINER_RUNTIME` | *(auto-detected)* | Override container runtime command (`docker` or `podman`) |
| `DOCKER_HOST` | *(optional)* | Custom Docker daemon socket (e.g., `unix:///var/run/docker.sock`) |

---

## 🐳 Option 1: Docker / Podman (Local & Single Server)

### 1. Build the Production Image
```bash
# Using Docker:
docker build -t elasticcloud:latest .

# Using Podman:
podman build -t elasticcloud:latest .
```

### 2. Run in Simulation Mode (Default)
Ideal for standard container hosting, staging, or serverless deployments:
```bash
docker run -d \
  --name elasticcloud \
  -p 3000:3000 \
  -v elastic_data:/data \
  --restart unless-stopped \
  elasticcloud:latest
```

### 3. Run in Real Micro-VM Mode (EC2 / Bare-Metal)
To let ElasticCloud provision real micro-VM containers on an EC2 instance, mount the Docker socket:
```bash
docker run -d \
  --name elasticcloud \
  --user 0:0 \
  -p 3000:3000 \
  -p 2201-2220:2201-2220 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v elastic_data:/data \
  --restart unless-stopped \
  elasticcloud:latest
```

Open your browser to `http://<server-ip>:3000`.

---

## 📦 Option 2: Docker Compose

ElasticCloud provides a pre-configured `docker-compose.yml`:

```bash
# Start in background
docker compose up -d

# Check health and status
docker compose ps

# View live application logs
docker compose logs -f elasticcloud

# Stop cleanly (triggers graceful SIGTERM handler)
docker compose down
```

---

## ☁️ Option 3: AWS ECS on AWS Fargate (Serverless)

AWS Fargate runs containers serverless without managing EC2 hosts. In Fargate, ElasticCloud automatically activates its realistic simulation engine.

### Prerequisites:
- AWS CLI configured (`aws configure`)
- Amazon ECR repository and Amazon EFS filesystem for `/data` persistence

### Step 1: Push Container Image to Amazon ECR
```bash
# Set variables
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
export ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/elasticcloud:latest"

# Create ECR repository
aws ecr create-repository --repository-name elasticcloud --region ${AWS_REGION} || true

# Authenticate Docker to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build, tag and push
docker build -t elasticcloud:latest .
docker tag elasticcloud:latest ${ECR_URI}
docker push ${ECR_URI}
```

### Step 2: Register Fargate Task Definition
Edit `aws/ecs-fargate-task-definition.json` with your Account ID and EFS FileSystem ID, then register:
```bash
aws ecs register-task-definition \
  --cli-input-json file://aws/ecs-fargate-task-definition.json \
  --region ${AWS_REGION}
```

### Step 3: Create ECS Service with ALB
```bash
aws ecs create-service \
  --cluster elasticcloud-cluster \
  --service-name elasticcloud-service \
  --task-definition elasticcloud-control-plane \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-alb-elastic],assignPublicIp=ENABLED}" \
  --region ${AWS_REGION}
```

Or run the automated deployment script:
```bash
./aws/deploy-fargate.sh
```

---

## 🖥️ Option 4: AWS EC2 (Docker or ECS EC2 Launch Type)

When running on an EC2 instance with the Docker daemon, ElasticCloud can orchestrate **real Docker micro-VM instances** with hardware cgroup throttling and custom SSH keys:

### 1. Launch EC2 Instance:
- Recommended AMI: Amazon Linux 2023 or Ubuntu 24.04 LTS
- Instance Type: `t3.medium` or `c6i.large` (depending on micro-VM count)
- Storage: 40 GB gp3 root volume

### 2. User Data Script (Automated EC2 Bootstrap):
```bash
#!/usr/bin/env bash
yum update -y && yum install -y docker git
systemctl enable --now docker

# Create persistent storage folder
mkdir -p /var/lib/elasticcloud/data

# Run ElasticCloud with Docker socket access
docker run -d \
  --name elasticcloud \
  --restart always \
  --user 0:0 \
  -p 80:3000 \
  -p 2201-2220:2201-2220 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/elasticcloud/data:/data \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DATA_DIR=/data \
  <YOUR_ECR_URI>:latest
```

---

## ☸️ Option 5: Kubernetes (AWS EKS, GKE, K3s)

Production-ready Kubernetes manifests are provided in the `k8s/` directory:

```
k8s/
├── namespace.yaml      # Creates 'elasticcloud' namespace
├── configmap.yaml      # Configuration environment variables
├── pvc.yaml            # 10Gi PersistentVolumeClaim for SQLite /data
├── deployment.yaml     # 1-replica Deployment with rolling update & health probes
├── service.yaml        # ClusterIP service exposing port 3000 on port 80
├── ingress.yaml        # Ingress with WebSocket proxy timeout tuning
└── kustomization.yaml  # Single-command Kustomize orchestration
```

### 1. Deploy with Kustomize (One Command)
```bash
kubectl apply -k k8s/
```

### 2. Verify Pod Health and Probes
```bash
kubectl get pods -n elasticcloud -w
```
Expected output:
```
NAME                            READY   STATUS    RESTARTS   AGE
elasticcloud-7bf89d5945-abcde   1/1     Running   0          25s
```

### 3. Check Service and Ingress
```bash
kubectl get svc,ingress -n elasticcloud
```

### 4. Test Health Endpoint from Cluster
```bash
kubectl run curl-test --rm -it --restart=Never -n elasticcloud --image=curlimages/curl -- \
  curl -s http://elasticcloud-service.elasticcloud.svc.cluster.local/api/health
```

---

## 🩺 Health Checks & Verification

ElasticCloud exposes two dedicated healthcheck endpoints:
- `GET /api/health`
- `GET /healthz`

### Sample Response:
```json
{
  "status": "ok",
  "uptime": 1420,
  "runtime": "container",
  "runtimeType": "podman",
  "timestamp": "2026-10-14T12:00:00.000Z"
}
```

- When running without a container socket (Fargate, K8s): `"runtime": "simulation"`, `"runtimeType": "none"`
- When running with container socket (EC2): `"runtime": "container"`, `"runtimeType": "docker"` (or `"podman"`)

---

## 🛡️ Production Checklist

- [x] **Single-Port Delivery:** UI, API, and WebSockets unified on port 3000.
- [x] **Non-Root Execution:** Container runs as user `elastic` (UID 1001).
- [x] **PID 1 Signal Handling:** `dumb-init` propagates `SIGTERM` and reaps zombies.
- [x] **Graceful Shutdown:** HTTP server, WebSockets, and SQLite close cleanly within 5s.
- [x] **Data Persistence:** `/data` volume contains SQLite database (`elastic.db`) and WAL journal.
- [x] **Probe Endpoints:** `/api/health` and `/healthz` ready for ALB and K8s probes.
- [x] **Dual-Engine Compute:** Real containers on EC2; automatic simulation on Fargate/K8s.
- [x] **Multi-Stage Build:** Minimal production footprint without build compilers or dev dependencies.
