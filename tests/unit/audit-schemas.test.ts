import { describe, it, expect } from 'vitest';
import {
  AuditResultSchema,
  FindingSchema,
  RawGeminiAuditOutputSchema,
  SeveritySchema,
} from '@/lib/schemas/finding.schema';

describe('Audit & Finding Schemas', () => {
  it('accepts a valid Finding object', () => {
    const validFinding = {
      finding_id: 'find_001',
      clause_id: 'clause_002',
      category: 'INDEMNIFICATION',
      attention_level: 'HIGH_ATTENTION',
      title: 'Uncapped Indemnification',
      verbatim_quote: 'Contractor agrees to indemnify Client.',
      plain_language_explanation: 'Contractor must pay legal costs for Client.',
      why_it_matters: 'Severe uncapped liability.',
      evidence: 'Clause 2 specifies indemnity.',
      suggested_question_for_counsel: 'Can we cap this at 1x contract fees?',
      verification_status: 'VERIFIED_EXACT',
      confidence: 0.9,
    };

    const result = FindingSchema.safeParse(validFinding);
    expect(result.success).toBe(true);
  });

  it('rejects invalid confidence values outside 0.0 - 1.0', () => {
    const invalidFinding = {
      finding_id: 'find_001',
      clause_id: 'clause_002',
      category: 'PAYMENT_TERMS',
      attention_level: 'MEDIUM_ATTENTION',
      title: 'Payment Term',
      verbatim_quote: 'Net-90 days.',
      plain_language_explanation: 'Payment is delayed.',
      why_it_matters: 'Cash flow delay.',
      evidence: 'Net 90 is stipulated.',
      suggested_question_for_counsel: 'Can we change to Net 30?',
      verification_status: 'VERIFIED_EXACT',
      confidence: 1.5, // Invalid: exceeds 1.0
    };

    const result = FindingSchema.safeParse(invalidFinding);
    expect(result.success).toBe(false);
  });

  it('validates severity levels', () => {
    expect(SeveritySchema.safeParse('low').success).toBe(true);
    expect(SeveritySchema.safeParse('medium').success).toBe(true);
    expect(SeveritySchema.safeParse('high').success).toBe(true);
    expect(SeveritySchema.safeParse('extreme_critical').success).toBe(false);
  });

  it('accepts a valid full AuditResult structure', () => {
    const auditResult = {
      document_id: 'doc_123',
      summary: 'Summary of agreement.',
      findings: [
        {
          finding_id: 'find_001',
          clause_id: 'clause_001',
          category: 'PAYMENT_TERMS',
          attention_level: 'LOW_ATTENTION',
          title: 'Standard Payment',
          verbatim_quote: 'Payment due Net-30.',
          plain_language_explanation: 'Payment within 30 days.',
          why_it_matters: 'Standard terms.',
          evidence: 'Clause 1.',
          suggested_question_for_counsel: 'None.',
          verification_status: 'VERIFIED_EXACT',
        },
      ],
      primary_concerns: ['None'],
      metadata: {
        audited_at: new Date().toISOString(),
        model_used: 'gemini-2.5-flash',
        duration_ms: 1200,
        total_clauses_analyzed: 5,
        total_findings_count: 1,
        verified_count: 1,
        unverified_count: 0,
        rejected_count: 0,
      },
    };

    const result = AuditResultSchema.safeParse(auditResult);
    expect(result.success).toBe(true);
  });

  it('validates raw Gemini output structure', () => {
    const rawOutput = {
      summary: 'Agreement review summary.',
      primary_concerns: ['Liability risk'],
      findings: [
        {
          finding_id: 'find_001',
          clause_id: 'clause_002',
          category: 'LIABILITY_LIMITS',
          attention_level: 'HIGH_ATTENTION',
          title: 'Unlimited Liability',
          verbatim_quote: 'Liability shall not be limited.',
          plain_language_explanation: 'No financial cap on damages.',
          why_it_matters: 'Extreme risk.',
          evidence: 'Direct statement in clause.',
          suggested_question_for_counsel: 'Can we add a mutual cap?',
        },
      ],
    };

    const result = RawGeminiAuditOutputSchema.safeParse(rawOutput);
    expect(result.success).toBe(true);
  });
});
