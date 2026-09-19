import {
  SCOPES_STRING,
  extractPortFromRedirectUri,
  getAuthConfig,
  validateRedirectUri,
} from '@/business/auth/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('types.ts - Config validation', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  describe('validateRedirectUri', () => {
    it('should accept valid redirect URI with 127.0.0.1', () => {
      const result = validateRedirectUri('http://127.0.0.1:8888/callback');
      expect(result.valid).toBe(true);
    });

    it('should reject localhost', () => {
      const result = validateRedirectUri('http://localhost:8888/callback');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('localhost');
    });

    it('should reject non-http protocol', () => {
      const result = validateRedirectUri('https://127.0.0.1:8888/callback');
      expect(result.valid).toBe(false);
    });

    it('should reject missing /callback path', () => {
      const result = validateRedirectUri('http://127.0.0.1:8888/other');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('/callback');
    });

    it('should reject invalid port', () => {
      const result = validateRedirectUri('http://127.0.0.1:99999/callback');
      expect(result.valid).toBe(false);
    });

    it('should reject malformed URI', () => {
      const result = validateRedirectUri('not-a-uri');
      expect(result.valid).toBe(false);
    });
  });

  describe('extractPortFromRedirectUri', () => {
    it('should extract port from valid URI', () => {
      const port = extractPortFromRedirectUri('http://127.0.0.1:8888/callback');
      expect(port).toBe(8888);
    });

    it('should extract different ports', () => {
      expect(extractPortFromRedirectUri('http://127.0.0.1:3000/callback')).toBe(3000);
      expect(extractPortFromRedirectUri('http://127.0.0.1:8080/callback')).toBe(8080);
    });
  });

  describe('getAuthConfig', () => {
    it('should throw when env vars missing', () => {
      expect(() => getAuthConfig()).toThrow('Missing required environment variables');
    });

    it('should return config when env vars present', () => {
      process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
      process.env.SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:8888/callback';

      const config = getAuthConfig();
      expect(config.clientId).toBe('test-client-id');
      expect(config.redirectUri).toBe('http://127.0.0.1:8888/callback');
      expect(config.scopes).toHaveLength(8);
    });
  });

  describe('SCOPES_STRING', () => {
    it('should contain all required scopes', () => {
      expect(SCOPES_STRING).toContain('user-read-private');
      expect(SCOPES_STRING).toContain('user-read-email');
      expect(SCOPES_STRING).toContain('user-library-read');
      expect(SCOPES_STRING).toContain('user-library-modify');
      expect(SCOPES_STRING).toContain('playlist-read-private');
      expect(SCOPES_STRING).toContain('playlist-modify-private');
      expect(SCOPES_STRING).toContain('playlist-modify-public');
      expect(SCOPES_STRING).toContain('playlist-read-collaborative');
    });
  });
});
