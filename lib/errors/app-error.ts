/**
 * Centralized Typed Error Taxonomy
 * Ensures internal details, stack traces, and API secrets are never leaked to clients.
 */

export type AppErrorCode =
  | 'INPUT_EMPTY'
  | 'INPUT_TOO_LARGE'
  | 'UNSUPPORTED_FORMAT'
  | 'INVALID_FILE_SIGNATURE'
  | 'PDF_EXTRACTION_FAILED'
  | 'PARSE_FAILED'
  | 'INVALID_PAYLOAD'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'AI_TIMEOUT'
  | 'AI_PROVIDER_ERROR'
  | 'SECURITY_REJECTED'
  | 'SOURCE_VERIFICATION_FAILED'
  | 'REPORT_NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'INTERNAL_ERROR';

export interface PublicErrorResponse {
  error: {
    code: AppErrorCode;
    message: string;
    request_id?: string;
  };
}

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly statusCode: number;
  public readonly isPublic: boolean;
  public readonly details?: unknown;

  constructor(
    code: AppErrorCode,
    message: string,
    statusCode = 400,
    isPublic = true,
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isPublic = isPublic;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Convert internal error into a sanitized, safe public response object
   */
  public toPublicResponse(requestId?: string): PublicErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.isPublic ? this.message : 'An internal processing error occurred.',
        ...(requestId ? { request_id: requestId } : {}),
      },
    };
  }
}

/**
 * Helper to safely sanitize unknown thrown values
 */
export function toSafeAppError(error: unknown, fallbackMessage = 'An unexpected error occurred.'): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof Error) {
    return new AppError('INTERNAL_ERROR', fallbackMessage, 500, false);
  }
  return new AppError('INTERNAL_ERROR', fallbackMessage, 500, false);
}
