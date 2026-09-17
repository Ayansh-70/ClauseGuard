import { describe, it, expect } from 'vitest';
import { AppError, toSafeAppError } from '@/lib/errors/app-error';

describe('Error Taxonomy & Safe Responses', () => {
  it('converts public AppError to safe response without exposing stack traces', () => {
    const error = new AppError('INPUT_EMPTY', 'The document is empty.', 400, true);
    const response = error.toPublicResponse('req_123');

    expect(response).toEqual({
      error: {
        code: 'INPUT_EMPTY',
        message: 'The document is empty.',
        request_id: 'req_123',
      },
    });
    expect((response as unknown as Record<string, unknown>).stack).toBeUndefined();
  });

  it('masks internal non-public error messages to prevent sensitive leaks', () => {
    const internalError = new AppError(
      'INTERNAL_ERROR',
      'Database password failure at /var/secrets/key.pem',
      500,
      false
    );
    const response = internalError.toPublicResponse();

    expect(response.error.message).toBe('An internal processing error occurred.');
    expect(response.error.message).not.toContain('/var/secrets');
  });

  it('safely wraps unknown thrown objects into safe AppError', () => {
    const rawError = new Error('Raw unhandled exception with stack info');
    const safe = toSafeAppError(rawError);

    expect(safe.code).toBe('INTERNAL_ERROR');
    expect(safe.statusCode).toBe(500);
    expect(safe.isPublic).toBe(false);
  });
});
