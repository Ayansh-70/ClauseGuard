import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveEvidence,
  normalizeQuotesAndWhitespace,
} from '@/lib/domain/evidence-resolver';
import { reportStore } from '@/lib/server/report-store';
import { AuditResult, ComparisonResult, StructuredDocument } from '@/types/domain';

describe('Phase 11: Evidence Integrity & Reliability Hardening', () => {
  beforeEach(() => {
    reportStore.clear();
  });

  // =========================================================================
  // 1. Evidence Resolver: Offset Bounds & Pathological Offsets
  // =========================================================================
  describe('Offset Bounds & Pathological Inputs', () => {
    const clauseText = 'The quick brown fox jumps over the lazy dog.';

    it('gracefully handles NaN, Infinity, and negative offsets by falling back to indexOf', () => {
      // Offset with NaN
      const resNaN = resolveEvidence({
        clauseText,
        quote: 'brown fox',
        matchedRange: { start: NaN as unknown as number, end: 15 },
      });
      expect(resNaN.isResolved).toBe(true);
      expect(resNaN.status).toBe('EXACT_QUOTE');
      expect(resNaN.highlightText).toBe('brown fox');

      // Offset with Infinity
      const resInf = resolveEvidence({
        clauseText,
        quote: 'brown fox',
        matchedRange: { start: 10, end: Infinity as unknown as number },
      });
      expect(resInf.isResolved).toBe(true);
      expect(resInf.status).toBe('EXACT_QUOTE');

      // Negative offset
      const resNeg = resolveEvidence({
        clauseText,
        quote: 'brown fox',
        matchedRange: { start: -5, end: 5 },
      });
      expect(resNeg.isResolved).toBe(true);
      expect(resNeg.status).toBe('EXACT_QUOTE');

      // Inverted offset: start > end
      const resInv = resolveEvidence({
        clauseText,
        quote: 'brown fox',
        matchedRange: { start: 20, end: 10 },
      });
      expect(resInv.isResolved).toBe(true);
      expect(resInv.status).toBe('EXACT_QUOTE');

      // Non-integer float offset
      const resFloat = resolveEvidence({
        clauseText,
        quote: 'brown fox',
        matchedRange: { start: 10.5, end: 19.5 },
      });
      expect(resFloat.isResolved).toBe(true);
      expect(resFloat.status).toBe('EXACT_QUOTE');
    });

    it('rejects offset if offset text does not match the quote, and falls back safely', () => {
      // Offset 0..5 is "The q", but quote is "brown fox"
      const result = resolveEvidence({
        clauseText,
        quote: 'brown fox',
        matchedRange: { start: 0, end: 5 },
      });
      expect(result.isResolved).toBe(true);
      // Offset was rejected, but exact substring matched via Tier 2
      expect(result.status).toBe('EXACT_QUOTE');
      expect(result.highlightText).toBe('brown fox');
    });

    it('safely handles non-integer clauseStartOffset', () => {
      const result = resolveEvidence({
        clauseText,
        quote: 'brown fox',
        matchedRange: { start: 10, end: 19 },
        clauseStartOffset: NaN,
      });
      expect(result.isResolved).toBe(true);
      // Ignores NaN clauseStartOffset, falls back to direct local offset matching
      expect(result.status).toBe('EXACT_OFFSET');
      expect(result.highlightText).toBe('brown fox');
    });

    it('handles completely null, undefined, or malformed options without throwing', () => {
      // @ts-expect-error Testing runtime resilience on null input
      const resNull = resolveEvidence(null);
      expect(resNull.isResolved).toBe(false);
      expect(resNull.status).toBe('UNRESOLVED');

      // @ts-expect-error Testing empty object
      const resEmpty = resolveEvidence({});
      expect(resEmpty.isResolved).toBe(false);

      const resWhitespace = resolveEvidence({ clauseText: '   ', quote: 'test' });
      expect(resWhitespace.isResolved).toBe(false);

      const resNoQuote = resolveEvidence({ clauseText: 'Sample text', quote: '   ' });
      expect(resNoQuote.isResolved).toBe(false);
    });
  });

  // =========================================================================
  // 2. Ambiguity Detection (Duplicate Quotes in a Clause)
  // =========================================================================
  describe('Ambiguity Detection (Duplicate Quotes)', () => {
    it('flags ambiguity when a quote appears multiple times in the clause', () => {
      const clauseText =
        'Company may terminate for convenience upon 30 days notice. Either party may terminate for convenience upon material breach.';
      const quote = 'terminate for convenience';

      const result = resolveEvidence({
        clauseText,
        quote,
      });

      expect(result.isResolved).toBe(true);
      expect(result.status).toBe('EXACT_QUOTE');
      expect(result.highlightText).toBe(quote);
      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguityNotice).toContain('multiple times');
    });

    it('does not flag ambiguity when quote is unique in the clause', () => {
      const clauseText =
        'Company may terminate for convenience upon 30 days notice. All disputes governed by Delaware law.';
      const quote = 'Delaware law';

      const result = resolveEvidence({
        clauseText,
        quote,
      });

      expect(result.isResolved).toBe(true);
      expect(result.isAmbiguous).toBe(false);
      expect(result.ambiguityNotice).toBeUndefined();
    });

    it('flags ambiguity during normalized Tier 3 matching when normalized pattern matches multiple times', () => {
      const clauseText =
        'Section A — Fee: $5,000.\nSection B — Fee:  $5,000.';
      const quote = 'Fee: $5,000.';

      const result = resolveEvidence({
        clauseText,
        quote,
      });

      expect(result.isResolved).toBe(true);
      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguityNotice).toBeDefined();
    });
  });

  // =========================================================================
  // 3. Dash, Punctuation & Unicode Normalization
  // =========================================================================
  describe('Dash & Unicode Normalization', () => {
    it('normalizes em-dashes, en-dashes, and hyphens interchangeably', () => {
      const clauseWithEmDash = 'Limitation of Liability — Total aggregate liability shall not exceed $10,000.';
      const quoteWithHyphen = 'Limitation of Liability - Total aggregate liability';

      const result = resolveEvidence({
        clauseText: clauseWithEmDash,
        quote: quoteWithHyphen,
      });

      expect(result.isResolved).toBe(true);
      expect(result.status).toBe('NORMALIZED_MATCH');
      expect(result.highlightText).toBe('Limitation of Liability — Total aggregate liability');
    });

    it('normalizes en-dashes and minus signs', () => {
      const clauseWithEnDash = 'Confidentiality Period: 2024–2027.';
      const quoteWithHyphen = '2024-2027';

      const result = resolveEvidence({
        clauseText: clauseWithEnDash,
        quote: quoteWithHyphen,
      });

      expect(result.isResolved).toBe(true);
      expect(result.status).toBe('NORMALIZED_MATCH');
      expect(result.highlightText).toBe('2024–2027');
    });

    it('normalizeQuotesAndWhitespace safely handles non-string inputs', () => {
      // @ts-expect-error Testing non-string input
      expect(normalizeQuotesAndWhitespace(null)).toBe('');
      // @ts-expect-error Testing undefined input
      expect(normalizeQuotesAndWhitespace(undefined)).toBe('');
      // @ts-expect-error Testing number input
      expect(normalizeQuotesAndWhitespace(12345)).toBe('');
    });
  });

  // =========================================================================
  // 4. Protection Against Massive Quotes & Pathological Inputs
  // =========================================================================
  describe('Pathological & Long Quote Protection', () => {
    it('safely handles excessively long quotes (>5,000 chars) without ReDoS or memory crash', () => {
      const longClause = 'Alpha '.repeat(2000);
      const massiveQuote = 'Beta '.repeat(1500); // 7500 chars

      const result = resolveEvidence({
        clauseText: longClause,
        quote: massiveQuote,
      });

      expect(result.isResolved).toBe(false);
      expect(result.status).toBe('UNRESOLVED');
    });

    it('safely handles quotes with > 200 tokens by falling back to indexOf without regex compilation', () => {
      const words = Array.from({ length: 250 }, (_, i) => `word${i}`).join(' ');
      const clauseText = `Header ${words} Footer`;

      const result = resolveEvidence({
        clauseText,
        quote: words,
      });

      expect(result.isResolved).toBe(true);
      expect(result.status).toBe('EXACT_QUOTE');
    });
  });

  // =========================================================================
  // 5. ReportStore Eviction Integrity Under Repeated Writes
  // =========================================================================
  describe('ReportStore Eviction Integrity', () => {
    const createMockDoc = (id: string): StructuredDocument => ({
      canonical_text: 'Section 1. Confidentiality. Both parties agree to protect secret info.',
      metadata: {
        document_id: id,
        file_name: `${id}.txt`,
        file_size_bytes: 100,
        format: 'text/plain',
        extension: 'txt',
        created_at: '2026-09-19T00:00:00Z',
        sha256_hash: 'hash',
        page_count: 1,
        character_count: 100,
        word_count: 20,
      },
      pages: [],
      sections: [
        {
          section_id: 'sec_1',
          title: 'Confidentiality',
          raw_heading: 'Confidentiality',
          level: 1,
          start_offset: 0,
          end_offset: 68,
        },
      ],
      clauses: [
        {
          clause_id: `${id}_cl_1`,
          document_id: id,
          number_label: '1.1',
          title: 'Protection of Info',
          text: 'Both parties agree to protect secret info.',
          start_offset: 28,
          end_offset: 68,
          line_number: 1,
          subclause_ids: [],
        },
      ],
      chunks: [],
      security_status: {
        passed: true,
        injection_patterns_detected: 0,
        flagged_tokens: [],
        pii_redacted_count: 0,
        sanitized: true,
      },
    });

    it('does not evict earlier entries when repeatedly updating an existing key at capacity', () => {
      // Populate 100 documents (doc_0 to doc_99)
      for (let i = 0; i < 100; i++) {
        reportStore.saveDocument(createMockDoc(`doc_${i}`));
      }

      // Verify doc_0 and doc_1 are present
      expect(reportStore.getDocument('doc_0')).not.toBeNull();
      expect(reportStore.getDocument('doc_1')).not.toBeNull();

      // Repeatedly update doc_0 (an existing key) 10 times
      for (let k = 0; k < 10; k++) {
        reportStore.saveDocument(createMockDoc('doc_0'));
      }

      // In the old bug, updating doc_0 would evict the oldest key (doc_1, doc_2, etc.)!
      // Verify doc_1 is STILL present in the cache
      expect(reportStore.getDocument('doc_1')).not.toBeNull();
      expect(reportStore.getDocument('doc_0')).not.toBeNull();

      // Now adding a genuinely NEW key (doc_100) should evict the oldest unaccessed key (doc_2)
      reportStore.saveDocument(createMockDoc('doc_100'));
      expect(reportStore.getDocument('doc_100')).not.toBeNull();
      // doc_2 was the least recently accessed/updated and is now evicted
      expect(reportStore.getDocument('doc_2')).toBeNull();
      // doc_0 and doc_1 remain safely cached
      expect(reportStore.getDocument('doc_0')).not.toBeNull();
      expect(reportStore.getDocument('doc_1')).not.toBeNull();
    });

    it('retrieves clause context using clause_id or number_label fallback', () => {
      const doc = createMockDoc('doc_lookup');
      reportStore.saveDocument(doc);

      // Lookup via clause_id
      const byClauseId = reportStore.getClauseContext('doc_lookup', 'doc_lookup_cl_1');
      expect(byClauseId).not.toBeNull();
      expect(byClauseId?.clause.text).toBe('Both parties agree to protect secret info.');

      // Lookup via number_label fallback ('1.1')
      const byNumberLabel = reportStore.getClauseContext('doc_lookup', '1.1');
      expect(byNumberLabel).not.toBeNull();
      expect(byNumberLabel?.clause.clause_id).toBe('doc_lookup_cl_1');
    });

    it('strictly isolates cross-document queries (doc A clause id on doc B returns null)', () => {
      reportStore.saveDocument(createMockDoc('doc_A'));
      reportStore.saveDocument(createMockDoc('doc_B'));

      // Look for doc_A's clause in doc_B -> must return null
      const crossLookup = reportStore.getClauseContext('doc_B', 'doc_A_cl_1');
      expect(crossLookup).toBeNull();
    });
  });
});
