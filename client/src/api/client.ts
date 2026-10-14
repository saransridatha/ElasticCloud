import type {
  Instance,
  KeyPair,
  CreateKeyPairRequest,
  CreateKeyPairResponse,
  ImportKeyPairRequest,
  SecurityGroup,
  SecurityGroupRule,
  CreateSecurityGroupRequest,
  Volume,
  AMI,
  DashboardSummary,
  LaunchInstanceRequest,
  FirewallTestRequest,
  FirewallTestResult,
  ApiResponse,
} from '@shared/types';

const BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as ApiResponse<unknown>;
      if (body.error) message = body.error;
    } catch {
      // use default message
    }
    throw new ApiError(res.status, message);
  }

  const body = (await res.json()) as ApiResponse<T>;
  if (body.success === false) {
    throw new ApiError(400, body.error || 'Unknown error');
  }

  return body.data as T;
}

// ─── Instances ─────────────────────────────────────────────────

export async function fetchInstances(): Promise<Instance[]> {
  return request<Instance[]>('/instances');
}

export async function fetchInstance(id: string): Promise<Instance> {
  return request<Instance>(`/instances/${id}`);
}

export async function launchInstance(req: LaunchInstanceRequest): Promise<Instance> {
  return request<Instance>('/instances', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function controlInstance(
  id: string,
  action: 'start' | 'stop' | 'reboot' | 'terminate'
): Promise<Instance> {
  return request<Instance>(`/instances/${id}/${action}`, {
    method: 'POST',
  });
}

export async function updateInstance(
  id: string,
  data: Partial<Pick<Instance, 'name' | 'tags'>>
): Promise<Instance> {
  return request<Instance>(`/instances/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchInstanceLogs(id: string): Promise<string> {
  const res = await fetch(`${BASE}/instances/${id}/logs`);
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch logs');
  const body = (await res.json()) as ApiResponse<string>;
  return body.data ?? '';
}

// ─── Key Pairs ─────────────────────────────────────────────────

export async function fetchKeyPairs(): Promise<KeyPair[]> {
  return request<KeyPair[]>('/keypairs');
}

export async function createKeyPair(req: CreateKeyPairRequest): Promise<CreateKeyPairResponse> {
  return request<CreateKeyPairResponse>('/keypairs', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function importKeyPair(req: ImportKeyPairRequest): Promise<KeyPair> {
  return request<KeyPair>('/keypairs/import', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function deleteKeyPair(id: string): Promise<void> {
  return request<void>(`/keypairs/${id}`, { method: 'DELETE' });
}

// ─── Security Groups ──────────────────────────────────────────

export async function fetchSecurityGroups(): Promise<SecurityGroup[]> {
  return request<SecurityGroup[]>('/security-groups');
}

export async function fetchSecurityGroup(id: string): Promise<SecurityGroup> {
  return request<SecurityGroup>(`/security-groups/${id}`);
}

export async function createSecurityGroup(
  req: CreateSecurityGroupRequest
): Promise<SecurityGroup> {
  return request<SecurityGroup>('/security-groups', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function addSecurityGroupRule(
  sgId: string,
  rule: Omit<SecurityGroupRule, 'id'>
): Promise<SecurityGroupRule> {
  return request<SecurityGroupRule>(`/security-groups/${sgId}/rules`, {
    method: 'POST',
    body: JSON.stringify(rule),
  });
}

export async function removeSecurityGroupRule(
  sgId: string,
  ruleId: string
): Promise<void> {
  return request<void>(`/security-groups/${sgId}/rules/${ruleId}`, {
    method: 'DELETE',
  });
}

export async function deleteSecurityGroup(id: string): Promise<void> {
  return request<void>(`/security-groups/${id}`, { method: 'DELETE' });
}

export async function testFirewall(req: FirewallTestRequest): Promise<FirewallTestResult> {
  return request<FirewallTestResult>('/security-groups/test-firewall', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// ─── Volumes ───────────────────────────────────────────────────

export async function fetchVolumes(): Promise<Volume[]> {
  return request<Volume[]>('/volumes');
}

// ─── AMIs ──────────────────────────────────────────────────────

export async function fetchAMIs(): Promise<AMI[]> {
  return request<AMI[]>('/amis');
}

// ─── Dashboard ─────────────────────────────────────────────────

export async function fetchDashboard(): Promise<DashboardSummary> {
  return request<DashboardSummary>('/dashboard');
}
