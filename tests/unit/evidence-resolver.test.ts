import { describe, it, expect } from 'vitest';
import {
  resolveEvidence,
  normalizeQuotesAndWhitespace,
} from '@/lib/domain/evidence-resolver';

describe('Evidence Resolver (Deterministic Pure Domain Engine)', () => {
  const sampleClauseText =
    'Section 4.1 Payment Terms. Client shall pay Contractor the sum of $50,000 within thirty (30) days of receipt of invoice. Late payments shall incur 1.5% interest per month.';

  it('Tier 1: resolves exact offset match when valid matched_range is provided', () => {
    // Offset for "$50,000" in sampleClauseText is 66..73
    const start = sampleClauseText.indexOf('$50,000');
    const end = start + '$50,000'.length;

    const result = resolveEvidence({
      clauseText: sampleClauseText,
      quote: '$50,000',
      matchedRange: { start, end },
      clauseStartOffset: 0,
    });

    expect(result.isResolved).toBe(true);
    expect(result.status).toBe('EXACT_OFFSET');
    expect(result.highlightText).toBe('$50,000');
    expect(result.beforeText).toBe(sampleClauseText.slice(0, start));
    expect(result.afterText).toBe(sampleClauseText.slice(end));
  });

  it('Tier 1: resolves canonical document offset using clauseStartOffset offset math', () => {
    const clauseStart = 1000;
    const quote = 'Late payments shall incur 1.5% interest';
    const localStart = sampleClauseText.indexOf(quote);
    const localEnd = localStart + quote.length;

    const canonicalStart = clauseStart + localStart;
    const canonicalEnd = clauseStart + localEnd;

    const result = resolveEvidence({
      clauseText: sampleClauseText,
      quote,
      matchedRange: { start: canonicalStart, end: canonicalEnd },
      clauseStartOffset: clauseStart,
    });

    expect(result.isResolved).toBe(true);
    expect(result.status).toBe('EXACT_OFFSET');
    expect(result.highlightText).toBe(quote);
    expect(result.beforeText).toBe(sampleClauseText.slice(0, localStart));
    expect(result.afterText).toBe(sampleClauseText.slice(localEnd));
  });

  it('Tier 2: resolves exact substring match via indexOf when no offsets provided', () => {
    const quote = 'thirty (30) days of receipt of invoice';

    const result = resolveEvidence({
      clauseText: sampleClauseText,
      quote,
    });

    expect(result.isResolved).toBe(true);
    expect(result.status).toBe('EXACT_QUOTE');
    expect(result.highlightText).toBe(quote);
    expect(sampleClauseText).toBe(result.beforeText + result.highlightText + result.afterText);
  });

  it('Tier 3: resolves safe normalized match across irregular whitespace and line breaks', () => {
    const multilineClause =
      'Contractor agrees to maintain  confidentiality\n\nof all proprietary  information.';
    const normalizedQuote = 'Contractor agrees to maintain confidentiality of all proprietary information.';

    const result = resolveEvidence({
      clauseText: multilineClause,
      quote: normalizedQuote,
    });

    expect(result.isResolved).toBe(true);
    expect(result.status).toBe('NORMALIZED_MATCH');
    // Verbatim text from clause is preserved in highlight
    expect(result.highlightText).toBe(
      'Contractor agrees to maintain  confidentiality\n\nof all proprietary  information.'
    );
  });

  it('Tier 3: resolves smart curly quotes to straight quotes and vice versa', () => {
    const textWithCurly = 'The definition of \u201CConfidential Information\u201D shall include source code.';
    const quoteWithStraight = '"Confidential Information"';

    const result = resolveEvidence({
      clauseText: textWithCurly,
      quote: quoteWithStraight,
    });

    expect(result.isResolved).toBe(true);
    expect(result.status).toBe('NORMALIZED_MATCH');
    expect(result.highlightText).toBe('\u201CConfidential Information\u201D');
  });

  it('Tier 3: safely handles regex special characters in quotes ($ and parenthesis)', () => {
    const quote = 'sum of $50,000 within thirty (30) days';

    const result = resolveEvidence({
      clauseText: sampleClauseText,
      quote,
    });

    expect(result.isResolved).toBe(true);
    expect(result.highlightText).toBe('sum of $50,000 within thirty (30) days');
  });

  it('Tier 4: returns UNRESOLVED fallback when quote is not present in clause (zero fabrication)', () => {
    const hallucinatedQuote = 'Contractor shall deliver 100 widgets on Monday.';

    const result = resolveEvidence({
      clauseText: sampleClauseText,
      quote: hallucinatedQuote,
    });

    expect(result.isResolved).toBe(false);
    expect(result.status).toBe('UNRESOLVED');
    expect(result.highlightText).toBe('');
    expect(result.beforeText).toBe(sampleClauseText);
    expect(result.afterText).toBe('');
    expect(result.unresolvedReason).toBeDefined();
  });

  it('handles edge cases: empty clause text, empty quote, whitespace only', () => {
    const emptyClauseResult = resolveEvidence({
      clauseText: '',
      quote: 'some quote',
    });
    expect(emptyClauseResult.isResolved).toBe(false);
    expect(emptyClauseResult.status).toBe('UNRESOLVED');

    const emptyQuoteResult = resolveEvidence({
      clauseText: sampleClauseText,
      quote: '   ',
    });
    expect(emptyQuoteResult.isResolved).toBe(false);
    expect(emptyQuoteResult.status).toBe('UNRESOLVED');
    expect(emptyQuoteResult.beforeText).toBe(sampleClauseText);
  });

  it('preserves surrounding context when supplied', () => {
    const result = resolveEvidence({
      clauseText: sampleClauseText,
      quote: '$50,000',
      surroundingBefore: 'Preceding preamble text.',
      surroundingAfter: 'Succeeding signatures block.',
    });

    expect(result.surroundingBefore).toBe('Preceding preamble text.');
    expect(result.surroundingAfter).toBe('Succeeding signatures block.');
  });

  it('normalizeQuotesAndWhitespace normalizes smart quotes and collapses spaces', () => {
    const input = ' \u201CHello\u201D   and \u2018world\u2019   ';
    expect(normalizeQuotesAndWhitespace(input)).toBe('"Hello" and \'world\'');
  });
});
