import { AuthError, AuthErrorType } from '@/business/auth/errors.js';
import {
  clearStoredTokens,
  getStoredTokens,
  storeTokens,
  validateTokensOrThrow,
} from '@/business/auth/tokens.js';
import type { TokenSet } from '@/business/auth/types.js';
import * as tokensFile from '@/data/storage/tokens-file.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/data/storage/tokens-file.js', () => ({
  loadTokens: vi.fn(),
  saveTokens: vi.fn(),
  deleteTokens: vi.fn(),
  isTokenValid: vi.fn(),
}));

describe('tokens.ts - Token business logic', () => {
  const mockTokenSet: TokenSet = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_at: Date.now() + 3600000,
    scope: 'user-read-private user-read-email',
    token_type: 'Bearer',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStoredTokens', () => {
    it('should return null when no tokens stored', () => {
      vi.mocked(tokensFile.loadTokens).mockReturnValue(null);
      const result = getStoredTokens();
      expect(result).toBeNull();
    });

    it('should return null when tokens expired', () => {
      vi.mocked(tokensFile.loadTokens).mockReturnValue(mockTokenSet);
      vi.mocked(tokensFile.isTokenValid).mockReturnValue(false);
      const result = getStoredTokens();
      expect(result).toBeNull();
    });

    it('should return tokens when valid', () => {
      vi.mocked(tokensFile.loadTokens).mockReturnValue(mockTokenSet);
      vi.mocked(tokensFile.isTokenValid).mockReturnValue(true);
      const result = getStoredTokens();
      expect(result).toEqual(mockTokenSet);
    });
  });

  describe('storeTokens', () => {
    it('should store tokens with calculated expires_at', () => {
      const tokenData = {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'user-read-private',
      };

      const result = storeTokens(tokenData);
      expect(tokensFile.saveTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          token_type: 'Bearer',
          scope: 'user-read-private',
          expires_at: expect.any(Number),
        })
      );
      expect(result.expires_at).toBeGreaterThan(Date.now());
    });
  });

  describe('clearStoredTokens', () => {
    it('should call deleteTokens', () => {
      clearStoredTokens();
      expect(tokensFile.deleteTokens).toHaveBeenCalled();
    });
  });

  describe('validateTokensOrThrow', () => {
    it('should throw for null tokens', () => {
      expect(() => validateTokensOrThrow(null)).toThrow(AuthError);
      try {
        validateTokensOrThrow(null);
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).type).toBe(AuthErrorType.TOKENS_CORRUPT);
      }
    });

    it('should throw for missing fields', () => {
      try {
        validateTokensOrThrow({});
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).type).toBe(AuthErrorType.TOKENS_CORRUPT);
      }
      try {
        validateTokensOrThrow({ access_token: 'a' });
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).type).toBe(AuthErrorType.TOKENS_CORRUPT);
      }
    });

    it('should throw for expired tokens', () => {
      const expiredTokens = { ...mockTokenSet, expires_at: Date.now() - 1000 };
      try {
        validateTokensOrThrow(expiredTokens);
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).type).toBe(AuthErrorType.TOKEN_EXPIRED);
      }
    });

    it('should return tokens when valid', () => {
      const result = validateTokensOrThrow(mockTokenSet);
      expect(result).toEqual(mockTokenSet);
    });
  });
});
