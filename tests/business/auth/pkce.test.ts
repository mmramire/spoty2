import {
  buildAuthUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from '@/business/auth/pkce.js';
import { describe, expect, it } from 'vitest';

describe('pkce.ts - PKCE generation', () => {
  describe('generateCodeVerifier', () => {
    it('should generate a string of correct length', () => {
      const verifier = generateCodeVerifier();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });

    it('should generate different values each call', () => {
      const v1 = generateCodeVerifier();
      const v2 = generateCodeVerifier();
      expect(v1).not.toBe(v2);
    });

    it('should only contain valid base64url characters', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate S256 challenge from verifier', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);
    });

    it('should produce consistent challenge for same verifier', () => {
      const verifier = 'test-verifier-12345678901234567890123456789012345678901234';
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });
  });

  describe('generateState', () => {
    it('should generate a random state string', () => {
      const state = generateState();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
    });

    it('should generate different values each call', () => {
      const s1 = generateState();
      const s2 = generateState();
      expect(s1).not.toBe(s2);
    });
  });

  describe('buildAuthUrl', () => {
    it('should build correct authorization URL with all params', () => {
      const config = {
        clientId: 'test-client',
        redirectUri: 'http://127.0.0.1:8888/callback',
        scopes: ['user-read-private', 'user-read-email'],
      };
      const codeChallenge = 'test-challenge';
      const state = 'test-state';

      const url = buildAuthUrl(config, codeChallenge, state);
      const parsed = new URL(url);

      expect(parsed.origin + parsed.pathname).toBe('https://accounts.spotify.com/authorize');
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('client_id')).toBe('test-client');
      expect(parsed.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:8888/callback');
      expect(parsed.searchParams.get('scope')).toBe('user-read-private user-read-email');
      expect(parsed.searchParams.get('code_challenge')).toBe('test-challenge');
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
      expect(parsed.searchParams.get('state')).toBe('test-state');
    });
  });
});
