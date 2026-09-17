import { describe, it, expect } from 'vitest';
import { verifyQuoteAgainstClause, verifyFindings } from '@/lib/server/ai/quote-verifier';
import { Clause, StructuredDocument } from '@/types/domain';
import { RawGeminiFinding } from '@/lib/schemas/finding.schema';

describe('Source Quote Verifier', () => {
  const sampleClause: Clause = {
    clause_id: 'clause_002',
    document_id: 'doc_test',
    section_id: 'sec_002',
    text: 'Client shall remit payment within 30 days of invoice receipt. Late fees of 1.5% apply.',
    start_offset: 100,
    end_offset: 187,
    line_number: 5,
    page_number: 1,
    subclause_ids: [],
  };

  const mockDoc: StructuredDocument = {
    metadata: {
      document_id: 'doc_test',
      file_name: 'test.txt',
      file_size_bytes: 500,
      format: 'text/plain',
      extension: 'txt',
      created_at: new Date().toISOString(),
      sha256_hash: 'b'.repeat(64),
      page_count: 1,
      character_count: 500,
      word_count: 80,
    },
    canonical_text: sampleClause.text,
    pages: [{ page_number: 1, text: sampleClause.text, char_start_offset: 0, char_end_offset: sampleClause.text.length }],
    sections: [],
    clauses: [sampleClause],
    chunks: [],
    security_status: {
      passed: true,
      injection_patterns_detected: 0,
      flagged_tokens: [],
      pii_redacted_count: 0,
      sanitized: false,
    },
  };

  it('verifies exact verbatim substring (Tier 1)', () => {
    const quote = 'payment within 30 days of invoice receipt';
    const result = verifyQuoteAgainstClause(sampleClause, quote);

    expect(result.status).toBe('VERIFIED_EXACT');
    expect(result.matched_range).toBeDefined();
    expect(result.matched_range?.start).toBe(100 + sampleClause.text.indexOf(quote));
    expect(result.matched_range?.end).toBe(result.matched_range!.start + quote.length);
  });

  it('verifies normalized quotes with minor whitespace or curly quote differences (Tier 2)', () => {
    // Quote with extra whitespace and curly quotes
    const quote = 'payment   within   30 days  of invoice receipt';
    const result = verifyQuoteAgainstClause(sampleClause, quote);

    expect(result.status).toBe('VERIFIED_NORMALIZED');
    expect(result.matched_range).toBeDefined();
  });

  it('rejects a completely fabricated quote that does not appear in the clause', () => {
    const fakeQuote = 'Client may withhold payment indefinitely without explanation.';
    const result = verifyQuoteAgainstClause(sampleClause, fakeQuote);

    expect(result.status).toBe('UNVERIFIED_SOURCE_MISMATCH');
    expect(result.matched_range).toBeUndefined();
  });

  it('handles empty quote safely', () => {
    const result = verifyQuoteAgainstClause(sampleClause, '');
    expect(result.status).toBe('NO_QUOTE_PROVIDED');
  });

  it('verifies findings list and filters ungrounded findings into rejected_findings', () => {
    const rawFindings: RawGeminiFinding[] = [
      {
        finding_id: 'find_001',
        clause_id: 'clause_002',
        category: 'PAYMENT_TERMS',
        attention_level: 'LOW_ATTENTION',
        title: 'Payment Window',
        verbatim_quote: 'payment within 30 days of invoice receipt',
        plain_language_explanation: 'Standard 30-day payment term.',
        why_it_matters: 'Business timeline.',
        evidence: 'Direct statement.',
        suggested_question_for_counsel: 'Confirm net 30.',
      },
      {
        finding_id: 'find_002',
        clause_id: 'clause_999', // Hallucinated clause ID!
        category: 'INDEMNIFICATION',
        attention_level: 'HIGH_ATTENTION',
        title: 'Hallucinated Indemnity',
        verbatim_quote: 'Contractor assumes all risk.',
        plain_language_explanation: 'Fake finding.',
        why_it_matters: 'Severe.',
        evidence: 'Does not exist.',
        suggested_question_for_counsel: 'None.',
      },
      {
        finding_id: 'find_003',
        clause_id: 'clause_002',
        category: 'LIABILITY_LIMITS',
        attention_level: 'HIGH_ATTENTION',
        title: 'Fabricated Quote Finding',
        verbatim_quote: 'Contractor waives all legal remedies in federal court.', // Fabricated quote!
        plain_language_explanation: 'Fake quote.',
        why_it_matters: 'Dangerous.',
        evidence: 'Made up.',
        suggested_question_for_counsel: 'None.',
      },
    ];

    const result = verifyFindings(rawFindings, mockDoc, { rejectUnverified: true });

    expect(result.verified_findings).toHaveLength(1);
    expect(result.verified_findings[0].finding_id).toBe('find_001');
    expect(result.verified_findings[0].verification_status).toBe('VERIFIED_EXACT');

    expect(result.rejected_findings).toHaveLength(2);
    expect(result.rejected_findings[0].clause_id).toBe('clause_999'); // Hallucinated clause rejected
    expect(result.rejected_findings[1].finding_id).toBe('find_003'); // Fabricated quote rejected
    expect(result.rejected_count).toBe(2);
  });
});
