// services/key-manager.ts
// SSH Key Pair generation, parsing, and fingerprinting

import crypto from 'crypto';
import sshpk from 'sshpk';
import type { KeyPairType } from '@shared/types';
import { generateKeyPairId } from './id-generator';

export interface GeneratedKeyResult {
  id: string;
  name: string;
  type: KeyPairType;
  publicKey: string;
  privateKey: string;
  fingerprint: string;
}

export class KeyManager {
  /**
   * Generates a new SSH key pair (RSA 2048 or Ed25519)
   * Returns OpenSSH public key and PEM private key
   */
  public static generateKeyPair(name: string, type: KeyPairType = 'rsa'): GeneratedKeyResult {
    let publicKeyOpenSSH = '';
    let privateKeyPem = '';
    let fingerprintStr = '';

    if (type === 'ed25519') {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const parsedKey = sshpk.parseKey(publicKey, 'pem');
      publicKeyOpenSSH = `${parsedKey.toString('ssh')} ${name}`;
      privateKeyPem = String(privateKey);
      fingerprintStr = parsedKey.fingerprint('sha256').toString();
    } else {
      // RSA 2048 bit for fast generation and maximum compatibility
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const parsedKey = sshpk.parseKey(publicKey, 'pem');
      publicKeyOpenSSH = `${parsedKey.toString('ssh')} ${name}`;
      privateKeyPem = String(privateKey);
      fingerprintStr = parsedKey.fingerprint('sha256').toString();
    }

    return {
      id: generateKeyPairId(),
      name,
      type,
      publicKey: publicKeyOpenSSH,
      privateKey: privateKeyPem,
      fingerprint: fingerprintStr,
    };
  }

  /**
   * Validates and extracts metadata from an imported public key
   */
  public static parsePublicKey(publicKeyStr: string): { type: KeyPairType; fingerprint: string } {
    const trimmed = publicKeyStr.trim();
    try {
      const parsed = sshpk.parseKey(trimmed, 'ssh');
      const keyType = parsed.type === 'ed25519' ? 'ed25519' : 'rsa';
      const fingerprint = parsed.fingerprint('sha256').toString();
      return { type: keyType, fingerprint };
    } catch (err: any) {
      // Fallback manual fingerprint calculation if sshpk fails
      if (trimmed.startsWith('ssh-rsa') || trimmed.startsWith('ssh-ed25519')) {
        const parts = trimmed.split(/\s+/);
        const b64 = parts[1] || '';
        const buf = Buffer.from(b64, 'base64');
        const hash = crypto.createHash('sha256').update(buf).digest('base64').replace(/=+$/, '');
        return {
          type: trimmed.startsWith('ssh-ed25519') ? 'ed25519' : 'rsa',
          fingerprint: `SHA256:${hash}`,
        };
      }
      throw new Error(`Invalid public key format: ${err.message || 'Expected OpenSSH format'}`);
    }
  }
}
