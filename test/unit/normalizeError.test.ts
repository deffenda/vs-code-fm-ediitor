import { describe, expect, it } from 'vitest';

import { FMClientError } from '../../src/services/errors';
import { normalizeError } from '../../src/utils/normalizeError';

describe('normalizeError', () => {
  it('maps FileMaker 401 payload to auth error', () => {
    const error = normalizeError({
      isAxiosError: true,
      message: 'Unauthorized',
      response: {
        status: 401,
        data: {
          messages: [{ code: '952', message: 'Invalid token' }]
        },
        headers: {
          authorization: 'Bearer secret-token'
        }
      }
    });

    expect(error.kind).toBe('auth');
    expect(error.code).toBe('952');
    expect(error.message).toContain('Invalid token');
    expect(error.safeHeaders?.authorization).toBe('***');
  });

  it('maps timeout to timeout kind with retryable true', () => {
    const error = normalizeError({
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 1000ms exceeded',
      response: {
        status: 504,
        data: 'gateway timeout'
      }
    });

    expect(error.kind).toBe('timeout');
    expect(error.isRetryable).toBe(true);
    expect(error.status).toBe(504);
  });

  it('maps abort errors to cancellation', () => {
    const error = normalizeError(new DOMException('Aborted', 'AbortError'));

    expect(error.kind).toBe('cancellation');
    expect(error.isRetryable).toBe(false);
  });

  it('maps FMClientError preserving status and details', () => {
    const source = new FMClientError('Boom', {
      status: 500,
      code: '500',
      details: { token: 'secret' }
    });

    const error = normalizeError(source);
    expect(error.kind).toBe('server');
    expect(error.status).toBe(500);
    expect(error.code).toBe('500');
    expect(error.details).toEqual({ token: 'secret' });
  });

  it('applies fallback message and request metadata', () => {
    const error = normalizeError(
      {
        isAxiosError: true,
        message: 'Network Error',
        response: undefined
      },
      {
        fallbackMessage: 'Could not complete request.',
        requestId: 'req-1',
        endpoint: 'GET /layouts'
      }
    );

    expect(error.message).toContain('Could not complete request.');
    expect(error.requestId).toBe('req-1');
    expect(error.endpoint).toBe('GET /layouts');
  });
});
