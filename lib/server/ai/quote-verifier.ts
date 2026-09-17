import 'server-only';
import { Clause, Finding, SourceReference, StructuredDocument, VerificationStatus } from '@/types/domain';
import { RawGeminiFinding } from '@/lib/schemas/finding.schema';

export interface VerificationOptions {
  rejectUnverified?: boolean; // Default true: unverified findings are separated into rejected list
}

export interface VerificationResult {
  verified_findings: Finding[];
  rejected_findings: Finding[];
  total_analyzed: number;
  verified_count: number;
  unverified_count: number;
  rejected_count: number;
}

/**
 * Normalizes text for Tier-2 comparison (removes multiple whitespace and standardizes quotes).
 */
function normalizeForComparison(str: string): string {
  return str
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Calculates Levenshtein edit distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

/**
 * Verifies a verbatim excerpt against a target clause text.
 * Implements Tier-1 (Exact Substring) and Tier-2 (Normalized Sliding-Window Matching).
 */
export function verifyQuoteAgainstClause(
  clause: Clause,
  excerpt: string
): {
  status: VerificationStatus;
  matched_range?: { start: number; end: number };
} {
  if (!excerpt || excerpt.trim().length === 0) {
    return { status: 'NO_QUOTE_PROVIDED' };
  }

  const trimmedExcerpt = excerpt.trim();

  // Tier 1: Exact substring match
  const exactIndex = clause.text.indexOf(trimmedExcerpt);
  if (exactIndex !== -1) {
    const start = clause.start_offset + exactIndex;
    const end = start + trimmedExcerpt.length;
    return {
      status: 'VERIFIED_EXACT',
      matched_range: { start, end },
    };
  }

  // Tier 2: Normalized matching
  const normClause = normalizeForComparison(clause.text);
  const normExcerpt = normalizeForComparison(trimmedExcerpt);

  const normIndex = normClause.indexOf(normExcerpt);
  if (normIndex !== -1) {
    // Exact match in normalized space
    return {
      status: 'VERIFIED_NORMALIZED',
      matched_range: {
        start: clause.start_offset,
        end: clause.end_offset,
      },
    };
  }

  // Sliding window check if excerpt is at least 15 chars
  if (normExcerpt.length >= 15 && normClause.length >= normExcerpt.length) {
    const windowLen = normExcerpt.length;
    const maxDistance = Math.max(1, Math.floor(windowLen * 0.05)); // 95% similarity threshold

    for (let i = 0; i <= normClause.length - windowLen; i += 3) {
      const windowStr = normClause.substring(i, i + windowLen);
      const dist = levenshteinDistance(normExcerpt, windowStr);
      if (dist <= maxDistance) {
        return {
          status: 'VERIFIED_NORMALIZED',
          matched_range: {
            start: clause.start_offset,
            end: clause.end_offset,
          },
        };
      }
    }
  }

  return { status: 'UNVERIFIED_SOURCE_MISMATCH' };
}

/**
 * Independently audits all AI-returned findings against the deterministic StructuredDocument.
 * Validates clause existence, quote presence, and page metadata.
 */
export function verifyFindings(
  rawFindings: RawGeminiFinding[],
  document: StructuredDocument,
  options: VerificationOptions = {}
): VerificationResult {
  const rejectUnverified = options.rejectUnverified ?? true;
  const verifiedList: Finding[] = [];
  const rejectedList: Finding[] = [];

  const clauseMap = new Map<string, Clause>();
  for (const c of document.clauses) {
    clauseMap.set(c.clause_id, c);
  }

  let verifiedCount = 0;
  let unverifiedCount = 0;
  let rejectedCount = 0;

  for (let i = 0; i < rawFindings.length; i++) {
    const raw = rawFindings[i];
    const targetClause = clauseMap.get(raw.clause_id);

    // 1. Check if referenced clause_id exists in the document
    if (!targetClause) {
      rejectedCount++;
      const rejectedFinding: Finding = {
        finding_id: raw.finding_id || `find_${String(i + 1).padStart(3, '0')}`,
        clause_id: raw.clause_id,
        category: raw.category,
        attention_level: raw.attention_level,
        title: raw.title,
        verbatim_quote: raw.verbatim_quote || '',
        plain_language_explanation: raw.plain_language_explanation,
        why_it_matters: raw.why_it_matters,
        evidence: `REJECTED: Referenced clause ID "${raw.clause_id}" does not exist in document.`,
        uncertainty: raw.uncertainty,
        confidence: 0.0,
        suggested_question_for_counsel: raw.suggested_question_for_counsel,
        verification_status: 'UNVERIFIED_SOURCE_MISMATCH',
      };
      rejectedList.push(rejectedFinding);
      continue;
    }

    // 2. Verify quoted excerpt against clause text
    const quoteCheck = verifyQuoteAgainstClause(targetClause, raw.verbatim_quote);

    const isVerified =
      quoteCheck.status === 'VERIFIED_EXACT' || quoteCheck.status === 'VERIFIED_NORMALIZED';

    const sourceReferences: SourceReference[] = [
      {
        clause_id: targetClause.clause_id,
        page_number: targetClause.page_number,
        excerpt: raw.verbatim_quote,
        matched_range: quoteCheck.matched_range,
      },
    ];

    const finalFinding: Finding = {
      finding_id: raw.finding_id.startsWith('find_') ? raw.finding_id : `find_${String(i + 1).padStart(3, '0')}`,
      clause_id: targetClause.clause_id,
      affected_clause_ids: raw.affected_clause_ids || [targetClause.clause_id],
      category: raw.category,
      attention_level: raw.attention_level,
      title: raw.title,
      verbatim_quote: raw.verbatim_quote,
      source_references: sourceReferences,
      plain_language_explanation: raw.plain_language_explanation,
      why_it_matters: raw.why_it_matters,
      evidence: raw.evidence,
      uncertainty: raw.uncertainty,
      confidence: raw.confidence ?? 0.85,
      page_number: targetClause.page_number,
      suggested_question_for_counsel: raw.suggested_question_for_counsel,
      verification_status: quoteCheck.status,
      matched_range: quoteCheck.matched_range,
    };

    if (isVerified) {
      verifiedCount++;
      verifiedList.push(finalFinding);
    } else {
      unverifiedCount++;
      if (rejectUnverified) {
        rejectedCount++;
        rejectedList.push(finalFinding);
      } else {
        verifiedList.push(finalFinding);
      }
    }
  }

  return {
    verified_findings: verifiedList,
    rejected_findings: rejectedList,
    total_analyzed: rawFindings.length,
    verified_count: verifiedCount,
    unverified_count: unverifiedCount,
    rejected_count: rejectedCount,
  };
}
