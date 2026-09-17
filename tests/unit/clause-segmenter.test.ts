import { describe, it, expect } from 'vitest';
import { segmentDocumentClauses } from '@/lib/domain/clause-segmenter';
import { detectDocumentSections } from '@/lib/domain/structure-detector';

describe('Clause Segmentation & Hierarchy', () => {
  it('segments numbered clauses and establishes parent-child relationships', () => {
    const text = [
      'SECTION 4. INDEMNITY',
      '',
      '4.1 Mutual Indemnity. Each party shall indemnify the other.',
      '',
      '4.2 Exceptions to Indemnity. Indemnity shall not apply to:',
      '',
      '(a) Claims arising from gross negligence or willful misconduct.',
      '',
      '(b) Claims settled without prior written consent.',
    ].join('\n');

    const pages = [{ page_number: 1, char_start_offset: 0, char_end_offset: text.length }];
    const sections = detectDocumentSections(text, pages);
    const clauses = segmentDocumentClauses('doc_test', text, sections, pages);

    expect(clauses.length).toBeGreaterThanOrEqual(4);

    const clause41 = clauses.find((c) => c.number_label === '4.1');
    const clause42 = clauses.find((c) => c.number_label === '4.2');
    const subclauseA = clauses.find((c) => c.number_label === '(a)');
    const subclauseB = clauses.find((c) => c.number_label === '(b)');

    expect(clause41).toBeDefined();
    expect(clause42).toBeDefined();
    expect(subclauseA).toBeDefined();
    expect(subclauseB).toBeDefined();

    // Verify subclause parent mapping
    expect(subclauseA?.parent_clause_id).toBe(clause42?.clause_id);
    expect(subclauseB?.parent_clause_id).toBe(clause42?.clause_id);
    expect(clause42?.subclause_ids).toContain(subclauseA?.clause_id);
    expect(clause42?.subclause_ids).toContain(subclauseB?.clause_id);
  });

  it('guarantees that clause offsets correspond exactly to the canonical text', () => {
    const text = [
      '1. Term. This agreement shall remain in effect for one year.',
      '',
      '2. Termination. Either party may terminate with 30 days notice.',
    ].join('\n');

    const pages = [{ page_number: 1, char_start_offset: 0, char_end_offset: text.length }];
    const sections = detectDocumentSections(text, pages);
    const clauses = segmentDocumentClauses('doc_offset_test', text, sections, pages);

    for (const clause of clauses) {
      const extractedSpan = text.slice(clause.start_offset, clause.end_offset);
      expect(extractedSpan).toBe(clause.text);
    }
  });
});
