// services/firewall.ts
// Security Group firewall engine with CIDR matching, rule evaluation, and iptables generation

import type {
  SecurityGroupRule,
  RuleProtocol,
  FirewallTestRequest,
  FirewallTestResult,
} from '@shared/types';

/**
 * Converts an IPv4 string into a 32-bit integer
 */
export function ipToInt(ip: string): number {
  const parts = ip.trim().split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Checks if an IP is contained within a CIDR range (e.g. 192.168.1.0/24 or 0.0.0.0/0)
 */
export function isIpInCIDR(ip: string, cidr: string): boolean {
  const trimmed = cidr.trim();
  if (trimmed === '0.0.0.0/0' || trimmed === 'Anywhere') return true;

  try {
    const [rangeIp, prefixStr] = trimmed.split('/');
    const prefix = prefixStr !== undefined ? parseInt(prefixStr, 10) : 32;

    if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
    if (prefix === 0) return true;

    const mask = prefix === 32 ? 0xffffffff : ((0xffffffff << (32 - prefix)) >>> 0);
    const ipInt = ipToInt(ip);
    const rangeInt = ipToInt(rangeIp);

    return (ipInt & mask) === (rangeInt & mask);
  } catch {
    return false;
  }
}

/**
 * Parses port range strings like '22', '8000-8080', 'All', or '*'
 */
export function parsePortRange(range: string): { start: number; end: number } | 'ALL' {
  const trimmed = (range || '').trim().toLowerCase();
  if (!trimmed || trimmed === 'all' || trimmed === '*' || trimmed === '0-65535') {
    return 'ALL';
  }

  if (trimmed.includes('-')) {
    const [s, e] = trimmed.split('-').map((p) => parseInt(p.trim(), 10));
    if (!isNaN(s) && !isNaN(e)) {
      return { start: Math.min(s, e), end: Math.max(s, e) };
    }
  }

  const single = parseInt(trimmed, 10);
  if (!isNaN(single)) {
    return { start: single, end: single };
  }

  return 'ALL';
}

/**
 * Checks if a packet's port falls within the allowed port range
 */
export function isPortMatch(packetPort: number, rulePortRange: string): boolean {
  const parsed = parsePortRange(rulePortRange);
  if (parsed === 'ALL') return true;
  return packetPort >= parsed.start && packetPort <= parsed.end;
}

/**
 * Checks if a packet protocol matches a rule protocol
 */
export function isProtocolMatch(packetProto: RuleProtocol, ruleProto: RuleProtocol): boolean {
  if (ruleProto === 'all' || packetProto === 'all') return true;
  return packetProto.toLowerCase() === ruleProto.toLowerCase();
}

/**
 * Evaluates a network packet against a set of security group rules
 * Stateful firewall semantics: First matching ALLOW or explicit DROP rule determines verdict.
 * Default for inbound with no matching rule: DROP (AWS implicit deny).
 * Default for outbound with no matching rule: DROP (if rules defined) or ALLOW (if empty).
 */
export function evaluatePacket(
  rules: SecurityGroupRule[],
  packet: FirewallTestRequest
): FirewallTestResult {
  const directionRules = rules.filter((r) => r.direction === packet.direction);

  const testIp = packet.direction === 'inbound' ? packet.sourceIp : packet.destIp;
  const testPort = packet.direction === 'inbound' ? packet.destPort : packet.destPort;

  for (const rule of directionRules) {
    const protoOk = isProtocolMatch(packet.protocol, rule.protocol);
    if (!protoOk) continue;

    // ICMP does not have TCP/UDP port ranges
    const portOk = rule.protocol === 'icmp' ? true : isPortMatch(testPort, rule.portRange);
    if (!portOk) continue;

    const ipOk = isIpInCIDR(testIp, rule.cidr);
    if (!ipOk) continue;

    // We have a match!
    const isAllowed = rule.action === 'ALLOW';
    return {
      allowed: isAllowed,
      matchedRule: rule,
      explanation: isAllowed
        ? `Packet ALLOWED by Rule [${rule.id}] (${rule.ruleType}): Matched ${rule.protocol.toUpperCase()} port ${rule.portRange} from CIDR ${rule.cidr}`
        : `Packet BLOCKED by explicit DROP Rule [${rule.id}]: Matched ${rule.protocol.toUpperCase()} port ${rule.portRange} from CIDR ${rule.cidr}`,
    };
  }

  // No rule matched
  if (packet.direction === 'inbound') {
    return {
      allowed: false,
      matchedRule: null,
      explanation: `Packet BLOCKED by default implicit Inbound Deny: No security group rule matched ${packet.protocol.toUpperCase()} port ${testPort} from ${testIp}`,
    };
  } else {
    // If outbound rules are present but none matched, drop. If no outbound rules configured, allow.
    if (directionRules.length > 0) {
      return {
        allowed: false,
        matchedRule: null,
        explanation: `Packet BLOCKED by default implicit Outbound Deny: Outbound rules are configured but none matched ${packet.protocol.toUpperCase()} port ${testPort} to ${testIp}`,
      };
    }
    return {
      allowed: true,
      matchedRule: null,
      explanation: 'Packet ALLOWED: Default outbound traffic permitted (no egress restrictions defined).',
    };
  }
}

/**
 * Generates iptables command list to enforce rules inside the Linux container network namespace
 */
export function generateIptablesCommands(rules: SecurityGroupRule[]): string[] {
  const cmds: string[] = [
    'iptables -F INPUT',
    'iptables -F OUTPUT',
    // Allow loopback
    'iptables -A INPUT -i lo -j ACCEPT',
    'iptables -A OUTPUT -o lo -j ACCEPT',
    // Allow established / related stateful connections
    'iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT',
    'iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT',
  ];

  for (const rule of rules) {
    const chain = rule.direction === 'inbound' ? 'INPUT' : 'OUTPUT';
    const target = rule.action === 'ALLOW' ? 'ACCEPT' : 'DROP';
    const ipFlag = rule.direction === 'inbound' ? '-s' : '-d';

    let protoPart = '';
    let portPart = '';

    if (rule.protocol === 'tcp' || rule.protocol === 'udp') {
      protoPart = `-p ${rule.protocol}`;
      const range = parsePortRange(rule.portRange);
      if (range !== 'ALL') {
        portPart = `--dport ${range.start === range.end ? range.start : `${range.start}:${range.end}`}`;
      }
    } else if (rule.protocol === 'icmp') {
      protoPart = '-p icmp';
    }

    const cidrPart = rule.cidr && rule.cidr !== '0.0.0.0/0' ? `${ipFlag} ${rule.cidr}` : '';

    const ruleCmd = ['iptables -A', chain, protoPart, portPart, cidrPart, '-j', target]
      .filter(Boolean)
      .join(' ');

    cmds.push(ruleCmd);
  }

  // Default policies
  cmds.push('iptables -A INPUT -j DROP');

  return cmds;
}
