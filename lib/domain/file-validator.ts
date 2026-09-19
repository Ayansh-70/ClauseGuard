import { AppError } from '../errors/app-error';
import { MAX_FILE_SIZE_BYTES } from '../security/safe-string';
import { SupportedDocumentFormat, SupportedFileExtension } from '@/types/domain';

export interface ValidatedFileInput {
  buffer: Buffer;
  fileName: string;
  extension: SupportedFileExtension;
  format: SupportedDocumentFormat;
  sizeBytes: number;
}

const SUPPORTED_EXTENSIONS: Record<string, { format: SupportedDocumentFormat; extension: SupportedFileExtension }> = {
  txt: { format: 'text/plain', extension: 'txt' },
  md: { format: 'text/markdown', extension: 'md' },
  pdf: { format: 'application/pdf', extension: 'pdf' },
};

/**
 * Sanitizes a filename to prevent path traversal and arbitrary filesystem references.
 */
export function sanitizeFileName(rawFileName: string): string {
  // Strip path traversal sequences (../, ..\, etc.) and directory paths
  const baseName = rawFileName.replace(/^.*[\\/]/, '');
  // Retain only safe alphanumeric characters, dashes, underscores, spaces, and periods
  let sanitized = baseName.replace(/[^a-zA-Z0-9._\-\s]/g, '_').trim();
  // Strip leading dots or strings that are purely dots to prevent hidden/traversal names
  sanitized = sanitized.replace(/^\.+/, '');
  return sanitized.length > 0 ? sanitized.slice(0, 255) : 'document';
}

/**
 * Validates raw file buffer and filename before processing.
 */
export function validateFile(rawFileName: string, buffer: Buffer): ValidatedFileInput {
  if (!buffer || buffer.length === 0) {
    throw new AppError('INPUT_EMPTY', 'The uploaded file is empty.', 400);
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      'INPUT_TOO_LARGE',
      `File size (${(buffer.length / 1024).toFixed(1)} KB) exceeds maximum limit of 500 KB.`,
      413
    );
  }

  const sanitizedName = sanitizeFileName(rawFileName);
  const extMatch = sanitizedName.match(/\.([a-zA-Z0-9]+)$/);
  const rawExt = extMatch ? extMatch[1].toLowerCase() : '';

  const formatConfig = SUPPORTED_EXTENSIONS[rawExt];
  if (!formatConfig) {
    throw new AppError(
      'UNSUPPORTED_FORMAT',
      `Unsupported file extension '.${rawExt}'. ClauseGuard supports .txt, .md, and .pdf agreements.`,
      415
    );
  }

  // Magic byte verification for PDF
  if (formatConfig.extension === 'pdf') {
    const header = buffer.subarray(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      throw new AppError(
        'INVALID_FILE_SIGNATURE',
        'File extension is .pdf but the binary header does not match a valid PDF document.',
        422
      );
    }
  }

  return {
    buffer,
    fileName: sanitizedName,
    extension: formatConfig.extension,
    format: formatConfig.format,
    sizeBytes: buffer.length,
  };
}

/**
 * Validates direct raw text input (e.g. pasted contract text).
 */
export function validateRawTextInput(text: string, documentName = 'Pasted_Agreement.txt'): ValidatedFileInput {
  if (!text || text.trim().length === 0) {
    throw new AppError('INPUT_EMPTY', 'Contract text input is empty.', 400);
  }

  const buffer = Buffer.from(text, 'utf-8');
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      'INPUT_TOO_LARGE',
      `Text payload (${(buffer.length / 1024).toFixed(1)} KB) exceeds maximum limit of 500 KB.`,
      413
    );
  }

  return {
    buffer,
    fileName: sanitizeFileName(documentName),
    extension: 'txt',
    format: 'text/plain',
    sizeBytes: buffer.length,
  };
}
