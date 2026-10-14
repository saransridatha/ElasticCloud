// ElasticCloud Shared Types
// Shared between server and client

// ─── Instance Types ─────────────────────────────────────────────

export type InstanceState = 'pending' | 'running' | 'stopping' | 'stopped' | 'shutting-down' | 'terminated';

export interface InstanceType {
  name: string;
  vcpus: number;
  memory: number; // MB
  label: string;
  category: string;
}

export const INSTANCE_TYPES: InstanceType[] = [
  { name: 't3.nano', vcpus: 0.5, memory: 512, label: 't3.nano – 0.5 vCPU, 512 MB', category: 'General Purpose' },
  { name: 't3.micro', vcpus: 1, memory: 1024, label: 't3.micro – 1 vCPU, 1 GB', category: 'General Purpose' },
  { name: 't3.small', vcpus: 1, memory: 2048, label: 't3.small – 1 vCPU, 2 GB', category: 'General Purpose' },
  { name: 't3.medium', vcpus: 2, memory: 4096, label: 't3.medium – 2 vCPU, 4 GB', category: 'General Purpose' },
  { name: 'm6i.large', vcpus: 2, memory: 8192, label: 'm6i.large – 2 vCPU, 8 GB', category: 'General Purpose' },
  { name: 'm6i.xlarge', vcpus: 4, memory: 16384, label: 'm6i.xlarge – 4 vCPU, 16 GB', category: 'General Purpose' },
  { name: 'c6i.large', vcpus: 2, memory: 4096, label: 'c6i.large – 2 vCPU, 4 GB', category: 'Compute Optimized' },
  { name: 'c6i.xlarge', vcpus: 4, memory: 8192, label: 'c6i.xlarge – 4 vCPU, 8 GB', category: 'Compute Optimized' },
  { name: 'c6i.2xlarge', vcpus: 8, memory: 16384, label: 'c6i.2xlarge – 8 vCPU, 16 GB', category: 'Compute Optimized' },
  { name: 'r6i.large', vcpus: 2, memory: 16384, label: 'r6i.large – 2 vCPU, 16 GB', category: 'Memory Optimized' },
  { name: 'r6i.xlarge', vcpus: 4, memory: 32768, label: 'r6i.xlarge – 4 vCPU, 32 GB', category: 'Memory Optimized' },
];

// ─── AMI / OS Images ────────────────────────────────────────────

export interface AMI {
  id: string;
  name: string;
  os: string;
  version: string;
  arch: string;
  description: string;
  defaultUser: string;
  dockerImage: string;
  icon: string;
  rootDeviceName: string;
}

export const AVAILABLE_AMIS: AMI[] = [
  {
    id: 'ami-ubuntu2404',
    name: 'Ubuntu 24.04 LTS (Noble Numbat)',
    os: 'Ubuntu',
    version: '24.04',
    arch: 'x86_64',
    description: 'Canonical Ubuntu 24.04 LTS with HWE kernel, ideal for general purpose workloads.',
    defaultUser: 'ubuntu',
    dockerImage: 'elastic-ubuntu:24.04',
    icon: 'ubuntu',
    rootDeviceName: '/dev/sda1',
  },
  {
    id: 'ami-debian12',
    name: 'Debian 12 (Bookworm)',
    os: 'Debian',
    version: '12',
    arch: 'x86_64',
    description: 'Debian 12 Bookworm stable release, rock-solid server foundation.',
    defaultUser: 'debian',
    dockerImage: 'elastic-debian:12',
    icon: 'debian',
    rootDeviceName: '/dev/xvda',
  },
  {
    id: 'ami-alpine320',
    name: 'Alpine Linux 3.20',
    os: 'Alpine',
    version: '3.20',
    arch: 'x86_64',
    description: 'Alpine Linux 3.20 – ultra-lightweight, musl-based, minimal attack surface.',
    defaultUser: 'alpine',
    dockerImage: 'elastic-alpine:3.20',
    icon: 'alpine',
    rootDeviceName: '/dev/vda1',
  },
];

// ─── Instance ───────────────────────────────────────────────────

