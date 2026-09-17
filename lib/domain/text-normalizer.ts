/**
 * JuriLens Deterministic Text Normalizer
 * Enforces canonical consistency across the entire pipeline.
 *
 * Invariant: Never rewrite, paraphrase, or alter legal wording, numbers, or terms.
 */

export interface NormalizedTextResult {
  normalized_text: string;
  char_mapping?: number[]; // Optional character offset tracking if needed
}

/**
 * Repairs line-break hyphenation where a word was split across lines by printer margin wrapping.
 * Example: "incur-\nred" -> "incurred"
 * Invariant: Preserves true compound words like "third-party" if not split across a line wrap.
 */
export function repairLineWrapHyphens(text: string): string {
  // Matches a lowercase word fragment ending with hyphen at newline followed by continuation
  // e.g. "agree-\nment" -> "agreement", "indemni-\nfication" -> "indemnification"
  return text.replace(/([a-zA-Z]{2,})-\n\s*([a-zA-Z]{2,})/g, '$1$2');
}

/**
 * Normalizes newlines, spaces, and line wrapping deterministically.
 */
export function normalizeContractText(rawText: string): string {
  // 1. Standardize all newline variations to \n
  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Remove non-printable control characters except \t and \n
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3. Conservative hyphenation repair for line wraps
  text = repairLineWrapHyphens(text);

  // 4. Normalize trailing spaces on lines
  const lines = text.split('\n').map((line) => line.replace(/[ \t]+$/g, ''));

  // 5. Rejoin and collapse excessive blank lines (>2 blank lines -> 2 blank lines)
  text = lines.join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  // 6. Final trim of leading/trailing file whitespace
  return text.trim();
}

/**
 * Normalizes text per-page while recording cumulative character offsets.
 */
export function normalizePages(
  rawPages: { page_number: number; text: string }[]
): {
  canonical_text: string;
  pages: { page_number: number; text: string; char_start_offset: number; char_end_offset: number }[];
} {
  const normalizedPages: {
    page_number: number;
    text: string;
    char_start_offset: number;
    char_end_offset: number;
  }[] = [];

  let accumulatedText = '';

  for (const p of rawPages) {
    const normPageText = normalizeContractText(p.text);
    if (normPageText.length === 0) continue;

    const start = accumulatedText.length > 0 ? accumulatedText.length + 2 : 0; // separated by \n\n
    if (accumulatedText.length > 0) {
      accumulatedText += '\n\n';
    }
    accumulatedText += normPageText;
    const end = accumulatedText.length;

    normalizedPages.push({
      page_number: p.page_number,
      text: normPageText,
      char_start_offset: start,
      char_end_offset: end,
    });
  }

  // If all pages were empty, ensure at least one entry
  if (normalizedPages.length === 0) {
    const norm = normalizeContractText(rawPages[0]?.text || '');
    return {
      canonical_text: norm,
      pages: [
        {
          page_number: 1,
          text: norm,
          char_start_offset: 0,
          char_end_offset: norm.length,
        },
      ],
    };
  }

  return {
    canonical_text: accumulatedText,
    pages: normalizedPages,
  };
}
