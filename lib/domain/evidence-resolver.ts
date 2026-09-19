/**
 * ClauseGuard — Grounded Evidence Resolver
 * Pure deterministic domain function resolving source quotes to exact clause text spans.
 * Strict resolution order:
 * 1. Exact offsets (matched_range)
 * 2. Exact substring match (indexOf)
 * 3. Safe normalized match (whitespace & quote normalization)
 * 4. Unresolved fallback (honest report, zero fabrication, never highlight unrelated text)
 */

export type ResolutionStatus =
  | 'EXACT_OFFSET'
  | 'EXACT_QUOTE'
  | 'NORMALIZED_MATCH'
  | 'UNRESOLVED';

export interface ResolveEvidenceOptions {
  clauseText: string;
  clauseStartOffset?: number; // start offset of clause in canonical document
  quote: string;
  matchedRange?: {
    start: number;
    end: number;
  };
  surroundingBefore?: string;
  surroundingAfter?: string;
}

export interface ResolvedEvidence {
  isResolved: boolean;
  status: ResolutionStatus;
  beforeText: string;
  highlightText: string;
  afterText: string;
  surroundingBefore: string;
  surroundingAfter: string;
  unresolvedReason?: string;
}

/**
 * Escapes regex special characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes quote marks and whitespace for equality checks.
 */
export function normalizeQuotesAndWhitespace(str: string): string {
  return str
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds a regex pattern that matches the quote across varied whitespace and quote styling.
 */
function buildNormalizedRegex(quote: string, caseSensitive: boolean): RegExp | null {
  const tokens = quote.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const escapedTokens = tokens.map((token) => {
    // Escape standard regex characters
    let escaped = escapeRegex(token);
    // Allow interchangeable straight and curly quotes
    escaped = escaped.replace(/["\u201C\u201D\u201E\u201F\u2033\u2036]/g, '["\u201C\u201D\u201E\u201F\u2033\u2036]');
    escaped = escaped.replace(/['\u2018\u2019\u201A\u201B\u2032\u2035]/g, "['\u2018\u2019\u201A\u201B\u2032\u2035]");
    return escaped;
  });

  const pattern = escapedTokens.join('\\s+');
  try {
    return new RegExp(pattern, caseSensitive ? '' : 'i');
  } catch {
    return null;
  }
}

/**
 * Pure resolver locating verbatim quotes within clause text.
 * Strictly adheres to 4-tier resolution hierarchy.
 */
export function resolveEvidence(options: ResolveEvidenceOptions): ResolvedEvidence {
  const clauseText = options.clauseText || '';
  const surroundingBefore = options.surroundingBefore || '';
  const surroundingAfter = options.surroundingAfter || '';

  // Edge case 1: Missing clause text
  if (!clauseText || clauseText.trim().length === 0) {
    return {
      isResolved: false,
      status: 'UNRESOLVED',
      beforeText: '',
      highlightText: '',
      afterText: '',
      surroundingBefore,
      surroundingAfter,
      unresolvedReason: 'Clause text is empty or missing.',
    };
  }

  // Edge case 2: Missing quote
  const rawQuote = options.quote || '';
  const trimmedQuote = rawQuote.trim();
  if (trimmedQuote.length === 0) {
    return {
      isResolved: false,
      status: 'UNRESOLVED',
      beforeText: clauseText,
      highlightText: '',
      afterText: '',
      surroundingBefore,
      surroundingAfter,
      unresolvedReason: 'No quote provided to locate.',
    };
  }

  // Tier 1: Exact offset matching
  if (
    options.matchedRange &&
    typeof options.matchedRange.start === 'number' &&
    typeof options.matchedRange.end === 'number'
  ) {
    const { start, end } = options.matchedRange;

    // Check canonical offset relative to clauseStartOffset
    if (typeof options.clauseStartOffset === 'number' && start >= options.clauseStartOffset) {
      const relStart = start - options.clauseStartOffset;
      const relEnd = end - options.clauseStartOffset;

      if (relStart >= 0 && relEnd <= clauseText.length && relStart < relEnd) {
        const candidate = clauseText.slice(relStart, relEnd);
        if (
          candidate === trimmedQuote ||
          normalizeQuotesAndWhitespace(candidate) === normalizeQuotesAndWhitespace(trimmedQuote)
        ) {
          return {
            isResolved: true,
            status: 'EXACT_OFFSET',
            beforeText: clauseText.slice(0, relStart),
            highlightText: candidate,
            afterText: clauseText.slice(relEnd),
            surroundingBefore,
            surroundingAfter,
          };
        }
      }
    }

    // Check clause-relative offsets
    if (start >= 0 && end <= clauseText.length && start < end) {
      const candidate = clauseText.slice(start, end);
      if (
        candidate === trimmedQuote ||
        normalizeQuotesAndWhitespace(candidate) === normalizeQuotesAndWhitespace(trimmedQuote)
      ) {
        return {
          isResolved: true,
          status: 'EXACT_OFFSET',
          beforeText: clauseText.slice(0, start),
          highlightText: candidate,
          afterText: clauseText.slice(end),
          surroundingBefore,
          surroundingAfter,
        };
      }
    }
  }

  // Tier 2: Exact quote substring match (indexOf)
  const exactIndex = clauseText.indexOf(trimmedQuote);
  if (exactIndex !== -1) {
    return {
      isResolved: true,
      status: 'EXACT_QUOTE',
      beforeText: clauseText.slice(0, exactIndex),
      highlightText: clauseText.slice(exactIndex, exactIndex + trimmedQuote.length),
      afterText: clauseText.slice(exactIndex + trimmedQuote.length),
      surroundingBefore,
      surroundingAfter,
    };
  }

  // Tier 3: Safe normalized match (whitespace & quote normalization)
  // Try case-sensitive normalized first
  const caseSensitiveRegex = buildNormalizedRegex(trimmedQuote, true);
  if (caseSensitiveRegex) {
    const match = clauseText.match(caseSensitiveRegex);
    if (match && typeof match.index === 'number') {
      const startIdx = match.index;
      const matchLen = match[0].length;
      return {
        isResolved: true,
        status: 'NORMALIZED_MATCH',
        beforeText: clauseText.slice(0, startIdx),
        highlightText: clauseText.slice(startIdx, startIdx + matchLen),
        afterText: clauseText.slice(startIdx + matchLen),
        surroundingBefore,
        surroundingAfter,
      };
    }
  }

  // Try case-insensitive normalized if case-sensitive did not match
  const caseInsensitiveRegex = buildNormalizedRegex(trimmedQuote, false);
  if (caseInsensitiveRegex) {
    const match = clauseText.match(caseInsensitiveRegex);
    if (match && typeof match.index === 'number') {
      const startIdx = match.index;
      const matchLen = match[0].length;
      return {
        isResolved: true,
        status: 'NORMALIZED_MATCH',
        beforeText: clauseText.slice(0, startIdx),
        highlightText: clauseText.slice(startIdx, startIdx + matchLen),
        afterText: clauseText.slice(startIdx + matchLen),
        surroundingBefore,
        surroundingAfter,
      };
    }
  }

  // Tier 4: Unresolved fallback (Honest report, zero fabrication)
  return {
    isResolved: false,
    status: 'UNRESOLVED',
    beforeText: clauseText,
    highlightText: '',
    afterText: '',
    surroundingBefore,
    surroundingAfter,
    unresolvedReason: 'Source quote could not be located in the current clause context.',
  };
}