export interface Instance {
  id: string;                   // i-0f8a92b1c4d5e6f7a format
  name: string;
  state: InstanceState;
  amiId: string;
  instanceType: string;
  vcpus: number;
  memoryMb: number;
  storageSizeGb: number;
  storageType: 'gp3' | 'io2';
  deleteStorageOnTermination: boolean;
  privateIp: string;
  publicIp: string;
  sshPort: number;              // Host port mapped to container:22
  keyPairId: string | null;
  securityGroupIds: string[];
  volumeId: string;
  containerId: string | null;   // Docker container ID
  launchTime: string;
  stateTransitionTime: string;
  macAddress: string;
  networkInterface: string;
  tags: Record<string, string>;
  platform: string;             // 'linux'
  architecture: string;         // 'x86_64'
}

// ─── Key Pair ───────────────────────────────────────────────────

export type KeyPairType = 'rsa' | 'ed25519';

export interface KeyPair {
  id: string;
  name: string;
  type: KeyPairType;
  fingerprint: string;
  publicKey: string;
  createdAt: string;
  instanceCount?: number;
}

export interface CreateKeyPairRequest {
  name: string;
  type: KeyPairType;
}

export interface CreateKeyPairResponse {
  keyPair: KeyPair;
  privateKey: string;  // PEM format – only returned once on creation
}

export interface ImportKeyPairRequest {
  name: string;
  publicKey: string;
}

// ─── Security Group ─────────────────────────────────────────────

export type RuleProtocol = 'tcp' | 'udp' | 'icmp' | 'all';
export type RuleAction = 'ALLOW' | 'DROP';
export type RuleDirection = 'inbound' | 'outbound';

export interface SecurityGroupRule {
  id: string;
  direction: RuleDirection;
  protocol: RuleProtocol;
  portRange: string;          // e.g., "22" or "8000-8080" or "All"
  cidr: string;               // e.g., "0.0.0.0/0"
  action: RuleAction;
  description: string;
  ruleType: string;           // e.g., "SSH", "HTTP", "Custom TCP"
}

export interface SecurityGroup {
  id: string;                 // sg-0a1b2c3d4e5f format
  name: string;
  description: string;
  inboundRules: SecurityGroupRule[];
  outboundRules: SecurityGroupRule[];
  instanceCount?: number;
  createdAt: string;
  vpcId: string;
}

export interface CreateSecurityGroupRequest {
  name: string;
  description: string;
}

// ─── Volume (EBS) ───────────────────────────────────────────────

export type VolumeState = 'creating' | 'available' | 'in-use' | 'deleting' | 'deleted';
export type VolumeType = 'gp3' | 'io2';

export interface Volume {
  id: string;                  // vol-0123456789abcdef format
  name: string;
  sizeGb: number;
  volumeType: VolumeType;
  state: VolumeState;
  iops: number;
  throughput: number;          // MB/s
  attachedInstanceId: string | null;
  deviceName: string;          // /dev/sda1
  deleteOnTermination: boolean;
  createdAt: string;
  encrypted: boolean;
  availabilityZone: string;
}

// ─── Monitoring / Telemetry ─────────────────────────────────────

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface InstanceMetrics {
  instanceId: string;
  cpuUtilization: MetricDataPoint[];
  memoryUsageMb: MetricDataPoint[];
  networkInKbps: MetricDataPoint[];
  networkOutKbps: MetricDataPoint[];
  diskReadOps: MetricDataPoint[];
  diskWriteOps: MetricDataPoint[];
}

// ─── Dashboard ──────────────────────────────────────────────────

export interface DashboardSummary {
  totalInstances: number;
  runningInstances: number;
  stoppedInstances: number;
  totalVcpus: number;
  totalMemoryMb: number;
  totalStorageGb: number;
  totalVolumes: number;
  totalSecurityGroups: number;
  totalKeyPairs: number;
}

// ─── Launch Instance ────────────────────────────────────────────

export interface LaunchInstanceRequest {
  name: string;
  amiId: string;
  instanceType: string;        // preset name or 'custom'
  vcpus: number;
  memoryMb: number;
  storageSizeGb: number;
  storageType: VolumeType;
  deleteStorageOnTermination: boolean;
  keyPairId: string | null;
  securityGroupIds: string[];
  tags?: Record<string, string>;
}

// ─── Firewall Test ──────────────────────────────────────────────

export interface FirewallTestRequest {
  securityGroupId: string;
  direction: RuleDirection;
  protocol: RuleProtocol;
  sourceIp: string;
  sourcePort: number;
  destIp: string;
  destPort: number;
}

export interface FirewallTestResult {
  allowed: boolean;
  matchedRule: SecurityGroupRule | null;
  explanation: string;
}

// ─── API Response Wrappers ──────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
