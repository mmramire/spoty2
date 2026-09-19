import { AuthError, AuthErrorType } from '@/business/auth/errors.js';
import { type RetryPolicy, defaultRetryPolicy, withRetry } from '@/business/retry/retry.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('retry.ts - Retry policy', () => {
  describe('defaultRetryPolicy', () => {
    it('should have maxRetries of 2', () => {
      expect(defaultRetryPolicy.maxRetries).toBe(2);
    });

    it('should retry transient errors', () => {
      const error = new AuthError(AuthErrorType.TRANSIENT, 'Temporary');
      expect(defaultRetryPolicy.shouldRetry(error, 0)).toBe(true);
      expect(defaultRetryPolicy.shouldRetry(error, 1)).toBe(true);
    });

    it('should not retry after maxRetries', () => {
      const error = new AuthError(AuthErrorType.TRANSIENT, 'Temporary');
      expect(defaultRetryPolicy.shouldRetry(error, 2)).toBe(false);
    });

    it('should not retry permanent errors', () => {
      const error = new AuthError(AuthErrorType.PERMANENT, 'Permanent');
      expect(defaultRetryPolicy.shouldRetry(error, 0)).toBe(false);
    });

    it('should not retry cancelled errors', () => {
      const error = new AuthError(AuthErrorType.CANCELLED, 'Cancelled');
      expect(defaultRetryPolicy.shouldRetry(error, 0)).toBe(false);
    });

    it('should calculate delay with Retry-After header', () => {
      const error = new AuthError(AuthErrorType.TRANSIENT, 'Rate limited');
      const delay = defaultRetryPolicy.getDelay(error, 0, 5);
      expect(delay).toBe(6000); // (5 + 1) * 1000
    });

    it('should calculate exponential backoff without Retry-After', () => {
      const error = new AuthError(AuthErrorType.TRANSIENT, 'Server error');
      expect(defaultRetryPolicy.getDelay(error, 0)).toBe(1000); // 2^0 * 1000
      expect(defaultRetryPolicy.getDelay(error, 1)).toBe(2000); // 2^1 * 1000
      expect(defaultRetryPolicy.getDelay(error, 2)).toBe(4000); // 2^2 * 1000
    });

    it('should cap delay at 10000ms', () => {
      const error = new AuthError(AuthErrorType.TRANSIENT, 'Server error');
      expect(defaultRetryPolicy.getDelay(error, 10)).toBe(10000);
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return result on first success', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await withRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient error and succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new AuthError(AuthErrorType.TRANSIENT, 'Temp error'))
        .mockResolvedValue('success');

      const promise = withRetry(operation);
      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries exhausted', async () => {
      vi.useRealTimers();
      try {
        const error = new AuthError(AuthErrorType.TRANSIENT, 'Always fails');
        let callCount = 0;
        const operation = vi.fn().mockImplementation(() => {
          callCount++;
          throw error;
        });

        const customPolicy: RetryPolicy = {
          maxRetries: 2,
          shouldRetry: (err, attempt) => attempt < 2 && err.type === AuthErrorType.TRANSIENT,
          getDelay: () => 10,
        };

        const promise = withRetry(operation, customPolicy);

        let thrownError: Error | null = null;
        try {
          await promise;
        } catch (e) {
          thrownError = e as Error;
        }

        expect(thrownError).toBeInstanceOf(AuthError);
        expect(thrownError?.message).toBe('Always fails');
        expect(callCount).toBe(3); // initial + 2 retries
      } finally {
        vi.useFakeTimers();
      }
    });

    it('should not retry non-AuthError', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Plain error'));
      await expect(withRetry(operation)).rejects.toThrow('Plain error');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry permanent AuthError', async () => {
      const error = new AuthError(AuthErrorType.PERMANENT, 'Permanent');
      const operation = vi.fn().mockRejectedValue(error);
      await expect(withRetry(operation)).rejects.toThrow(AuthError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry policy', async () => {
      const customPolicy: RetryPolicy = {
        maxRetries: 1,
        shouldRetry: () => true,
        getDelay: () => 100,
      };

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new AuthError(AuthErrorType.TRANSIENT, 'Temp'))
        .mockResolvedValue('success');

      const promise = withRetry(operation, customPolicy);
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should pass context to logger', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new AuthError(AuthErrorType.TRANSIENT, 'Temp'))
        .mockResolvedValue('success');

      const promise = withRetry(operation, defaultRetryPolicy, { operation: 'test' });
      await vi.advanceTimersByTimeAsync(1000);
      await promise;
    });
  });
});
