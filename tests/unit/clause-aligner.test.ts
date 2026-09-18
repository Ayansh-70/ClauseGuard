import { describe, it, expect } from 'vitest';
import { alignDocumentClauses } from '@/lib/domain/clause-aligner';
import { ingestRawText } from '@/lib/domain/ingestion-pipeline';

describe('Deterministic Clause Aligner', () => {
  it('aligns clauses with identical clause numbers and matching section titles', async () => {
    const textA = [
      'SECTION 1. SERVICES',
      '',
      '1.1 Scope of Work. Consultant shall provide engineering services.',
      '',
      'SECTION 2. PAYMENT',
      '',
      '2.1 Invoicing. Client shall pay invoices within 30 days.',
    ].join('\n');

    const textB = [
      'SECTION 1. SERVICES',
      '',
      '1.1 Scope of Work. Consultant will perform software engineering tasks.',
      '',
      'SECTION 2. PAYMENT',
      '',
      '2.1 Invoicing. Client shall pay all approved invoices within 60 days.',
    ].join('\n');

    const docA = await ingestRawText(textA, 'Contract_A.txt');
    const docB = await ingestRawText(textB, 'Contract_B.txt');

    const result = alignDocumentClauses(docA, docB);

    // 2 sections + 2 numbered clauses = 4 blocks all aligned
    expect(result.aligned_count).toBe(4);
    expect(result.a_only_count).toBe(0);
    expect(result.b_only_count).toBe(0);

    const pair1 = result.pairs.find(
      (p) => p.clause_a?.number_label === '1.1' && p.clause_b?.number_label === '1.1'
    );
    expect(pair1).toBeDefined();
    expect(pair1?.alignment_type).toBe('ALIGNED');
    expect(pair1?.similarity_score).toBeGreaterThan(0.4);

    const pair2 = result.pairs.find(
      (p) => p.clause_a?.number_label === '2.1' && p.clause_b?.number_label === '2.1'
    );
    expect(pair2).toBeDefined();
    expect(pair2?.alignment_type).toBe('ALIGNED');
  });

  it('aligns clauses across reordered sections and differing numbering based on content similarity', async () => {
    const textA = [
      'SECTION 1. INDEMNIFICATION',
      '',
      '1.1 Contractor shall defend and hold harmless Client against third-party claims.',
      '',
      'SECTION 2. GOVERNING LAW',
      '',
      '2.1 This agreement is governed by the laws of California.',
    ].join('\n');

    // Sections reordered and numbered differently in Contract B
    const textB = [
      'ARTICLE 1. GOVERNING LAW AND JURISDICTION',
      '',
      '1.0 This agreement and all disputes shall be governed by California law.',
      '',
      'ARTICLE 2. INDEMNITY OBLIGATIONS',
      '',
      '2.0 Contractor agrees to defend, indemnify, and hold harmless Client against claims.',
    ].join('\n');

    const docA = await ingestRawText(textA, 'Contract_A.txt');
    const docB = await ingestRawText(textB, 'Contract_B.txt');

    const result = alignDocumentClauses(docA, docB);

    // All 4 blocks aligned across reordering
    expect(result.aligned_count).toBe(4);

    // Indemnification in A (1.1) aligns with Indemnity in B (2.0)
    const indemnityPair = result.pairs.find(
      (p) => p.clause_a?.number_label === '1.1' && p.clause_b?.number_label === '2.0'
    );
    expect(indemnityPair).toBeDefined();
    expect(indemnityPair?.alignment_type).toBe('ALIGNED');

    // Governing Law in A (2.1) aligns with Governing Law in B (1.0)
    const lawPair = result.pairs.find(
      (p) => p.clause_a?.number_label === '2.1' && p.clause_b?.number_label === '1.0'
    );
    expect(lawPair).toBeDefined();
    expect(lawPair?.alignment_type).toBe('ALIGNED');
  });

  it('correctly identifies unmatched provisions as CONTRACT_A_ONLY and CONTRACT_B_ONLY', async () => {
    const textA = [
      'SECTION 1. CONFIDENTIALITY',
      '',
      '1.1 Recipient shall maintain strict confidentiality for 5 years.',
      '',
      'SECTION 2. NON-COMPETE',
      '',
      '2.1 Contractor shall not engage in competing businesses for 12 months.',
    ].join('\n');

    const textB = [
      'SECTION 1. CONFIDENTIALITY',
      '',
      '1.1 Recipient shall protect confidential proprietary information.',
      '',
      'SECTION 2. AUDIT RIGHTS',
      '',
      '2.1 Client reserves the right to audit Contractor financial records annually.',
    ].join('\n');

    const docA = await ingestRawText(textA, 'DocA.txt');
    const docB = await ingestRawText(textB, 'DocB.txt');

    const result = alignDocumentClauses(docA, docB);

    // Confidentiality section + 1.1 clause aligned (2)
    expect(result.aligned_count).toBe(2);

    // Non-compete section + 2.1 clause only in A (2)
    expect(result.a_only_count).toBe(2);
    const aOnlyClause = result.pairs.find(
      (p) => p.alignment_type === 'CONTRACT_A_ONLY' && p.clause_a?.number_label === '2.1'
    );
    expect(aOnlyClause).toBeDefined();
    expect(aOnlyClause?.clause_a?.text).toContain('competing businesses');

    // Audit rights section + 2.1 clause only in B (2)
    expect(result.b_only_count).toBe(2);
    const bOnlyClause = result.pairs.find(
      (p) => p.alignment_type === 'CONTRACT_B_ONLY' && p.clause_b?.number_label === '2.1'
    );
    expect(bOnlyClause).toBeDefined();
    expect(bOnlyClause?.clause_b?.text).toContain('audit Contractor financial records');
  });
});
