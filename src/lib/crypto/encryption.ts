/**
 * AES-256-GCM Encryption Utility
 *
 * Provides symmetric encryption for storing sensitive third-party credentials
 * (API keys, passwords) in the database. The encryption key is derived from
 * NEXTAUTH_SECRET via PBKDF2 so no additional secret management is required.
 *
 * Format: base64( iv[12] + authTag[16] + ciphertext )
 *
 * @module lib/crypto/encryption
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_SALT = 'sitrus-credential-encryption';

/**
 * Derive a 256-bit encryption key from NEXTAUTH_SECRET.
 * Cached after first derivation to avoid repeated PBKDF2 calls.
 */
let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for credential encryption');
  }

  cachedKey = pbkdf2Sync(secret, PBKDF2_SALT, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  return cachedKey;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded string containing iv + authTag + ciphertext
 *
 * @example
 * const encrypted = encrypt('my-api-key');
 * // "dGhpcyBpcyBhIHRlc3Q..." (base64)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Pack: iv (12) + authTag (16) + ciphertext (variable)
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt a base64-encoded AES-256-GCM ciphertext back to plaintext.
 *
 * @param encryptedBase64 - The base64 string produced by encrypt()
 * @returns The original plaintext string
 * @throws {Error} If decryption fails (wrong key, tampered data, etc.)
 *
 * @example
 * const original = decrypt(encrypted);
 * // "my-api-key"
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const packed = Buffer.from(encryptedBase64, 'base64');

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
