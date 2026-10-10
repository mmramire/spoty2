import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, '..', '..', '..', 'test-data');
const TEST_FILE = path.join(TEST_DIR, 'tokens.json');

// Set environment variables BEFORE importing the module
process.env.SPOTY_TOKENS_DIR = TEST_DIR;
process.env.SPOTY_TOKENS_FILE = TEST_FILE;

import {
  type TokenSet,
  deleteTokens,
  getTokensFilePath,
  isTokenValid,
  loadTokens,
  saveTokens,
} from '@/data/storage/tokens-file.js';

describe('tokens-file.ts - Token persistence', () => {
  const validTokens: TokenSet = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_at: Date.now() + 3600000,
    scope: 'user-read-private user-read-email',
    token_type: 'Bearer',
  };

  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    if (fs.existsSync(TEST_FILE)) {
      fs.unlinkSync(TEST_FILE);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_FILE)) {
      fs.unlinkSync(TEST_FILE);
    }
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('saveTokens', () => {
    it('should write tokens to file', () => {
      saveTokens(validTokens);
      expect(fs.existsSync(TEST_FILE)).toBe(true);
      const content = fs.readFileSync(TEST_FILE, 'utf8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(validTokens);
    });

    it('should create directory if not exists', () => {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
      saveTokens(validTokens);
      expect(fs.existsSync(TEST_FILE)).toBe(true);
    });
  });

  describe('loadTokens', () => {
    it('should return null when file does not exist', () => {
      const result = loadTokens();
      expect(result).toBeNull();
    });

    it('should load valid tokens', () => {
      saveTokens(validTokens);
      const result = loadTokens();
      expect(result).toEqual(validTokens);
    });

    it('should return null for corrupted JSON', () => {
      fs.writeFileSync(TEST_FILE, 'not valid json');
      const result = loadTokens();
      expect(result).toBeNull();
    });

    it('should return null for incomplete tokens', () => {
      fs.writeFileSync(TEST_FILE, JSON.stringify({ access_token: 'only' }));
      const result = loadTokens();
      expect(result).toBeNull();
    });

    it('should return null for wrong token_type', () => {
      const badTokens = { ...validTokens, token_type: 'Wrong' };
      fs.writeFileSync(TEST_FILE, JSON.stringify(badTokens));
      const result = loadTokens();
      expect(result).toBeNull();
    });
  });

  describe('deleteTokens', () => {
    it('should delete the file', () => {
      saveTokens(validTokens);
      deleteTokens();
      expect(fs.existsSync(TEST_FILE)).toBe(false);
    });

    it('should not throw when file does not exist', () => {
      expect(() => deleteTokens()).not.toThrow();
    });
  });

  describe('isTokenValid', () => {
    it('should return true for future expiry', () => {
      const futureTokens = { ...validTokens, expires_at: Date.now() + 10000 };
      expect(isTokenValid(futureTokens)).toBe(true);
    });

    it('should return false for past expiry', () => {
      const pastTokens = { ...validTokens, expires_at: Date.now() - 1000 };
      expect(isTokenValid(pastTokens)).toBe(false);
    });

    it('should return false for current time', () => {
      const nowTokens = { ...validTokens, expires_at: Date.now() };
      expect(isTokenValid(nowTokens)).toBe(false);
    });
  });

  describe('getTokensFilePath', () => {
    it('should return test file path', () => {
      expect(getTokensFilePath()).toBe(TEST_FILE);
    });
  });
});
