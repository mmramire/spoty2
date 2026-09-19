import { AuthError, AuthErrorType } from '@/business/auth/errors.js';
import { getUserProfile } from '@/business/auth/profile.js';
import { ProfileFetchError } from '@/data/http/spotify-client.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/data/http/spotify-client.js', () => ({
  fetchUserProfile: vi.fn(),
  ProfileFetchError: class ProfileFetchError extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message);
      this.name = 'ProfileFetchError';
    }
  },
}));

import { fetchUserProfile } from '@/data/http/spotify-client.js';

describe('profile.ts - User profile business logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return profile on success', async () => {
      vi.mocked(fetchUserProfile).mockResolvedValue({
        display_name: 'Test User',
        email: 'test@example.com',
      });

      const result = await getUserProfile('valid-token');
      expect(result).toEqual({
        display_name: 'Test User',
        email: 'test@example.com',
      });
    });

    it('should throw TOKEN_EXPIRED for 401', async () => {
      vi.mocked(fetchUserProfile).mockRejectedValue(new ProfileFetchError('Unauthorized', 401));

      await expect(getUserProfile('expired-token')).rejects.toThrow(AuthError);
      await expect(getUserProfile('expired-token')).rejects.toMatchObject({
        type: AuthErrorType.TOKEN_EXPIRED,
        message: 'La sesión ha expirado. Vuelve a conectar tu cuenta.',
      });
    });

    it('should throw OAUTH_INVALID for 403', async () => {
      vi.mocked(fetchUserProfile).mockRejectedValue(new ProfileFetchError('Forbidden', 403));

      await expect(getUserProfile('invalid-token')).rejects.toThrow(AuthError);
      await expect(getUserProfile('invalid-token')).rejects.toMatchObject({
        type: AuthErrorType.OAUTH_INVALID,
        message: 'Acceso denegado. La autorización ha sido revocada.',
      });
    });

    it('should throw PERMANENT for other errors', async () => {
      vi.mocked(fetchUserProfile).mockRejectedValue(new ProfileFetchError('Server Error', 500));

      await expect(getUserProfile('token')).rejects.toThrow(AuthError);
      await expect(getUserProfile('token')).rejects.toMatchObject({
        type: AuthErrorType.PERMANENT,
      });
    });

    it('should rethrow non-ProfileFetchError', async () => {
      vi.mocked(fetchUserProfile).mockRejectedValue(new Error('Network error'));
      await expect(getUserProfile('token')).rejects.toThrow('Network error');
    });
  });
});
