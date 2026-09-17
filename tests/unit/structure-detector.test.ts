import { describe, it, expect } from 'vitest';
import { detectDocumentSections } from '@/lib/domain/structure-detector';

describe('Structure & Section Detection', () => {
  it('detects standard legal headings with numbering and hierarchy levels', () => {
    const text = [
      'ARTICLE I: DEFINITIONS',
      'Words defined herein shall have the meanings set forth below.',
      '',
      'SECTION 2.1: PAYMENT TERMS',
      'Client shall pay Contractor within thirty days.',
      '',
      '3. TERMINATION',
      'Either party may terminate upon written notice.',
    ].join('\n');

    const pages = [{ page_number: 1, char_start_offset: 0, char_end_offset: text.length }];
    const sections = detectDocumentSections(text, pages);

    expect(sections).toHaveLength(3);
    expect(sections[0].section_id).toBe('sec_001');
    expect(sections[0].title).toBe('ARTICLE I: DEFINITIONS');
    expect(sections[0].level).toBe(1);

    expect(sections[1].section_id).toBe('sec_002');
    expect(sections[1].title).toBe('SECTION 2.1: PAYMENT TERMS');
    expect(sections[1].level).toBe(2);

    expect(sections[2].section_id).toBe('sec_003');
    expect(sections[2].title).toBe('3. TERMINATION');
  });

  it('synthesizes a fallback General Provisions section for unformatted documents', () => {
    const text = 'This is an informal agreement between John and Jane without numbered headings.';
    const pages = [{ page_number: 1, char_start_offset: 0, char_end_offset: text.length }];

    const sections = detectDocumentSections(text, pages);

    expect(sections).toHaveLength(1);
    expect(sections[0].section_id).toBe('sec_001');
    expect(sections[0].title).toBe('General Provisions');
    expect(sections[0].start_offset).toBe(0);
    expect(sections[0].end_offset).toBe(text.length);
  });
});
