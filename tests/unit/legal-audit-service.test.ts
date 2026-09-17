import { describe, it, expect } from 'vitest';
import { LegalAuditService } from '@/lib/server/ai/legal-audit-service';
import { MockGeminiProvider } from '@/lib/server/ai/gemini-provider';
import { StructuredDocument } from '@/types/domain';
import { AppError } from '@/lib/errors/app-error';

describe('Legal Audit Service & Provider Abstraction', () => {
  const sampleDoc: StructuredDocument = {
    metadata: {
      document_id: 'doc_audit_service_test',
      file_name: 'consulting_agreement.txt',
      file_size_bytes: 400,
      format: 'text/plain',
      extension: 'txt',
      created_at: new Date().toISOString(),
      sha256_hash: 'c'.repeat(64),
      page_count: 1,
      character_count: 200,
      word_count: 30,
    },
    canonical_text:
      'Clause 001. Services.\n\nClause 002. Contractor agrees to defend and indemnify Client against third-party claims.',
    pages: [{ page_number: 1, text: '...', char_start_offset: 0, char_end_offset: 200 }],
    sections: [],
    clauses: [
      {
        clause_id: 'clause_001',
        document_id: 'doc_audit_service_test',
        text: 'Clause 001. Services.',
        start_offset: 0,
        end_offset: 21,
        line_number: 1,
        page_number: 1,
        subclause_ids: [],
      },
      {
        clause_id: 'clause_002',
        document_id: 'doc_audit_service_test',
        text: 'Clause 002. Contractor agrees to defend and indemnify Client against third-party claims.',
        start_offset: 23,
        end_offset: 111,
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

  it('runs grounded audit and returns trusted AuditResult with metadata', async () => {
    const mockProvider = new MockGeminiProvider();
    const service = new LegalAuditService(mockProvider);

    const result = await service.auditDocument(sampleDoc);

    expect(result.document_id).toBe('doc_audit_service_test');
    expect(result.summary).toBeDefined();
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].clause_id).toBe('clause_002');
    expect(result.findings[0].verification_status).toBe('VERIFIED_EXACT');
    expect(result.metadata.verified_count).toBe(1);
    expect(result.metadata.rejected_count).toBe(0);
    expect(result.metadata.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('filters out hallucinated clauses so they do not enter trusted findings', async () => {
    const mockProvider = new MockGeminiProvider({
      mockResponse: {
        summary: 'Mock summary',
        primary_concerns: ['Fake clause issue'],
        findings: [
          {
            finding_id: 'find_hallucinated',
            clause_id: 'clause_nonexistent', // Does not exist in doc!
            category: 'LIABILITY_LIMITS',
            attention_level: 'HIGH_ATTENTION',
            title: 'Fake Liability',
            verbatim_quote: 'Some quote',
            plain_language_explanation: 'Fake',
            why_it_matters: 'Fake',
            evidence: 'Fake',
            suggested_question_for_counsel: 'Fake',
          },
        ],
      },
    });

    const service = new LegalAuditService(mockProvider);
    const result = await service.auditDocument(sampleDoc);

    expect(result.findings).toHaveLength(0); // Excluded from trusted findings!
    expect(result.rejected_findings).toHaveLength(1);
    expect(result.metadata.rejected_count).toBe(1);
  });

  it('handles provider timeout safely', async () => {
    const mockProvider = new MockGeminiProvider({ shouldTimeout: true });
    const service = new LegalAuditService(mockProvider);

    await expect(service.auditDocument(sampleDoc)).rejects.toThrowError(AppError);
    try {
      await service.auditDocument(sampleDoc);
    } catch (err) {
      expect((err as AppError).code).toBe('AI_TIMEOUT');
      expect((err as AppError).statusCode).toBe(504);
    }
  });

  it('handles provider error safely', async () => {
    const mockProvider = new MockGeminiProvider({ shouldFail: true, errorMessage: 'API Quota Exceeded' });
    const service = new LegalAuditService(mockProvider);

    await expect(service.auditDocument(sampleDoc)).rejects.toThrowError(AppError);
    try {
      await service.auditDocument(sampleDoc);
    } catch (err) {
      expect((err as AppError).code).toBe('AI_PROVIDER_ERROR');
      expect((err as AppError).statusCode).toBe(502);
    }
  });
});
