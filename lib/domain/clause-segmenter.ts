import { Clause, DocumentSection } from '@/types/domain';

/**
 * Regex patterns matching legal clause numbering starts:
 * - "1.1 Services."
 * - "4.2(a) Indemnity."
 * - "(a) Contractor shall..."
 * - "(i) Direct damages..."
 * - "1. Definitions."
 */
const CLAUSE_NUMBER_PREFIX =
  /^((?:[0-9]+(?:\.[0-9]+)*|\([a-z0-9IVXLCDM]+\)|[a-z]\.))\s+/i;

/**
 * Determines which section encloses a given character offset.
 */
function findEnclosingSection(offset: number, sections: DocumentSection[]): string | undefined {
  if (sections.length === 0) return undefined;

  let candidate = sections[0];
  for (const sec of sections) {
    if (offset >= sec.start_offset) {
      candidate = sec;
    } else {
      break;
    }
  }
  return candidate?.section_id;
}

/**
 * Segments canonical contract text into deterministic Clause structures with stable IDs.
 */
export function segmentDocumentClauses(
  documentId: string,
  canonicalText: string,
  sections: DocumentSection[],
  pages: { page_number: number; char_start_offset: number; char_end_offset: number }[]
): Clause[] {
  const clauses: Clause[] = [];

  // Split document by double newlines (paragraphs)
  const rawBlocks = canonicalText.split(/\n\n+/);

  let currentOffset = 0;
  let clauseIndex = 1;
  let currentLine = 1;

  // Map to track potential parent clauses by numbering label (e.g. "4.2" -> "clause_004")
  const labelToIdMap = new Map<string, string>();
  const parentChildLinks: { childId: string; parentId: string }[] = [];

  let lastScannedOffset = 0;
  let pageCursor = 0;
  let sectionCursor = 0;

  for (let b = 0; b < rawBlocks.length; b++) {
    const blockText = rawBlocks[b].trim();
    if (blockText.length === 0) continue;

    // Locate exact start offset in canonicalText
    const blockStart = canonicalText.indexOf(blockText, currentOffset);
    const blockEnd = blockStart + blockText.length;
    currentOffset = blockEnd;

    // Calculate line number incrementally without full-document substring allocations
    for (let i = lastScannedOffset; i < blockStart; i++) {
      if (canonicalText.charCodeAt(i) === 10) {
        currentLine++;
      }
    }
    lastScannedOffset = blockStart;

    // Determine page via monotonically advancing cursor
    while (pageCursor < pages.length - 1 && blockStart > pages[pageCursor].char_end_offset) {
      pageCursor++;
    }
    const candidatePage = pages[pageCursor];
    const page = candidatePage && blockStart >= candidatePage.char_start_offset && blockStart <= candidatePage.char_end_offset
      ? candidatePage
      : pages.find((p) => blockStart >= p.char_start_offset && blockStart <= p.char_end_offset);

    // Identify section via cursor
    while (sectionCursor < sections.length - 1 && blockStart >= sections[sectionCursor + 1].start_offset) {
      sectionCursor++;
    }
    const sectionId = sections.length > 0 && blockStart >= sections[sectionCursor].start_offset
      ? sections[sectionCursor].section_id
      : findEnclosingSection(blockStart, sections);

    // Check if block begins with legal numbering
    const numMatch = blockText.match(CLAUSE_NUMBER_PREFIX);
    const numberLabel = numMatch ? numMatch[1].trim() : undefined;

    // Synthesize a title from first line if short
    const firstLine = blockText.split('\n')[0].trim();
    let title: string | undefined = undefined;
    if (firstLine.length < 80 && (numberLabel || firstLine.endsWith(':') || firstLine.endsWith('.'))) {
      title = firstLine.replace(/[\.\:]+$/, '');
    }

    const clauseId = `clause_${String(clauseIndex).padStart(3, '0')}`;
    clauseIndex++;

    // Track hierarchy: e.g. "(a)" or "(i)" under parent decimal clause like "4.2"
    let parentClauseId: string | undefined = undefined;
    if (numberLabel) {
      labelToIdMap.set(numberLabel, clauseId);

      // Check for nested parent: e.g. "4.2.1" -> parent "4.2", "(a)" -> most recent decimal clause
      if (numberLabel.includes('.')) {
        const parts = numberLabel.split('.');
        if (parts.length > 2) {
          const parentLabel = parts.slice(0, -1).join('.');
          const parentId = labelToIdMap.get(parentLabel);
          if (parentId) {
            parentClauseId = parentId;
            parentChildLinks.push({ childId: clauseId, parentId });
          }
        }
      } else if (/^\([a-z]\)$/i.test(numberLabel) || /^\([0-9]+\)$/.test(numberLabel)) {
        // Subclause letter: find the immediately preceding clause with a decimal label
        for (let j = clauses.length - 1; j >= 0; j--) {
          if (clauses[j].number_label && /^[0-9]+(\.[0-9]+)+$/.test(clauses[j].number_label!)) {
            parentClauseId = clauses[j].clause_id;
            parentChildLinks.push({ childId: clauseId, parentId: clauses[j].clause_id });
            break;
          }
        }
      }
    }

    clauses.push({
      clause_id: clauseId,
      document_id: documentId,
      section_id: sectionId,
      parent_clause_id: parentClauseId,
      number_label: numberLabel,
      title,
      text: blockText,
      start_offset: blockStart,
      end_offset: blockEnd,
      page_number: page ? page.page_number : 1,
      line_number: currentLine,
      subclause_ids: [],
    });
  }

  // Populate subclause_ids on parents
  for (const link of parentChildLinks) {
    const parent = clauses.find((c) => c.clause_id === link.parentId);
    if (parent && !parent.subclause_ids.includes(link.childId)) {
      parent.subclause_ids.push(link.childId);
    }
  }

  return clauses;
}
