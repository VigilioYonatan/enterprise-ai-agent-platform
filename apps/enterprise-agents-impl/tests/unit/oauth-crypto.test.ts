import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  decryptSecret,
  encryptSecret,
  sha256,
} from '@/integrations/domain/services/oauth-crypto.service';

let folder: string | undefined;
afterEach(() => {
  if (folder) rmSync(folder, { force: true, recursive: true });
  folder = undefined;
  delete process.env.OAUTH_ENCRYPTION_KEY_FILE;
});
function init() {
  folder = mkdtempSync(join(tmpdir(), 'agentops-crypto-'));
  const file = join(folder, 'key');
  writeFileSync(file, 'a'.repeat(64), { mode: 0o600 });
  process.env.OAUTH_ENCRYPTION_KEY_FILE = file;
}
describe('encrypted OAuth connections', () => {
  it('roundtrips arbitrary tokens with unique authenticated ciphertext', () => {
    init();
    const token = 'Bearer sensitive-token-✓';
    const a = encryptSecret(token),
      b = encryptSecret(token);
    expect(a).not.toBe(b);
    expect(a).not.toContain('sensitive-token');
    expect(decryptSecret(a)).toBe(token);
    expect(decryptSecret(b)).toBe(token);
  });
  it('fails closed when ciphertext authentication fails', () => {
    init();
    const value = encryptSecret('SECRET');
    const parts = value.split(':');
    parts[3] = Buffer.from('other').toString('base64url');
    expect(() => decryptSecret(parts.join(':'))).toThrow();
  });
  it('fails closed on invalid key formatting or length', () => {
    folder = mkdtempSync(join(tmpdir(), 'agentops-crypto-'));
    const file = join(folder, 'key');
    writeFileSync(file, 'not-a-valid-hex-string', { mode: 0o600 });
    process.env.OAUTH_ENCRYPTION_KEY_FILE = file;
    expect(() => encryptSecret('token')).toThrow(/32 bytes encoded in hex/);
  });
  it('rejects unsupported ciphertext formats and corrupted nonce or tag lengths', () => {
    init();
    expect(() => decryptSecret('v2:a:b:c')).toThrow('Unsupported ciphertext');
    expect(() => decryptSecret('v1:short:tag:payload')).toThrow(
      'Invalid ciphertext',
    );
  });
  it('fails closed on missing encryption key', () => {
    expect(() => encryptSecret('test')).toThrow(/required/);
  });
  it('hashes states deterministically without preserving plaintext', () => {
    expect(sha256('state-123')).toHaveLength(64);
    expect(sha256('state-123')).not.toContain('state-123');
  });
});
