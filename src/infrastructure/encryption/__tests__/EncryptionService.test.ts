import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const TEST_KEY = 'a'.repeat(64); // 32 bytes hex = valid AES-256 key

describe('EncryptionService', () => {
  let originalKey: string | undefined;

  beforeAll(() => {
    originalKey = process.env.PII_ENCRYPTION_KEY;
    process.env.PII_ENCRYPTION_KEY = TEST_KEY;
  });

  afterAll(() => {
    if (originalKey !== undefined) {
      process.env.PII_ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.PII_ENCRYPTION_KEY;
    }
  });

  // Dynamic import to pick up env var after setting it
  async function getService() {
    const mod = await import('../EncryptionService');
    return mod.encryptionService;
  }

  describe('encrypt + decrypt round-trip', () => {
    it('주민등록번호(RRN) 암복호화', async () => {
      const service = await getService();
      const rrn = '900101-1234567';
      const encrypted = service.encrypt(rrn);
      expect(encrypted).not.toBe(rrn);
      expect(encrypted).toContain(':');
      expect(service.decrypt(encrypted)).toBe(rrn);
    });

    it('계좌번호 암복호화', async () => {
      const service = await getService();
      const account = '110-123-456789';
      const encrypted = service.encrypt(account);
      expect(service.decrypt(encrypted)).toBe(account);
    });

    it('빈 문자열 처리', async () => {
      const service = await getService();
      const encrypted = service.encrypt('');
      expect(service.decrypt(encrypted)).toBe('');
    });

    it('한글 포함 텍스트', async () => {
      const service = await getService();
      const text = '홍길동 주민번호 900101-1234567';
      const encrypted = service.encrypt(text);
      expect(service.decrypt(encrypted)).toBe(text);
    });

    it('긴 텍스트 (256자)', async () => {
      const service = await getService();
      const text = 'A'.repeat(256);
      const encrypted = service.encrypt(text);
      expect(service.decrypt(encrypted)).toBe(text);
    });
  });

  describe('암호화 형식', () => {
    it('iv:authTag:ciphertext 3파트 형식', async () => {
      const service = await getService();
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
    });

    it('매번 다른 IV 사용 (같은 평문 → 다른 암호문)', async () => {
      const service = await getService();
      const plaintext = '900101-1234567';
      const enc1 = service.encrypt(plaintext);
      const enc2 = service.encrypt(plaintext);
      expect(enc1).not.toBe(enc2); // Random IV ensures different ciphertext
      expect(service.decrypt(enc1)).toBe(plaintext);
      expect(service.decrypt(enc2)).toBe(plaintext);
    });
  });

  describe('복호화 오류 처리', () => {
    it('잘못된 형식 → 에러', async () => {
      const service = await getService();
      expect(() => service.decrypt('invalid-format')).toThrow('Invalid encrypted format');
    });

    it('빈 문자열 → 에러', async () => {
      const service = await getService();
      expect(() => service.decrypt('')).toThrow();
    });

    it('변조된 authTag → 에러', async () => {
      const service = await getService();
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with auth tag
      const tamperedTag = Buffer.from('0'.repeat(32), 'hex').toString('base64');
      const tampered = `${parts[0]}:${tamperedTag}:${parts[2]}`;
      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('변조된 ciphertext → 에러', async () => {
      const service = await getService();
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      const tampered = `${parts[0]}:${parts[1]}:${Buffer.from('tampered').toString('base64')}`;
      expect(() => service.decrypt(tampered)).toThrow();
    });
  });

  describe('키 검증', () => {
    it('키 없으면 에러', async () => {
      const saved = process.env.PII_ENCRYPTION_KEY;
      delete process.env.PII_ENCRYPTION_KEY;
      try {
        const service = await getService();
        expect(() => service.encrypt('test')).toThrow('PII_ENCRYPTION_KEY environment variable is required');
      } finally {
        process.env.PII_ENCRYPTION_KEY = saved;
      }
    });

    it('키 길이 부족 → 에러', async () => {
      const saved = process.env.PII_ENCRYPTION_KEY;
      process.env.PII_ENCRYPTION_KEY = 'abc123';
      try {
        const service = await getService();
        expect(() => service.encrypt('test')).toThrow('must be 64 hex characters');
      } finally {
        process.env.PII_ENCRYPTION_KEY = saved;
      }
    });
  });
});
