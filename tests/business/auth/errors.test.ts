import {
  AuthError,
  AuthErrorType,
  isCancelledError,
  isConfigError,
  isTransientError,
  mapHttpError,
} from '@/business/auth/errors.js';
import { describe, expect, it } from 'vitest';

describe('errors.ts - Auth error handling', () => {
  describe('mapHttpError', () => {
    it('should map 400 to PERMANENT', () => {
      const error = mapHttpError(400, 'Bad Request');
      expect(error.type).toBe(AuthErrorType.PERMANENT);
      expect(error.message).toContain('Solicitud inválida');
    });

    it('should map 401 to TOKEN_EXPIRED', () => {
      const error = mapHttpError(401, 'Unauthorized');
      expect(error.type).toBe(AuthErrorType.TOKEN_EXPIRED);
      expect(error.message).toContain('expirado');
    });

    it('should map 403 to OAUTH_INVALID', () => {
      const error = mapHttpError(403, 'Forbidden');
      expect(error.type).toBe(AuthErrorType.OAUTH_INVALID);
      expect(error.message).toContain('revocada');
    });

    it('should map 429 to TRANSIENT', () => {
      const error = mapHttpError(429, 'Too Many Requests');
      expect(error.type).toBe(AuthErrorType.TRANSIENT);
      expect(error.message).toContain('Demasiadas peticiones');
    });

    it('should map 500 to TRANSIENT', () => {
      const error = mapHttpError(500, 'Internal Server Error');
      expect(error.type).toBe(AuthErrorType.TRANSIENT);
      expect(error.message).toContain('Error del servidor');
    });

    it('should map 503 to TRANSIENT', () => {
      const error = mapHttpError(503, 'Service Unavailable');
      expect(error.type).toBe(AuthErrorType.TRANSIENT);
    });

    it('should map unknown status to PERMANENT', () => {
      const error = mapHttpError(418, 'Teapot');
      expect(error.type).toBe(AuthErrorType.PERMANENT);
    });
  });

  describe('isTransientError', () => {
    it('should return true for TRANSIENT errors', () => {
      const error = new AuthError(AuthErrorType.TRANSIENT, 'Temporary error');
      expect(isTransientError(error)).toBe(true);
    });

    it('should return false for PERMANENT errors', () => {
      const error = new AuthError(AuthErrorType.PERMANENT, 'Permanent error');
      expect(isTransientError(error)).toBe(false);
    });

    it('should return false for CANCELLED errors', () => {
      const error = new AuthError(AuthErrorType.CANCELLED, 'Cancelled');
      expect(isTransientError(error)).toBe(false);
    });
  });

  describe('isConfigError', () => {
    it('should return true for CONFIG errors', () => {
      const error = new AuthError(AuthErrorType.CONFIG, 'Config error');
      expect(isConfigError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new AuthError(AuthErrorType.PERMANENT, 'Other error');
      expect(isConfigError(error)).toBe(false);
    });

    it('should return false for non-AuthError', () => {
      expect(isConfigError(new Error('plain error'))).toBe(false);
      expect(isConfigError('string')).toBe(false);
      expect(isConfigError(null)).toBe(false);
    });
  });

  describe('isCancelledError', () => {
    it('should return true for CANCELLED errors', () => {
      const error = new AuthError(AuthErrorType.CANCELLED, 'Cancelled');
      expect(isCancelledError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new AuthError(AuthErrorType.PERMANENT, 'Other error');
      expect(isCancelledError(error)).toBe(false);
    });
  });

  describe('AuthError', () => {
    it('should store type, message, cause and retries', () => {
      const cause = new Error('original');
      const error = new AuthError(AuthErrorType.TRANSIENT, 'Test error', cause, 2);
      expect(error.type).toBe(AuthErrorType.TRANSIENT);
      expect(error.message).toBe('Test error');
      expect(error.cause).toBe(cause);
      expect(error.retries).toBe(2);
    });
  });
});
