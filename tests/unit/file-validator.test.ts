import { describe, it, expect } from 'vitest';
import { validateFile, validateRawTextInput, sanitizeFileName } from '@/lib/domain/file-validator';
import { AppError } from '@/lib/errors/app-error';

describe('File Validator & Ingestion Guards', () => {
  it('accepts a valid plain text file', () => {
    const buffer = Buffer.from('ARTICLE 1: SERVICES\nContractor shall perform services.', 'utf-8');
    const result = validateFile('consulting_agreement.txt', buffer);

    expect(result.fileName).toBe('consulting_agreement.txt');
    expect(result.extension).toBe('txt');
    expect(result.format).toBe('text/plain');
    expect(result.sizeBytes).toBe(buffer.length);
  });

  it('accepts a valid markdown file', () => {
    const buffer = Buffer.from('# Independent Contractor Agreement\n\n## 1. Term', 'utf-8');
    const result = validateFile('contract.md', buffer);

    expect(result.extension).toBe('md');
    expect(result.format).toBe('text/markdown');
  });

  it('accepts a valid PDF file with proper magic bytes', () => {
    const buffer = Buffer.from('%PDF-1.4 header and mock content for testing', 'utf-8');
    const result = validateFile('contract.pdf', buffer);

    expect(result.extension).toBe('pdf');
    expect(result.format).toBe('application/pdf');
  });

  it('rejects an empty file with INPUT_EMPTY error', () => {
    const empty = Buffer.alloc(0);
    expect(() => validateFile('empty.txt', empty)).toThrowError(AppError);
    try {
      validateFile('empty.txt', empty);
    } catch (err) {
      expect((err as AppError).code).toBe('INPUT_EMPTY');
    }
  });

  it('rejects oversized files exceeding 500 KB', () => {
    const oversized = Buffer.alloc(501 * 1024); // 501 KB
    expect(() => validateFile('huge.txt', oversized)).toThrowError(AppError);
    try {
      validateFile('huge.txt', oversized);
    } catch (err) {
      expect((err as AppError).code).toBe('INPUT_TOO_LARGE');
    }
  });

  it('rejects unsupported extensions like .exe or .docx', () => {
    const buffer = Buffer.from('Some text', 'utf-8');
    expect(() => validateFile('contract.docx', buffer)).toThrowError(AppError);
    try {
      validateFile('contract.docx', buffer);
    } catch (err) {
      expect((err as AppError).code).toBe('UNSUPPORTED_FORMAT');
    }
  });

  it('rejects PDF file when magic bytes are invalid', () => {
    const fakePdf = Buffer.from('NOT_A_PDF_FILE_HEADER', 'utf-8');
    expect(() => validateFile('corrupt.pdf', fakePdf)).toThrowError(AppError);
    try {
      validateFile('corrupt.pdf', fakePdf);
    } catch (err) {
      expect((err as AppError).code).toBe('INVALID_FILE_SIGNATURE');
    }
  });

  it('sanitizes dangerous path traversal characters in filenames', () => {
    const clean = sanitizeFileName('../../../etc/passwd');
    expect(clean).toBe('passwd');
    expect(clean).not.toContain('..');
    expect(clean).not.toContain('/');

    const windowsPath = sanitizeFileName('C:\\Windows\\System32\\contract.txt');
    expect(windowsPath).toBe('contract.txt');
  });

  it('validates raw pasted text input', () => {
    const valid = validateRawTextInput('This is a pasted legal agreement.');
    expect(valid.format).toBe('text/plain');
    expect(valid.sizeBytes).toBeGreaterThan(10);
  });
});
