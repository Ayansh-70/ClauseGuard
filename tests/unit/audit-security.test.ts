import { describe, it, expect } from 'vitest';
import { LegalAuditService } from '@/lib/server/ai/legal-audit-service';
import { MockGeminiProvider } from '@/lib/server/ai/gemini-provider';
import { StructuredDocument } from '@/types/domain';
import { AppError } from '@/lib/errors/app-error';

describe('Audit Security & Privacy Controls', () => {
  const sampleDoc: StructuredDocument = {
    metadata: {
      document_id: 'doc_sec_test',
      file_name: 'sensitive_agreement.txt',
      file_size_bytes: 300,
      format: 'text/plain',
      extension: 'txt',
      created_at: new Date().toISOString(),
      sha256_hash: 'd'.repeat(64),
      page_count: 1,
      character_count: 150,
      word_count: 20,
    },
    canonical_text: 'Clause 001. Confidential terms.',
    pages: [{ page_number: 1, text: '...', char_start_offset: 0, char_end_offset: 150 }],
    sections: [],
    clauses: [
      {
        clause_id: 'clause_001',
        document_id: 'doc_sec_test',
        text: 'Clause 001. Confidential terms.',
        start_offset: 0,
        end_offset: 32,
        line_number: 1,
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

  it('guarantees that API keys never appear in returned AuditResult', async () => {
    const mockProvider = new MockGeminiProvider();
    const service = new LegalAuditService(mockProvider);

    const result = await service.auditDocument(sampleDoc);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('AIza');
    expect(serialized).not.toContain('GEMINI_API_KEY');
    expect(serialized).not.toContain('sk-');
  });

  it('ensures provider errors do not leak secret environment values to client responses', () => {
    const secretError = new AppError(
      'AI_PROVIDER_ERROR',
      'API failed with key AIzaSyFakeSecretKey12345',
      502,
      false // internal non-public
    );

    const publicResponse = secretError.toPublicResponse();
    expect(publicResponse.error.message).toBe('An internal processing error occurred.');
    expect(JSON.stringify(publicResponse)).not.toContain('AIzaSyFakeSecretKey12345');
  });
});
