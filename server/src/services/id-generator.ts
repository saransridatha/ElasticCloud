// services/id-generator.ts
// Generates AWS-style resource IDs and network addresses

import crypto from 'crypto';

function hexChars(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

export function generateInstanceId(): string {
  return `i-${hexChars(16)}`;
}

export function generateSgId(): string {
  return `sg-${hexChars(16)}`;
}

export function generateVolumeId(): string {
  return `vol-${hexChars(16)}`;
}

export function generateKeyPairId(): string {
  return `key-${hexChars(16)}`;
}

export function generateRuleId(): string {
  return `sgr-${hexChars(16)}`;
}

export function generateMacAddress(): string {
  const bytes = crypto.randomBytes(5);
  const parts = ['02'];
  for (const b of bytes) {
    parts.push(b.toString(16).padStart(2, '0'));
  }
  return parts.join(':');
}

export function generatePrivateIp(): string {
  const octet3 = Math.floor(Math.random() * 256);
  const octet4 = Math.floor(Math.random() * 254) + 1;
  return `172.31.${octet3}.${octet4}`;
}

export function generateNetworkInterfaceId(): string {
  return `eni-${hexChars(16)}`;
}
