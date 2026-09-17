import { describe, it, expect } from 'vitest';
import {
  normalizeContractText,
  repairLineWrapHyphens,
  normalizePages,
} from '@/lib/domain/text-normalizer';

describe('Deterministic Text Normalizer', () => {
  it('standardizes carriage returns to single newline characters', () => {
    const mixed = 'Line 1\r\nLine 2\rLine 3\n';
    const normalized = normalizeContractText(mixed);

    expect(normalized).toBe('Line 1\nLine 2\nLine 3');
    expect(normalized).not.toContain('\r');
  });

  it('collapses excessive empty lines down to two newlines', () => {
    const spaced = 'Section 1\n\n\n\n\n\nSection 2';
    const normalized = normalizeContractText(spaced);

    expect(normalized).toBe('Section 1\n\nSection 2');
  });

  it('repairs line-wrap hyphenation conservatively', () => {
    const wrapped = 'all costs and damages incur-\nred by the company.';
    const repaired = repairLineWrapHyphens(wrapped);

    expect(repaired).toBe('all costs and damages incurred by the company.');
  });

  it('preserves legitimate compound legal words with hyphens', () => {
    const compound = 'Contractor shall defend against third-party claims on a pre-existing basis.';
    const normalized = normalizeContractText(compound);

    expect(normalized).toContain('third-party');
    expect(normalized).toContain('pre-existing');
  });

  it('preserves exact numbers, currency symbols, percentages, and dates without mutation', () => {
    const terms = 'Payment of $15,000.50 due within 30 days. Late fee: 1.5% per month. Effective: Oct 24, 2026.';
    const normalized = normalizeContractText(terms);

    expect(normalized).toBe(terms);
  });

  it('calculates accurate cumulative character offsets across multiple pages', () => {
    const rawPages = [
      { page_number: 1, text: 'Page one content.' },
      { page_number: 2, text: 'Page two content.' },
    ];

    const result = normalizePages(rawPages);

    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].char_start_offset).toBe(0);
    expect(result.pages[0].char_end_offset).toBe('Page one content.'.length);
    expect(result.pages[1].char_start_offset).toBe('Page one content.'.length + 2); // after \n\n
    expect(result.canonical_text.slice(result.pages[1].char_start_offset, result.pages[1].char_end_offset)).toBe(
      'Page two content.'
    );
  });
});
