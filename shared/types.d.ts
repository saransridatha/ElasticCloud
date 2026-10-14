export type InstanceState = 'pending' | 'running' | 'stopping' | 'stopped' | 'shutting-down' | 'terminated';
export interface InstanceType {
    name: string;
    vcpus: number;
    memory: number;
    label: string;
    category: string;
}
export declare const INSTANCE_TYPES: InstanceType[];
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
export declare const AVAILABLE_AMIS: AMI[];
export interface Instance {
    id: string;
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
    sshPort: number;
    keyPairId: string | null;
    securityGroupIds: string[];
    volumeId: string;
    containerId: string | null;
    launchTime: string;
    stateTransitionTime: string;
    macAddress: string;
    networkInterface: string;
    tags: Record<string, string>;
    platform: string;
    architecture: string;
}
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
    privateKey: string;
}
export interface ImportKeyPairRequest {
    name: string;
    publicKey: string;
}
export type RuleProtocol = 'tcp' | 'udp' | 'icmp' | 'all';
export type RuleAction = 'ALLOW' | 'DROP';
export type RuleDirection = 'inbound' | 'outbound';
export interface SecurityGroupRule {
    id: string;
    direction: RuleDirection;
    protocol: RuleProtocol;
    portRange: string;
    cidr: string;
    action: RuleAction;
    description: string;
    ruleType: string;
}
export interface SecurityGroup {
    id: string;
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
export type VolumeState = 'creating' | 'available' | 'in-use' | 'deleting' | 'deleted';
export type VolumeType = 'gp3' | 'io2';
export interface Volume {
    id: string;
    name: string;
    sizeGb: number;
    volumeType: VolumeType;
    state: VolumeState;
    iops: number;
    throughput: number;
    attachedInstanceId: string | null;
    deviceName: string;
    deleteOnTermination: boolean;
    createdAt: string;
    encrypted: boolean;
    availabilityZone: string;
}
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
export interface LaunchInstanceRequest {
    name: string;
    amiId: string;
    instanceType: string;
    vcpus: number;
    memoryMb: number;
    storageSizeGb: number;
    storageType: VolumeType;
    deleteStorageOnTermination: boolean;
    keyPairId: string | null;
    securityGroupIds: string[];
    tags?: Record<string, string>;
}
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
//# sourceMappingURL=types.d.ts.map