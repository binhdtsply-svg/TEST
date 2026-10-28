import crypto from 'node:crypto';

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCKSIZE = 8;
const SCRYPT_PARALLELISM = 1;

/**
 * Standard scrypt password/secret hashing
 * Output format: scrypt:salt:hash
 */
export function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(secret, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCKSIZE,
    p: SCRYPT_PARALLELISM,
    maxmem: 32 * 1024 * 1024
  });
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Constant-time scrypt verification
 */
export function verifySecret(secret: string, combinedHash: string): boolean {
  if (!combinedHash || !combinedHash.startsWith('scrypt:')) {
    return false;
  }
  const parts = combinedHash.split(':');
  if (parts.length !== 3) {
    return false;
  }
  const [, salt, expectedHashHex] = parts;
  const derivedKey = crypto.scryptSync(secret, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCKSIZE,
    p: SCRYPT_PARALLELISM,
    maxmem: 32 * 1024 * 1024
  });
  const actualBuffer = derivedKey;
  const expectedBuffer = Buffer.from(expectedHashHex, 'hex');

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

/**
 * Sign session token with server HMAC
 */
const SERVER_SECRET = process.env.SESSION_SECRET || 'kgcns_secure_server_secret_key_2025_prod';

export function generateSessionToken(payload: Record<string, any>): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SERVER_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string): Record<string, any> | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }
  const [data, signature] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SERVER_SECRET).update(data).digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(data, 'base64url').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export const DEFAULT_INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || '123456@';
export const DEFAULT_INITIAL_RECOVERY_CODE = 'KHONGGIANCHUNHIEMSO2026';
