import { describe, it, expect } from 'vitest';
import { buildAuditContext } from '@/lib/server/ai/context-builder';
import { StructuredDocument } from '@/types/domain';
import { AppError } from '@/lib/errors/app-error';

describe('Audit Context Builder', () => {
  const mockDoc: StructuredDocument = {
    metadata: {
      document_id: 'doc_ctx_test',
      file_name: 'test_agreement.txt',
      file_size_bytes: 500,
      format: 'text/plain',
      extension: 'txt',
      created_at: new Date().toISOString(),
      sha256_hash: 'a'.repeat(64),
      page_count: 1,
      character_count: 200,
      word_count: 30,
    },
    canonical_text: '1. Term. One year.\n\n2. Payment. Net 30.',
    pages: [{ page_number: 1, text: '...', char_start_offset: 0, char_end_offset: 200 }],
    sections: [
      {
        section_id: 'sec_001',
        title: 'ARTICLE 1: TERM & PAYMENT',
        raw_heading: 'ARTICLE 1',
        level: 1,
        start_offset: 0,
        end_offset: 200,
      },
    ],
    clauses: [
      {
        clause_id: 'clause_001',
        document_id: 'doc_ctx_test',
        section_id: 'sec_001',
        number_label: '1.',
        title: '1. Term',
        text: '1. Term. This agreement shall last one year.',
        start_offset: 0,
        end_offset: 44,
        line_number: 1,
        page_number: 1,
        subclause_ids: [],
      },
      {
        clause_id: 'clause_002',
        document_id: 'doc_ctx_test',
        section_id: 'sec_001',
        number_label: '2.',
        title: '2. Payment',
        text: '2. Payment. Fees are due within 30 days of invoice.',
        start_offset: 46,
        end_offset: 97,
        line_number: 3,
        page_number: 1,
        subclause_ids: [],
      },
    ],
    chunks: [],
    security_status: {
      passed: true,
      injection_patterns_detected: 0,
      flagged_tokens: [],
      pii_redacted_count: 0,
      sanitized: false,
    },
  };

  it('builds clear context preserving clause IDs, sections, page numbers, and text', () => {
    const context = buildAuditContext(mockDoc);

    expect(context.document_id).toBe('doc_ctx_test');
    expect(context.file_name).toBe('test_agreement.txt');
    expect(context.total_clauses).toBe(2);

    expect(context.formatted_context).toContain('[Clause ID: clause_001');
    expect(context.formatted_context).toContain('ARTICLE 1: TERM & PAYMENT');
    expect(context.formatted_context).toContain('Page: 1');
    expect(context.formatted_context).toContain('1. Term. This agreement shall last one year.');
    expect(context.formatted_context).toContain('[Clause ID: clause_002');
  });

  it('throws an error if document has no clauses', () => {
    const emptyDoc = { ...mockDoc, clauses: [] };
    expect(() => buildAuditContext(emptyDoc)).toThrowError(AppError);
  });
});
