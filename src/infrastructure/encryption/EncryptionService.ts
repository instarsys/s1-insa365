import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.PII_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      'PII_ENCRYPTION_KEY environment variable is required. Must be 64 hex characters (32 bytes).',
    );
  }
  if (keyHex.length !== 64) {
    throw new Error(
      `PII_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Got ${keyHex.length} characters.`,
    );
  }
  return Buffer.from(keyHex, 'hex');
}

class EncryptionService {
  encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(encrypted: string): string {
    const key = getEncryptionKey();
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error(
        'Invalid encrypted format. Expected iv:authTag:ciphertext.',
      );
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = Buffer.from(parts[2], 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}

export const encryptionService = new EncryptionService();
