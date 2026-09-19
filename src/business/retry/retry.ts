import { getLogger } from '../../data/logging/pino-setup.js';
import { AuthError, isTransientError } from '../auth/errors.js';

const MAX_RETRIES = 2;

export interface RetryPolicy {
  maxRetries: number;
  shouldRetry: (error: AuthError, attempt: number) => boolean;
  getDelay: (error: AuthError, attempt: number, retryAfter?: number) => number;
}

export const defaultRetryPolicy: RetryPolicy = {
  maxRetries: MAX_RETRIES,
  shouldRetry: (error: AuthError, attempt: number) => {
    if (attempt >= MAX_RETRIES) return false;
    return isTransientError(error);
  },
  getDelay: (_error: AuthError, attempt: number, retryAfter?: number) => {
    if (retryAfter && retryAfter > 0) {
      return (retryAfter + 1) * 1000;
    }
    return Math.min(1000 * 2 ** attempt, 10000);
  },
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy = defaultRetryPolicy,
  context: Record<string, unknown> = {}
): Promise<T> {
  const logger = getLogger();
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!(error instanceof AuthError)) {
        throw error;
      }

      logger.warn({ ...context, attempt: attempt + 1, error: error.message }, 'Operation failed');

      if (!policy.shouldRetry(error, attempt)) {
        logger.error(
          { ...context, error: error.message },
          'Max retries exceeded or non-retryable error'
        );
        throw error;
      }

      const retryAfter = extractRetryAfter(error);
      const delay = policy.getDelay(error, attempt, retryAfter);

      logger.info({ ...context, delay, attempt: attempt + 1 }, 'Retrying after delay');
      await sleep(delay);
      attempt++;
    }
  }
}

function extractRetryAfter(error: AuthError): number | undefined {
  if (error.cause && 'status' in error.cause && error.cause.status === 429) {
    return 1;
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
