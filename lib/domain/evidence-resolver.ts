/**
 * ClauseGuard — Grounded Evidence Resolver
 * Pure deterministic domain function resolving source quotes to exact clause text spans.
 * Strict resolution order:
 * 1. Exact offsets (matched_range)
 * 2. Exact substring match (indexOf)
 * 3. Safe normalized match (whitespace, dash & quote normalization)
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
  isAmbiguous?: boolean;
  ambiguityNotice?: string;
}

/**
 * Escapes regex special characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes quote marks, dashes, and whitespace for equality checks.
 */
export function normalizeQuotesAndWhitespace(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

const REGEX_CACHE = new Map<string, RegExp | null>();
const MAX_REGEX_CACHE_SIZE = 300;

/**
 * Builds a regex pattern that matches the quote across varied whitespace, dashes, and quote styling.
 * Caps at 200 tokens to prevent excessive compilation cost on pathological inputs.
 * Uses bounded cache to eliminate redundant pattern compilation across repeated verifications.
 */
function buildNormalizedRegex(quote: string, caseSensitive: boolean): RegExp | null {
  if (typeof quote !== 'string' || quote.length > 5000) return null;

  const cacheKey = `${caseSensitive ? 'CS' : 'CI'}:${quote}`;
  const cached = REGEX_CACHE.get(cacheKey);
  if (cached !== undefined) return cached;

  const tokens = quote.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 200) {
    if (REGEX_CACHE.size >= MAX_REGEX_CACHE_SIZE) {
      const firstKey = REGEX_CACHE.keys().next().value;
      if (firstKey) REGEX_CACHE.delete(firstKey);
    }
    REGEX_CACHE.set(cacheKey, null);
    return null;
  }

  const escapedTokens = tokens.map((token) => {
    let escaped = escapeRegex(token);
    // Allow interchangeable straight and curly quotes
    escaped = escaped.replace(/["\u201C\u201D\u201E\u201F\u2033\u2036]/g, '["\u201C\u201D\u201E\u201F\u2033\u2036]');
    escaped = escaped.replace(/['\u2018\u2019\u201A\u201B\u2032\u2035]/g, "['\u2018\u2019\u201A\u201B\u2032\u2035]");
    // Allow interchangeable hyphens, minus, en-dashes, and em-dashes
    escaped = escaped.replace(/[-\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '[-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015\\u2212]');
    return escaped;
  });

  const pattern = escapedTokens.join('\\s+');
  let regex: RegExp | null = null;
  try {
    regex = new RegExp(pattern, caseSensitive ? '' : 'i');
  } catch {
    regex = null;
  }

  if (REGEX_CACHE.size >= MAX_REGEX_CACHE_SIZE) {
    const firstKey = REGEX_CACHE.keys().next().value;
    if (firstKey) REGEX_CACHE.delete(firstKey);
  }
  REGEX_CACHE.set(cacheKey, regex);

  return regex;
}

/**
 * Pure resolver locating verbatim quotes within clause text.
 * Strictly adheres to 4-tier resolution hierarchy.
 * Resistant to malformed, non-integer, or pathological offsets.
 */
export function resolveEvidence(options: ResolveEvidenceOptions): ResolvedEvidence {
  const clauseText = typeof options?.clauseText === 'string' ? options.clauseText : '';
  const surroundingBefore = typeof options?.surroundingBefore === 'string' ? options.surroundingBefore : '';
  const surroundingAfter = typeof options?.surroundingAfter === 'string' ? options.surroundingAfter : '';

  // Edge case 1: Missing or whitespace-only clause text
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
  const rawQuote = typeof options?.quote === 'string' ? options.quote : '';
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

  // Tier 1: Exact offset matching with strict integer validation
  if (
    options.matchedRange &&
    Number.isSafeInteger(options.matchedRange.start) &&
    Number.isSafeInteger(options.matchedRange.end) &&
    options.matchedRange.start >= 0 &&
    options.matchedRange.end > options.matchedRange.start
  ) {
    const { start, end } = options.matchedRange;

    // Check canonical offset relative to clauseStartOffset
    if (
      Number.isSafeInteger(options.clauseStartOffset) &&
      (options.clauseStartOffset as number) >= 0 &&
      start >= (options.clauseStartOffset as number)
    ) {
      const relStart = start - (options.clauseStartOffset as number);
      const relEnd = end - (options.clauseStartOffset as number);

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
            isAmbiguous: false,
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
          isAmbiguous: false,
        };
      }
    }
  }

  // Tier 2: Exact quote substring match (indexOf)
  const exactIndex = clauseText.indexOf(trimmedQuote);
  if (exactIndex !== -1) {
    // Check for multiple occurrences within the clause to flag ambiguity
    let isAmbiguous = clauseText.indexOf(trimmedQuote, exactIndex + 1) !== -1;
    if (!isAmbiguous) {
      // Also check if a normalized pattern matches elsewhere in the clause
      const normRegex = buildNormalizedRegex(trimmedQuote, false);
      if (normRegex) {
        const remaining = clauseText.slice(exactIndex + trimmedQuote.length);
        const preceding = clauseText.slice(0, exactIndex);
        if (normRegex.test(remaining) || normRegex.test(preceding)) {
          isAmbiguous = true;
        }
      }
    }

    return {
      isResolved: true,
      status: 'EXACT_QUOTE',
      beforeText: clauseText.slice(0, exactIndex),
      highlightText: clauseText.slice(exactIndex, exactIndex + trimmedQuote.length),
      afterText: clauseText.slice(exactIndex + trimmedQuote.length),
      surroundingBefore,
      surroundingAfter,
      isAmbiguous,
      ambiguityNotice: isAmbiguous
        ? 'Quote appears multiple times in this clause; displaying the first match.'
        : undefined,
    };
  }

  // Tier 3: Safe normalized match (whitespace, dash & quote normalization)
  // Try case-sensitive normalized first
  const caseSensitiveRegex = buildNormalizedRegex(trimmedQuote, true);
  if (caseSensitiveRegex) {
    const match = clauseText.match(caseSensitiveRegex);
    if (match && typeof match.index === 'number') {
      const startIdx = match.index;
      const matchLen = match[0].length;
      const secondMatch = clauseText.slice(startIdx + 1).match(caseSensitiveRegex);
      const isAmbiguous = !!secondMatch;
      return {
        isResolved: true,
        status: 'NORMALIZED_MATCH',
        beforeText: clauseText.slice(0, startIdx),
        highlightText: clauseText.slice(startIdx, startIdx + matchLen),
        afterText: clauseText.slice(startIdx + matchLen),
        surroundingBefore,
        surroundingAfter,
        isAmbiguous,
        ambiguityNotice: isAmbiguous
          ? 'Quote appears multiple times in this clause; displaying the first match.'
          : undefined,
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
      const secondMatch = clauseText.slice(startIdx + 1).match(caseInsensitiveRegex);
      const isAmbiguous = !!secondMatch;
      return {
        isResolved: true,
        status: 'NORMALIZED_MATCH',
        beforeText: clauseText.slice(0, startIdx),
        highlightText: clauseText.slice(startIdx, startIdx + matchLen),
        afterText: clauseText.slice(startIdx + matchLen),
        surroundingBefore,
        surroundingAfter,
        isAmbiguous,
        ambiguityNotice: isAmbiguous
          ? 'Quote appears multiple times in this clause; displaying the first match.'
          : undefined,
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
