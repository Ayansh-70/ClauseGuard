import { DocumentSection } from '@/types/domain';

/**
 * Patterns matching standard legal agreement section headers:
 * - ARTICLE I: SERVICES
 * - SECTION 2.1: INDEMNIFICATION
 * - CLAUSE 5. TERMINATION
 * - 1. DEFINITIONS
 * - 4. PAYMENT TERMS
 */
const SECTION_HEADING_PATTERNS = [
  // ARTICLE I / ARTICLE 1 / ARTICLE IV
  {
    regex: /^(?:ARTICLE)\s+([0-9IVXLCDM]+)[\.\:\-\s]+(.*)$/i,
    level: 1,
  },
  // SECTION 1 / SECTION 1.2
  {
    regex: /^(?:SECTION)\s+([0-9]+(?:\.[0-9]+)*)[\.\:\-\s]+(.*)$/i,
    level: 2,
  },
  // CLAUSE 1 / CLAUSE 1.2
  {
    regex: /^(?:CLAUSE)\s+([0-9]+(?:\.[0-9]+)*)[\.\:\-\s]+(.*)$/i,
    level: 2,
  },
  // Numbered headings: "1. DEFINITIONS", "2. PAYMENT TERMS" (all caps or title case)
  {
    regex: /^([0-9]+)\.\s+([A-Z][A-Za-z0-9\s,\-\/\&]{2,60})$/,
    level: 1,
  },
  // Decimal subheadings: "2.1 Scope of Work", "4.2 Payment Schedule"
  {
    regex: /^([0-9]+\.[0-9]+)\s+([A-Z][A-Za-z0-9\s,\-\/\&]{2,60})$/,
    level: 2,
  },
];

/**
 * Detects structural sections and headings in canonical text.
 */
export function detectDocumentSections(
  canonicalText: string,
  pages: { page_number: number; char_start_offset: number; char_end_offset: number }[]
): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const lines = canonicalText.split('\n');

  let currentOffset = 0;
  let sectionIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineStart = currentOffset;
    const lineEnd = currentOffset + line.length;

    // Advance offset for next line (+1 for newline character)
    currentOffset = lineEnd + 1;

    if (trimmed.length === 0 || trimmed.length > 100) {
      continue;
    }

    for (const pattern of SECTION_HEADING_PATTERNS) {
      const match = trimmed.match(pattern.regex);
      if (match) {
        const id = `sec_${String(sectionIndex).padStart(3, '0')}`;
        sectionIndex++;

        // Determine page containing this section heading
        const page = pages.find(
          (p) => lineStart >= p.char_start_offset && lineStart <= p.char_end_offset
        );

        sections.push({
          section_id: id,
          title: trimmed,
          raw_heading: trimmed,
          level: pattern.level,
          start_offset: lineStart,
          end_offset: lineEnd,
          page_number: page ? page.page_number : 1,
        });

        break;
      }
    }
  }

  // If no explicit formal headings were detected, synthesize a root section
  if (sections.length === 0 && canonicalText.length > 0) {
    sections.push({
      section_id: 'sec_001',
      title: 'General Provisions',
      raw_heading: 'General Provisions',
      level: 1,
      start_offset: 0,
      end_offset: canonicalText.length,
      page_number: 1,
    });
  }

  return sections;
}
