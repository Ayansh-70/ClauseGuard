import { describe, it, expect } from 'vitest';
import { verifyComparisonFindings } from '@/lib/server/ai/comparison-quote-verifier';
import { StructuredDocument } from '@/types/domain';
import { RawGeminiComparisonFinding } from '@/lib/schemas/comparison.schema';

describe('Dual-Source Comparison Quote Verifier', () => {
  const createMockDocument = (
    id: string,
    fileName: string,
    clauses: { id: string; text: string }[]
  ): StructuredDocument => ({
    metadata: {
      document_id: id,
      file_name: fileName,
      file_size_bytes: 500,
      format: 'text/plain',
      extension: 'txt',
      created_at: new Date().toISOString(),
      sha256_hash: 'a'.repeat(64),
      page_count: 1,
      character_count: 500,
      word_count: 70,
    },
    canonical_text: clauses.map((c) => c.text).join('\n\n'),
    pages: [{ page_number: 1, text: '...', char_start_offset: 0, char_end_offset: 500 }],
    sections: [],
    clauses: clauses.map((c, idx) => ({
      clause_id: c.id,
      document_id: id,
      text: c.text,
      start_offset: idx * 100,
      end_offset: idx * 100 + c.text.length,
      line_number: idx * 2 + 1,
      page_number: 1,
      subclause_ids: [],
    })),
    chunks: [],
    security_status: {
      passed: true,
      injection_patterns_detected: 0,
      flagged_tokens: [],
      pii_redacted_count: 0,
      sanitized: false,
    },
  });

  const docA = createMockDocument('doc_a_123', 'Baseline_Contract_A.txt', [
    {
      id: 'clause_a_001',
      text: 'Client shall pay all invoices within 30 days of receipt.',
    },
    {
      id: 'clause_a_002',
      text: 'Contractor liability under this Agreement shall be limited to fees paid.',
    },
    {
      id: 'clause_a_003',
      text: 'Contractor agrees not to solicit employees of Client for twelve months.',
    },
  ]);

  const docB = createMockDocument('doc_b_456', 'Revised_Contract_B.txt', [
    {
      id: 'clause_b_001',
      text: 'Client shall pay all invoices within 60 days of receipt.',
    },
    {
      id: 'clause_b_002',
      text: 'Contractor liability shall be uncapped for gross negligence or data breach.',
    },
    {
      id: 'clause_b_004',
      text: 'Client may conduct security audits of Contractor facilities at any time upon notice.',
    },
  ]);

  it('verifies findings with valid verbatim quotes for both Contract A and Contract B', () => {
    const rawFindings: RawGeminiComparisonFinding[] = [
      {
        id: 'comp_001',
        status: 'changed',
        category: 'payment',
        title: 'Payment Window Extended',
        plain_english_summary: 'Payment window was extended from 30 days to 60 days.',
        practical_implication: 'Delays cash receipt by an additional month.',
        attention_level: 'MEDIUM_ATTENTION',
        contract_a_clause_id: 'clause_a_001',
        contract_a_quote: 'Client shall pay all invoices within 30 days of receipt.',
        contract_b_clause_id: 'clause_b_001',
        contract_b_quote: 'Client shall pay all invoices within 60 days of receipt.',
        confidence: 0.98,
      },
    ];

    const result = verifyComparisonFindings(rawFindings, docA, docB);

    expect(result.verified_count).toBe(1);
    expect(result.rejected_count).toBe(0);
    expect(result.verified_findings[0].verification_status).toBe('VERIFIED_EXACT');
    expect(result.verified_findings[0].contract_a_source?.matched_range).toBeDefined();
    expect(result.verified_findings[0].contract_b_source?.matched_range).toBeDefined();
    expect(result.verified_findings[0].contract_a_source?.document_id).toBe('doc_a_123');
    expect(result.verified_findings[0].contract_b_source?.document_id).toBe('doc_b_456');
  });

  it('quarantines findings with fabricated quotes in either contract', () => {
    const rawFindings: RawGeminiComparisonFinding[] = [
      {
        id: 'comp_fake_a',
        status: 'changed',
        category: 'liability',
        title: 'Fabricated A Quote',
        plain_english_summary: 'Claims liability changed.',
        practical_implication: 'Risk of misrepresentation.',
        attention_level: 'HIGH_ATTENTION',
        contract_a_clause_id: 'clause_a_002',
        contract_a_quote: 'Contractor liability shall be completely waived at all times.', // Fabricated
        contract_b_clause_id: 'clause_b_002',
        contract_b_quote: 'Contractor liability shall be uncapped for gross negligence or data breach.',
      },
      {
        id: 'comp_fake_b',
        status: 'changed',
        category: 'liability',
        title: 'Fabricated B Quote',
        plain_english_summary: 'Claims liability changed.',
        practical_implication: 'Risk of misrepresentation.',
        attention_level: 'HIGH_ATTENTION',
        contract_a_clause_id: 'clause_a_002',
        contract_a_quote: 'Contractor liability under this Agreement shall be limited to fees paid.',
        contract_b_clause_id: 'clause_b_002',
        contract_b_quote: 'Contractor agrees to unlimited liability for all damages whatsoever.', // Fabricated
      },
    ];

    const result = verifyComparisonFindings(rawFindings, docA, docB);

    expect(result.verified_count).toBe(0);
    expect(result.rejected_count).toBe(2);
    expect(result.rejected_findings[0].verification_status).toBe('UNVERIFIED_SOURCE_MISMATCH');
    expect(result.rejected_findings[1].verification_status).toBe('UNVERIFIED_SOURCE_MISMATCH');
  });

  it('rejects cross-document quote confusion where Contract A quote actually belongs to Contract B', () => {
    const rawFindings: RawGeminiComparisonFinding[] = [
      {
        id: 'comp_cross_quote',
        status: 'changed',
        category: 'liability',
        title: 'Cross-Contaminated Quotes',
        plain_english_summary: 'AI swapped quotes between contracts.',
        practical_implication: 'False comparison.',
        attention_level: 'HIGH_ATTENTION',
        contract_a_clause_id: 'clause_a_002',
        // This quote is actually from Contract B clause_b_002, NOT Contract A!
        contract_a_quote: 'Contractor liability shall be uncapped for gross negligence or data breach.',
        contract_b_clause_id: 'clause_b_002',
        contract_b_quote: 'Contractor liability shall be uncapped for gross negligence or data breach.',
      },
    ];

    const result = verifyComparisonFindings(rawFindings, docA, docB);

    expect(result.verified_count).toBe(0);
    expect(result.rejected_count).toBe(1);
    expect(result.rejected_findings[0].verification_status).toBe('UNVERIFIED_SOURCE_MISMATCH');
    expect(result.rejected_findings[0].practical_implication).toContain('Cross-document quote mismatch');
  });

  it('rejects cross-document clause confusion where clause IDs are swapped between contracts', () => {
    const rawFindings: RawGeminiComparisonFinding[] = [
      {
        id: 'comp_cross_clause',
        status: 'changed',
        category: 'payment',
        title: 'Swapped Clause IDs',
        plain_english_summary: 'AI referenced Contract B clause as Contract A.',
        practical_implication: 'Wrong clause pointer.',
        attention_level: 'MEDIUM_ATTENTION',
        contract_a_clause_id: 'clause_b_001', // Belongs to Contract B, NOT A!
        contract_a_quote: 'Client shall pay all invoices within 30 days of receipt.',
        contract_b_clause_id: 'clause_a_001', // Belongs to Contract A, NOT B!
        contract_b_quote: 'Client shall pay all invoices within 60 days of receipt.',
      },
    ];

    const result = verifyComparisonFindings(rawFindings, docA, docB);

    expect(result.verified_count).toBe(0);
    expect(result.rejected_count).toBe(1);
    expect(result.rejected_findings[0].practical_implication).toContain('Cross-document error');
  });

  it('correctly handles asymmetric status: removed (Contract A only) and added (Contract B only)', () => {
    const rawFindings: RawGeminiComparisonFinding[] = [
      {
        id: 'comp_removed',
        status: 'removed',
        category: 'non_solicitation',
        title: 'Non-Solicitation Omitted',
        plain_english_summary: 'Non-solicitation obligation was deleted in Contract B.',
        practical_implication: 'Allows hiring of staff.',
        attention_level: 'HIGH_ATTENTION',
        contract_a_clause_id: 'clause_a_003',
        contract_a_quote: 'Contractor agrees not to solicit employees of Client for twelve months.',
      },
      {
        id: 'comp_added',
        status: 'added',
        category: 'obligations',
        title: 'Facility Audit Right Added',
        plain_english_summary: 'Contract B introduces new audit rights for Client.',
        practical_implication: 'Imposes new compliance inspection burdens.',
        attention_level: 'HIGH_ATTENTION',
        contract_b_clause_id: 'clause_b_004',
        contract_b_quote: 'Client may conduct security audits of Contractor facilities at any time upon notice.',
      },
    ];

    const result = verifyComparisonFindings(rawFindings, docA, docB);

    expect(result.verified_count).toBe(2);
    expect(result.rejected_count).toBe(0);

    const removedFinding = result.verified_findings.find((f) => f.id === 'comp_removed');
    expect(removedFinding?.verification_status).toBe('VERIFIED_EXACT');
    expect(removedFinding?.contract_a_source).toBeDefined();
    expect(removedFinding?.contract_b_source).toBeUndefined();

    const addedFinding = result.verified_findings.find((f) => f.id === 'comp_added');
    expect(addedFinding?.verification_status).toBe('VERIFIED_EXACT');
    expect(addedFinding?.contract_b_source).toBeDefined();
    expect(addedFinding?.contract_a_source).toBeUndefined();
  });

  it('retains unverified findings in verified list when rejectUnverified is false', () => {
    const rawFindings: RawGeminiComparisonFinding[] = [
      {
        id: 'comp_fake',
        status: 'changed',
        category: 'liability',
        title: 'Unverified Finding',
        plain_english_summary: 'Unverified difference.',
        practical_implication: 'Unverified risk.',
        attention_level: 'MEDIUM_ATTENTION',
        contract_a_clause_id: 'clause_a_001',
        contract_a_quote: 'Totally fake non-existent quote.',
        contract_b_clause_id: 'clause_b_001',
        contract_b_quote: 'Client shall pay all invoices within 60 days of receipt.',
      },
    ];

    const result = verifyComparisonFindings(rawFindings, docA, docB, {
      rejectUnverified: false,
    });

    expect(result.verified_findings.length).toBe(1);
    expect(result.rejected_findings.length).toBe(0);
    expect(result.unverified_count).toBe(1);
    expect(result.verified_findings[0].verification_status).toBe('UNVERIFIED_SOURCE_MISMATCH');
  });
});
