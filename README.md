# ElasticCloud ☁️

> **Production-Grade AWS EC2 Cloud Console & Micro-VM Compute Orchestrator**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-20%2B-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Runtime](https://img.shields.io/badge/Runtime-Podman%20%7C%20Docker-purple.svg)](https://podman.io/)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
  - [High-Level Architecture Diagram](#high-level-architecture-diagram)
  - [Instance Lifecycle & SSH Injection Sequence](#instance-lifecycle--ssh-injection-sequence)
  - [Security Group Packet Evaluation Flow](#security-group-packet-evaluation-flow)
- [Core Features](#-core-features)
  - [1. Multi-OS AMIs (Amazon Machine Images)](#1-multi-os-amis-amazon-machine-images)
  - [2. Configurable Sizing & Hardware cgroups Limits](#2-configurable-sizing--hardware-cgroups-limits)
  - [3. Cryptographic Key Pair Manager](#3-cryptographic-key-pair-manager)
  - [4. Zero-Setup EC2 Instance Connect (Browser Terminal)](#4-zero-setup-ec2-instance-connect-browser-terminal)
  - [5. Stateful Security Groups & Interactive Packet Simulator](#5-stateful-security-groups--interactive-packet-simulator)
  - [6. EBS Block Storage Engine](#6-ebs-block-storage-engine)
  - [7. CloudWatch-Style Live Telemetry & Inspector Drawer](#7-cloudwatch-style-live-telemetry--inspector-drawer)
- [REST & WebSocket API Reference](#-rest--websocket-api-reference)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Quickstart Installation](#quickstart-installation)
  - [Building Base AMI Images](#building-base-ami-images)
- [Connecting to Instances](#-connecting-to-instances)
- [License](#-license)

---

## 🔭 Overview

**ElasticCloud** is a production-grade AWS EC2 Cloud Console and Compute Orchestrator clone. It delivers a high-density, pixel-perfect reproduction of the modern AWS EC2 Management Console (Squid Ink dark mode with AWS orange accents, collapsible navigation, split-pane inspector drawer, and launch wizard).

Under the hood, ElasticCloud provisions **real, isolated Linux micro-VM containers** using rootless Podman or Docker with enforced Linux cgroup hardware limits (`NanoCpus`, `Memory`, `MemorySwap`), OpenSSH servers, cloud-init key injection, virtual storage volumes, and real-time WebSocket terminal access (`xterm.js`). If the container engine is unavailable, ElasticCloud seamlessly transitions to an embedded **transparent simulation engine** with synthetic telemetry, boot logs, and simulated SSH daemons.

---

## 🏛 System Architecture

### High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Layer (React 18 + Vite + Tailwind CSS)"]
        UI["AWS EC2 Console UI\n(Squid Ink / Light Theme)"]
        Wizard["Launch Instance Wizard\n(AMIs, Tiers, Sliders, Summary)"]
        Table["Instances Fleet Manager\n(Start, Stop, Reboot, Terminate)"]
        Inspector["Split-Pane Bottom Drawer\n(Details, Security, Net, Storage, CloudWatch, Logs)"]
        Terminal["xterm.js Browser Shell\n(EC2 Instance Connect)"]
        Simulator["Firewall Packet Tester\n(Inbound/Outbound Verdicts)"]
    end

    subgraph Gateway ["Transport & Gateway Layer"]
        HTTP_API["REST API Router (:3001/api)"]
        WS_TERM["WebSocket Terminal Gateway (:3001/ws/terminal)"]
        WS_METRICS["WebSocket Telemetry Stream (:3001/ws/metrics)"]
    end

    subgraph ControlPlane ["ElasticCloud Control Plane (Node.js / TypeScript)"]
        Driver{"Compute Driver\n(Engine Selector)"}
        KeyMgr["Key Pair Vault\n(RSA / Ed25519 & Fingerprints)"]
        FWEngine["Firewall Engine\n(CIDR & Port Range Matcher)"]
        TeleEngine["Telemetry Poller\n(60s Circular Buffer)"]
        DB[(SQLite WAL DB\ndata/elastic.db)]
    end

    subgraph RuntimeLayer ["Execution & Virtualization Layer"]
        subgraph RealRuntime ["Container Micro-VM Runtime (Podman / Docker)"]
            U_VM["Ubuntu 24.04 LTS\n(cgroups quota + sshd:22 -> :2206)"]
            D_VM["Debian 12 Bookworm\n(cgroups quota + sshd:22 -> :2205)"]
            A_VM["Alpine 3.20\n(cgroups quota + sshd:22 -> :2204)"]
        end
        subgraph SimRuntime ["Graceful Fallback Simulation Engine"]
            SimVM["Isolated Sandboxes (/tmp/elastic-sandboxes)\n+ Embedded ssh2 Server"]
        end
    end

    UI --> HTTP_API
    Wizard --> HTTP_API
    Table --> HTTP_API
    Inspector --> HTTP_API
    Simulator --> HTTP_API
    Terminal <--> WS_TERM
    Inspector <--> WS_METRICS

    HTTP_API --> Driver
    HTTP_API --> KeyMgr
    HTTP_API --> FWEngine
    HTTP_API --> DB
    WS_TERM --> Driver
    WS_METRICS --> TeleEngine

    Driver -->|Socket Available| RealRuntime
    Driver -->|Fallback| SimRuntime
    TeleEngine --> RealRuntime
```

---

### Instance Lifecycle & SSH Injection Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Cloud Engineer
    participant WebUI as ElasticCloud Console
    participant API as Control Plane API
    participant KeyVault as Key Pair Manager
    participant Driver as Compute Driver
    participant Runtime as Podman Runtime
    participant MicroVM as Linux Container (sshd)

    User->>WebUI: Click "Create Key Pair" (RSA / Ed25519)
    WebUI->>API: POST /api/keypairs { name: "prod-key", type: "rsa" }
    API->>KeyVault: generateKeyPair()
    KeyVault-->>API: { publicKey, privateKey, fingerprint }
    API-->>WebUI: Private .pem + Public Key Metadata
    WebUI-->>User: Auto-triggers "prod-key.pem" Browser Download

    User->>WebUI: Configure & Click "Launch Instance"
    WebUI->>API: POST /api/instances (AMI, Tier, Volume, KeyPairId)
    API->>Driver: launchInstance(config)
    Driver->>Driver: Allocate host port (e.g. 2204) & Private IP (172.31.0.x)
    Driver->>Runtime: Create container with NanoCpus, Memory, PortBindings
    Runtime->>MicroVM: Start container with SSH_PUBLIC_KEY in Environment
    MicroVM->>MicroVM: entrypoint.sh executes Cloud-Init:
    Note over MicroVM: 1. passwd -d $USER (unlock shadow entry)<br/>2. Injects key to ~/.ssh/authorized_keys (0600)<br/>3. Starts sshd with PubkeyAuthentication=yes
    Driver-->>API: Instance Status: 'running'
    API-->>WebUI: Updated Instance Fleet

    alt Connect via SSH Client
        User->>MicroVM: ssh -i "prod-key.pem" -p 2204 user@127.0.0.1
        MicroVM-->>User: Authenticated Shell (zero password prompts)
    else Connect via EC2 Instance Connect
        User->>WebUI: Open "Connect" Modal -> Browser Terminal Tab
        WebUI->>API: WS /ws/terminal?instanceId=i-xxx
        API->>Runtime: podman exec -it -u user -w /home/user i-xxx /bin/bash
        Runtime-->>WebUI: Interactive PTY Streamed to xterm.js
    end
```

---

### Security Group Packet Evaluation Flow

```mermaid
flowchart TD
    Start(["Incoming / Outgoing Packet\n(Source IP:Port -> Dest IP:Port, Protocol)"]) --> DirCheck{"Evaluate Direction"}
    
    DirCheck -->|Inbound| FilterInbound["Filter Inbound Rules for Attached Security Groups"]
    DirCheck -->|Outbound| FilterOutbound["Filter Outbound Rules for Attached Security Groups"]

    FilterInbound --> IterRules{"Iterate Rules in Order"}
    FilterOutbound --> IterRules

    IterRules -->|Next Rule| ProtoCheck{"Protocol Match?\n(TCP / UDP / ICMP / All)"}
    ProtoCheck -->|No| IterRules
    ProtoCheck -->|Yes| PortCheck{"Port in Range?\n(e.g., 22, 80, 8000-8080)"}
    
    PortCheck -->|No| IterRules
    PortCheck -->|Yes| CIDRCheck{"IP in CIDR Block?\n(Bitwise Mask Evaluation)"}
    
    CIDRCheck -->|No| IterRules
    CIDRCheck -->|Yes| MatchAction{"Rule Action"}
    
    MatchAction -->|ALLOW| VerdictAllow(["ALLOW: Packet Permitted by Security Group"])
    MatchAction -->|DROP| VerdictDrop(["DROP: Packet Rejected by Security Group"])

    IterRules -->|No Matching Rule & Inbound| DefaultDeny(["DROP: Implicit Inbound Default Deny"])
    IterRules -->|No Matching Rule & Outbound| DefaultAllow(["ALLOW: Implicit Outbound Default Allow"])
```

---

## ⚡ Core Features

### 1. Multi-OS AMIs (Amazon Machine Images)
ElasticCloud provides 3 ready-to-launch, production-hardened operating system images:

| Operating System | AMI ID | Default User | Package Manager | Pre-installed Tooling |
| :--- | :---: | :---: | :---: | :--- |
| **Ubuntu 24.04 LTS (Noble Numbat)** | `ami-ubuntu2404` | `ubuntu` | `apt` | `openssh-server`, `sudo`, `iptables`, `iproute2`, `net-tools`, `procps` |
| **Debian 12 (Bookworm)** | `ami-debian12` | `debian` | `apt` | `openssh-server`, `sudo`, `iptables`, `iproute2`, `net-tools`, `procps` |
| **Alpine Linux 3.20** | `ami-alpine320` | `alpine` | `apk` | `openssh`, `sudo`, `iptables`, `iproute2`, `bash`, `shadow`, `procps` |

Each image features a tailored bootstrap cloud-init script (`entrypoint.sh`) that unlocks the user account in `/etc/shadow`, generates unique SSH host keys, injects the user's public key with strict `0600` permissions, grants passwordless `sudo` privileges, and runs `sshd` with explicit security overrides.

---

### 2. Configurable Sizing & Hardware cgroups Limits
Configure instances via AWS-style preset tiers or custom granular sliders:
- **Preset Sizing**: `t3.nano` (0.5 vCPU, 512 MB), `t3.micro` (1 vCPU, 1 GB), `t3.medium` (2 vCPU, 4 GB), `c6i.xlarge` (4 vCPU, 8 GB), `r6i.xlarge` (4 vCPU, 32 GB).
- **Custom Sliders**: Granularly configure from **0.5 to 16 vCPUs** and **256 MB to 32 GB RAM**.
- **Kernel Enforcement**: Enforced directly through container cgroups quotas (`NanoCpus` and `Memory` limits).

---

### 3. Cryptographic Key Pair Manager
Replicates the AWS EC2 Key Pair experience:
- **Generate Key Pairs**: Generate cryptographically secure **RSA 4096-bit** or **Ed25519** key pairs in OpenSSH format directly in the control plane.
- **Instant Browser Download**: Auto-triggers a client-side download of `<key-name>.pem`.
- **Import Key Pairs**: Paste and import existing `ssh-rsa` or `ssh-ed25519` public keys with instant SHA-256 fingerprint validation.

---

### 4. Zero-Setup EC2 Instance Connect (Browser Terminal)
Click **Connect** on any running instance to access two connection options:
1. **SSH Client Instructions**: Copy-pasteable SSH commands with dynamically assigned ports (`2201–2299`), key name, and host key verification helpers:
   ```bash
   chmod 400 my-key.pem
   ssh -i "my-key.pem" -p 2203 -o StrictHostKeyChecking=accept-new ubuntu@127.0.0.1
   ```
2. **EC2 Instance Connect**: Embedded browser terminal powered by `xterm.js` and WebSockets. Seamlessly attaches to the container's isolated shell via `podman exec` with full window resizing, ANSI colors, and command history.

---

### 5. Stateful Security Groups & Interactive Packet Simulator
- **Visual Rule Builder**: Configure Inbound and Outbound rules with type presets (`SSH`, `HTTP`, `HTTPS`, `Custom TCP`, `Custom UDP`, `All ICMP`), port ranges (`8000-8080`), and CIDR blocks (`0.0.0.0/0`, `10.0.0.0/8`, or "My IP").
- **Real-Time Packet Simulator**: Enter packet details (`Direction`, `Protocol`, `Source IP:Port`, `Destination IP:Port`) and receive an instant `ALLOWED` or `BLOCKED` verdict with matched rule details and rule explanations.

---

### 6. EBS Block Storage Engine
- **Volume Types**: `gp3` General Purpose SSD (baseline 3000 IOPS / 125 MB/s) and `io2` Provisioned IOPS SSD.
- **Configurable Capacity**: 8 GB to 500 GB virtual root volumes.
- **Termination Protection**: "Delete on Termination" toggle allows block volumes to persist after an instance is terminated.

---

### 7. CloudWatch-Style Live Telemetry & Inspector Drawer
Click any instance row in the fleet table to open an AWS-style resizable bottom drawer featuring 6 tabs:
1. **Details**: Metadata, AMI ARN, private/public IPs, and host port mappings.
2. **Security**: Active inbound and outbound firewall rules with color-coded port badges.
3. **Networking**: MAC address, private IPv4, and elastic network interface (`eni-xxx`) details.
4. **Storage**: Root block device (`/dev/sda1`), volume ID, IOPS, and throughput.
5. **Monitoring**: Live-updating area charts (Recharts) streaming real-time **CPU Utilization (%)**, **Memory Usage (MB)**, and **Network In/Out (KB/s)** via WebSockets.
6. **System Log**: Real-time console log viewer showing kernel boot logs, cloud-init output, and `sshd` connection events.

---

## 🔌 REST & WebSocket API Reference

### REST Endpoints (`http://localhost:3001/api`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard` | Get fleet statistics (vCPUs, RAM, running instances, volumes, keys) |
| `GET` | `/api/instances` | List all instances (supports `?state=running` filter) |
| `GET` | `/api/instances/:id` | Get instance metadata and state |
| `POST` | `/api/instances` | Launch a new instance (`LaunchInstanceRequest`) |
| `POST` | `/api/instances/:id/start` | Start a stopped instance |
| `POST` | `/api/instances/:id/stop` | Stop a running instance |
| `POST` | `/api/instances/:id/reboot` | Reboot an instance |
| `POST` | `/api/instances/:id/terminate` | Terminate an instance |
| `GET` | `/api/instances/:id/logs` | Fetch system and boot logs |
| `GET` | `/api/amis` | List available base AMIs (Ubuntu, Debian, Alpine) |
| `GET` | `/api/keypairs` | List all SSH key pairs and fingerprints |
| `POST` | `/api/keypairs` | Generate new RSA / Ed25519 key pair (returns private `.pem`) |
| `POST` | `/api/keypairs/import` | Import an existing public key |
| `DELETE` | `/api/keypairs/:id` | Delete a key pair |
| `GET` | `/api/security-groups` | List all security groups with rules |
| `POST` | `/api/security-groups` | Create a new security group |
| `PUT` | `/api/security-groups/:id` | Update security group details |
| `DELETE` | `/api/security-groups/:id` | Delete a security group |
| `POST` | `/api/security-groups/:id/rules` | Add an inbound/outbound rule |
| `DELETE` | `/api/security-groups/:id/rules/:ruleId` | Delete a firewall rule |
| `POST` | `/api/security-groups/test-packet` | Evaluate a packet against security group rules |
| `GET` | `/api/volumes` | List all EBS block volumes |

### WebSocket Channels (`ws://localhost:3001`)

- **`/ws/terminal?instanceId=:id`**: Interactive bidirection PTY stream (JSON resize events + raw terminal I/O).
- **`/ws/metrics?instanceId=:id`**: Live 5-second interval metric stream (CPU %, Memory MB, Network KB/s).

---

## 📂 Repository Structure

```text
ElasticCloud/
├── client/                          # React + TypeScript Frontend
│   ├── index.html                   # HTML Entry Point
│   ├── vite.config.ts               # Vite Configuration & API Proxy
│   ├── tailwind.config.js           # AWS Squid Ink / Dark Palette
│   └── src/
│       ├── api/client.ts            # Typed REST API Client
│       ├── components/
│       │   ├── common/              # Modal, SplitPane, Badge, Tabs, Table
│       │   ├── instances/           # InstanceTable, InstanceDetails, ConnectModal
│       │   ├── launch-wizard/       # LaunchWizard Configurator
│       │   ├── security-groups/     # SecurityGroupEditor, FirewallTester
│       │   ├── keypairs/            # KeyPairManager (.pem generator)
│       │   ├── terminal/            # WebTerminal (xterm.js integration)
│       │   └── monitoring/          # MetricsChart (Recharts CloudWatch telemetry)
│       └── pages/                   # DashboardPage, InstancesPage, AMIsPage, etc.
│
├── server/                          # Express + WebSocket Control Plane
│   ├── src/
│   │   ├── index.ts                 # Server Entry & WebSocket Setup
│   │   ├── db/                      # SQLite Database Layer (better-sqlite3)
│   │   ├── routes/                  # REST Route Handlers
│   │   ├── services/
│   │   │   ├── compute-driver.ts    # Podman/Docker Driver + Simulation Fallback
│   │   │   ├── key-manager.ts       # Cryptographic Key Generation & Fingerprinting
│   │   │   ├── firewall.ts          # CIDR Matching & Packet Simulator Engine
│   │   │   ├── telemetry.ts         # Resource Metrics Collection Service
│   │   │   └── simulated-sshd.ts    # Fallback In-Memory SSH Daemon
│   │   ├── websocket/               # Terminal & Telemetry WebSocket Handlers
│   │   └── docker/                  # Micro-VM Container Definitions
│   │       ├── entrypoint.sh        # Cloud-Init Bootstrap Script
│   │       ├── ubuntu.Dockerfile    # Ubuntu 24.04 LTS Base Image
│   │       ├── debian.Dockerfile    # Debian 12 Base Image
│   │       └── alpine.Dockerfile    # Alpine 3.20 Base Image
│   └── data/                        # Persistent SQLite Database (elastic.db)
│
├── shared/                          # Shared TypeScript Types & Constants
│   └── types.ts                     # Single Source of Truth
├── package.json                     # Monorepo Workspace Root
└── README.md                        # Documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm`
- **Container Engine** *(optional, simulation fallback activates if absent)*:
  - **Podman** (rootless recommended) or **Docker Engine**

---

### Quickstart Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ElasticCloud.git
   cd ElasticCloud
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Start both Backend and Frontend in development mode:**
   ```bash
   npm run dev
   ```

4. **Access the Console:**
   - **Frontend UI:** [http://localhost:3000](http://localhost:3000)
   - **Backend REST API:** [http://localhost:3001/api](http://localhost:3001/api)

---

### Building Base AMI Images

To enable real container micro-VMs, build the 3 base AMI images using Podman or Docker:

```bash
# 1. Build Ubuntu 24.04 LTS AMI
podman build -t elastic-ubuntu:24.04 -f server/src/docker/ubuntu.Dockerfile server/src/docker/

# 2. Build Debian 12 Bookworm AMI
podman build -t elastic-debian:12 -f server/src/docker/debian.Dockerfile server/src/docker/

# 3. Build Alpine Linux 3.20 AMI
podman build -t elastic-alpine:3.20 -f server/src/docker/alpine.Dockerfile server/src/docker/
```

---

## 🔑 Connecting to Instances

### Using Native SSH

1. Launch an instance with your generated or imported key pair.
2. In the **Instances** table, locate your assigned host port (e.g., `2203`).
3. Set permissions on your downloaded `.pem` file:
   ```bash
   chmod 400 my-key.pem
   ```
4. Connect using the appropriate user for your selected OS:
   ```bash
   # For Ubuntu:
   ssh -i "my-key.pem" -p 2203 -o StrictHostKeyChecking=accept-new ubuntu@127.0.0.1

   # For Debian:
   ssh -i "my-key.pem" -p 2203 -o StrictHostKeyChecking=accept-new debian@127.0.0.1

   # For Alpine:
   ssh -i "my-key.pem" -p 2203 -o StrictHostKeyChecking=accept-new alpine@127.0.0.1
   ```

> [!TIP]
> If a recycled local port triggers a `"REMOTE HOST IDENTIFICATION HAS CHANGED!"` warning, clear the old host key fingerprint with:
> ```bash
> ssh-keygen -R "[127.0.0.1]:2203"
> ```

---

### Using EC2 Instance Connect (Browser Terminal)

1. Select your running instance in the ElasticCloud console.
2. Click **Connect** in the top action toolbar.
3. Switch to the **EC2 Instance Connect (Browser)** tab.
4. An interactive shell will immediately open inside the container with passwordless `sudo` privileges.

---

## 🚢 Production Container Deployment

ElasticCloud is containerized and production-ready for **Docker, Docker Compose, AWS EC2, AWS ECS on Fargate, and Kubernetes**.

```bash
# Option 1: Docker Compose (Local or EC2)
docker compose up -d

# Option 2: Kubernetes (EKS / GKE / K3s)
kubectl apply -k k8s/

# Option 3: Automated AWS Fargate Deployment
./aws/deploy-fargate.sh
```

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for detailed guides on AWS Fargate, EC2 Docker socket provisioning, EFS persistence, Kubernetes ingress/probes, and environment variables.

---

## 📜 License

This project is licensed under the **MIT License**.
