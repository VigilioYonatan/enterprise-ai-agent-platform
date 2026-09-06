import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { readFileSync } from 'node:fs';

/** Tokens are envelope-encrypted using a local 256-bit key provisioned outside Git. */
function key(): Buffer {
  const path = process.env.OAUTH_ENCRYPTION_KEY_FILE;
  if (!path)
    throw new Error('OAUTH_ENCRYPTION_KEY_FILE required for OAuth connections');
  const raw = readFileSync(path, 'utf8').trim();
  if (!/^[a-fA-F0-9]{64}$/.test(raw))
    throw new Error('OAuth AES key must be 32 bytes encoded in hex');
  return Buffer.from(raw, 'hex');
}
export function encryptSecret(value: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), nonce);
  const payload = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v1:${nonce.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${payload.toString('base64url')}`;
}
export function decryptSecret(value: string): string {
  const parts = value.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1')
    throw Error('Unsupported ciphertext');
  const nonce = Buffer.from(parts[1], 'base64url'),
    tag = Buffer.from(parts[2], 'base64url'),
    data = Buffer.from(parts[3], 'base64url');
  if (nonce.length !== 12 || tag.length !== 16)
    throw Error('Invalid ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', key(), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}
export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
