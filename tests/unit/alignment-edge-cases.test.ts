import { describe, it, expect } from 'vitest';
import { alignDocumentClauses } from '@/lib/domain/clause-aligner';
import { StructuredDocument } from '@/types/domain';

describe('Deterministic Clause Aligner Edge Cases', () => {
  const createDocument = (
    id: string,
    sections: { id: string; title: string }[],
    clauses: { id: string; section_id: string; number_label?: string; text: string; title?: string }[]
  ): StructuredDocument => ({
    metadata: {
      document_id: id,
      file_name: `${id}.txt`,
      file_size_bytes: 1000,
      format: 'text/plain',
      extension: 'txt',
      created_at: new Date().toISOString(),
      sha256_hash: 'c'.repeat(64),
      page_count: 1,
      character_count: 1000,
      word_count: 150,
    },
    canonical_text: clauses.map((c) => c.text).join('\n\n'),
    pages: [{ page_number: 1, text: '...', char_start_offset: 0, char_end_offset: 1000 }],
    sections: sections.map((s, idx) => ({
      section_id: s.id,
      title: s.title,
      raw_heading: s.title,
      level: 1,
      start_offset: idx * 100,
      end_offset: (idx + 1) * 100,
    })),
    clauses: clauses.map((c, idx) => ({
      clause_id: c.id,
      document_id: id,
      section_id: c.section_id,
      number_label: c.number_label,
      title: c.title,
      text: c.text,
      start_offset: idx * 100,
      end_offset: idx * 100 + c.text.length,
      line_number: idx * 2 + 1,
      page_number: 1,
      subclause_ids: [],
    })),
    chunks: [],
    security_status: { passed: true, injection_patterns_detected: 0, flagged_tokens: [], pii_redacted_count: 0, sanitized: false },
  });

  it('aligns clauses accurately despite numbering changes when section heading matches', () => {
    // Contract A: Section 3 is Indemnification with Clause 3.1
    // Contract B: Section 4 is Indemnity with Clause 4.1 (renumbered!)
    const docA = createDocument(
      'doc_a',
      [{ id: 'sec_a_03', title: 'SECTION 3. INDEMNIFICATION' }],
      [
        {
          id: 'clause_a_001',
          section_id: 'sec_a_03',
          number_label: '3.1',
          text: 'Contractor agrees to indemnify, defend, and hold harmless Client against third-party claims.',
        },
      ]
    );

    const docB = createDocument(
      'doc_b',
      [{ id: 'sec_b_04', title: 'SECTION 4. INDEMNITY' }],
      [
        {
          id: 'clause_b_001',
          section_id: 'sec_b_04',
          number_label: '4.1', // Renumbered
          text: 'Contractor agrees to indemnify, defend, and hold harmless Client against third-party claims.',
        },
      ]
    );

    const result = alignDocumentClauses(docA, docB);
    expect(result.aligned_count).toBe(1);
    expect(result.pairs[0].alignment_type).toBe('ALIGNED');
    expect(result.pairs[0].clause_a?.clause_id).toBe('clause_a_001');
    expect(result.pairs[0].clause_b?.clause_id).toBe('clause_b_001');
  });

  it('correctly handles split clauses (1 clause in A split into 2 clauses in B)', () => {
    // Contract A: Clause 4 contains both general liability cap and exclusion of consequential damages
    // Contract B: Split into 4.1 (Liability Cap) and 4.2 (Consequential Damages)
    const docA = createDocument(
      'doc_a',
      [{ id: 'sec_a_04', title: 'LIMITATION OF LIABILITY' }],
      [
        {
          id: 'clause_a_cap',
          section_id: 'sec_a_04',
          number_label: '4',
          text: 'Total liability shall not exceed fees paid in prior 12 months. In no event shall either party be liable for consequential damages.',
        },
      ]
    );

    const docB = createDocument(
      'doc_b',
      [{ id: 'sec_b_04', title: 'LIMITATION OF LIABILITY' }],
      [
        {
          id: 'clause_b_cap',
          section_id: 'sec_b_04',
          number_label: '4.1',
          text: 'Total aggregate liability arising out of this agreement shall not exceed fees paid in prior 12 months.',
        },
        {
          id: 'clause_b_conseq',
          section_id: 'sec_b_04',
          number_label: '4.2',
          text: 'In no event shall either party be liable for any indirect, special, incidental, or consequential damages.',
        },
      ]
    );

    const result = alignDocumentClauses(docA, docB);

    // Exactly one clause from B aligns with clause_a_cap; the other is classified as CONTRACT_B_ONLY
    expect(result.aligned_count).toBe(1);
    expect(result.b_only_count).toBe(1);
    expect(result.a_only_count).toBe(0);

    const alignedPair = result.pairs.find((p) => p.alignment_type === 'ALIGNED');
    expect(alignedPair?.clause_a?.clause_id).toBe('clause_a_cap');

    const bOnlyPair = result.pairs.find((p) => p.alignment_type === 'CONTRACT_B_ONLY');
    expect(bOnlyPair).toBeDefined();
    expect(bOnlyPair?.clause_b?.clause_id).toBeDefined();
  });

  it('correctly handles merged clauses (2 clauses in A merged into 1 clause in B)', () => {
    const docA = createDocument(
      'doc_a',
      [{ id: 'sec_a_01', title: 'CONFIDENTIALITY' }],
      [
        {
          id: 'clause_a_def',
          section_id: 'sec_a_01',
          number_label: '1.1',
          text: 'Confidential Information includes all non-public technical and financial data.',
        },
        {
          id: 'clause_a_excl',
          section_id: 'sec_a_01',
          number_label: '1.2',
          text: 'Confidential Information does not include data publicly known or independently developed.',
        },
      ]
    );

    const docB = createDocument(
      'doc_b',
      [{ id: 'sec_b_01', title: 'CONFIDENTIALITY' }],
      [
        {
          id: 'clause_b_merged',
          section_id: 'sec_b_01',
          number_label: '1',
          text: 'Confidential Information includes non-public data, but excludes publicly known information or independently developed materials.',
        },
      ]
    );

    const result = alignDocumentClauses(docA, docB);
    expect(result.aligned_count).toBe(1);
    expect(result.a_only_count).toBe(1);
    expect(result.b_only_count).toBe(0);

    const aOnlyPair = result.pairs.find((p) => p.alignment_type === 'CONTRACT_A_ONLY');
    expect(aOnlyPair).toBeDefined();
  });

  it('correctly matches identical boilerplate across multiple sections by section context', () => {
    // Both Section 2 and Section 8 have a notice clause: "Notices must be in writing"
    const docA = createDocument(
      'doc_a',
      [
        { id: 'sec_a_term', title: 'TERMINATION' },
        { id: 'sec_a_misc', title: 'MISCELLANEOUS' },
      ],
      [
        {
          id: 'clause_a_term_notice',
          section_id: 'sec_a_term',
          number_label: '2.3',
          text: 'Notice of termination must be in writing and delivered by certified mail.',
        },
        {
          id: 'clause_a_gen_notice',
          section_id: 'sec_a_misc',
          number_label: '8.1',
          text: 'All formal notices under this Agreement must be in writing and delivered by certified mail.',
        },
      ]
    );

    const docB = createDocument(
      'doc_b',
      [
        { id: 'sec_b_term', title: 'TERMINATION' },
        { id: 'sec_b_misc', title: 'MISCELLANEOUS' },
      ],
      [
        {
          id: 'clause_b_term_notice',
          section_id: 'sec_b_term',
          number_label: '2.3',
          text: 'Notice of termination must be in writing and delivered by certified mail.',
        },
        {
          id: 'clause_b_gen_notice',
          section_id: 'sec_b_misc',
          number_label: '8.1',
          text: 'All formal notices under this Agreement must be in writing and delivered by certified mail.',
        },
      ]
    );

    const result = alignDocumentClauses(docA, docB);
    expect(result.aligned_count).toBe(2);

    // Verify termination notices aligned with termination notices
    const termPair = result.pairs.find((p) => p.clause_a?.clause_id === 'clause_a_term_notice');
    expect(termPair?.clause_b?.clause_id).toBe('clause_b_term_notice');

    // Verify general notices aligned with general notices
    const miscPair = result.pairs.find((p) => p.clause_a?.clause_id === 'clause_a_gen_notice');
    expect(miscPair?.clause_b?.clause_id).toBe('clause_b_gen_notice');
  });

  it('categorizes substantially rewritten clauses below similarity threshold into A_ONLY and B_ONLY', () => {
    const docA = createDocument(
      'doc_a',
      [{ id: 'sec_a', title: 'INSURANCE' }],
      [
        {
          id: 'clause_a_ins',
          section_id: 'sec_a',
          text: 'Contractor shall maintain Commercial General Liability insurance of at least $1,000,000 per occurrence.',
        },
      ]
    );

    const docB = createDocument(
      'doc_b',
      [{ id: 'sec_b', title: 'ENVIRONMENTAL COMPLIANCE' }],
      [
        {
          id: 'clause_b_env',
          section_id: 'sec_b',
          text: 'Supplier shall adhere to ISO 14001 hazardous chemical disposal protocols and submit quarterly environmental compliance audits.',
        },
      ]
    );

    const result = alignDocumentClauses(docA, docB);
    expect(result.aligned_count).toBe(0);
    expect(result.a_only_count).toBe(1);
    expect(result.b_only_count).toBe(1);
  });
});
