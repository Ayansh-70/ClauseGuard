import 'server-only';
import {
  Clause,
  ComparisonFinding,
  ComparisonSourceReference,
  StructuredDocument,
  VerificationStatus,
} from '@/types/domain';
import { RawGeminiComparisonFinding } from '@/lib/schemas/comparison.schema';
import { verifyQuoteAgainstClause } from './quote-verifier';

export interface ComparisonVerificationOptions {
  rejectUnverified?: boolean; // Default true
}

export interface ComparisonVerificationResult {
  verified_findings: ComparisonFinding[];
  rejected_findings: ComparisonFinding[];
  total_analyzed: number;
  verified_count: number;
  unverified_count: number;
  rejected_count: number;
}

/**
 * Independently verifies AI-returned comparison findings against both source documents.
 * Protects against hallucinated quotes, non-existent clauses, and cross-document quote confusion.
 */
export function verifyComparisonFindings(
  rawFindings: RawGeminiComparisonFinding[],
  docA: StructuredDocument,
  docB: StructuredDocument,
  options: ComparisonVerificationOptions = {}
): ComparisonVerificationResult {
  const rejectUnverified = options.rejectUnverified ?? true;
  const verifiedList: ComparisonFinding[] = [];
  const rejectedList: ComparisonFinding[] = [];

  const clauseMapA = new Map<string, Clause>();
  for (const c of docA.clauses) {
    clauseMapA.set(c.clause_id, c);
  }

  const clauseMapB = new Map<string, Clause>();
  for (const c of docB.clauses) {
    clauseMapB.set(c.clause_id, c);
  }

  let verifiedCount = 0;
  let unverifiedCount = 0;
  let rejectedCount = 0;

  for (let i = 0; i < rawFindings.length; i++) {
    const raw = rawFindings[i];
    const findingId = raw.id || `comp_${String(i + 1).padStart(3, '0')}`;

    let sourceA: ComparisonSourceReference | undefined = undefined;
    let sourceB: ComparisonSourceReference | undefined = undefined;
    let statusA: VerificationStatus = 'NO_QUOTE_PROVIDED';
    let statusB: VerificationStatus = 'NO_QUOTE_PROVIDED';
    let failureReason: string | null = null;

    // ==========================================
    // 1. Verify Contract A Source (if required/present)
    // ==========================================
    const needsA = raw.status === 'same' || raw.status === 'changed' || raw.status === 'removed' || raw.status === 'ambiguous';
    const hasA = Boolean(raw.contract_a_clause_id || raw.contract_a_quote);

    if (needsA || hasA) {
      if (!raw.contract_a_clause_id) {
        failureReason = 'Missing Contract A clause ID';
        statusA = 'UNVERIFIED_SOURCE_MISMATCH';
      } else {
        const clauseA = clauseMapA.get(raw.contract_a_clause_id);

        if (!clauseA) {
          // Cross-document safety: Check if AI mistakenly referenced a Contract B clause as Contract A
          if (clauseMapB.has(raw.contract_a_clause_id)) {
            failureReason = `Cross-document error: Clause "${raw.contract_a_clause_id}" belongs to Contract B, not Contract A.`;
          } else {
            failureReason = `Referenced Contract A clause "${raw.contract_a_clause_id}" does not exist in Contract A.`;
          }
          statusA = 'UNVERIFIED_SOURCE_MISMATCH';
        } else {
          const quote = raw.contract_a_quote || '';
          const quoteCheck = verifyQuoteAgainstClause(clauseA, quote);
          statusA = quoteCheck.status;

          // Cross-document quote check: If quote not found in clauseA, does it exist in Contract B?
          if (statusA === 'UNVERIFIED_SOURCE_MISMATCH' && quote.length > 10) {
            for (const cb of docB.clauses) {
              if (cb.text.includes(quote.trim())) {
                failureReason = 'Cross-document quote mismatch: Quoted text for Contract A was found in Contract B.';
                break;
              }
            }
          }

          sourceA = {
            document_id: docA.metadata.document_id,
            clause_id: clauseA.clause_id,
            section_id: clauseA.section_id,
            page_number: clauseA.page_number,
            exact_quote: quote,
            matched_range: quoteCheck.matched_range,
            number_label: clauseA.number_label,
          };
        }
      }
    }

    // ==========================================
    // 2. Verify Contract B Source (if required/present)
    // ==========================================
    const needsB = raw.status === 'same' || raw.status === 'changed' || raw.status === 'added' || raw.status === 'ambiguous';
    const hasB = Boolean(raw.contract_b_clause_id || raw.contract_b_quote);

    if (needsB || hasB) {
      if (!raw.contract_b_clause_id) {
        failureReason = failureReason || 'Missing Contract B clause ID';
        statusB = 'UNVERIFIED_SOURCE_MISMATCH';
      } else {
        const clauseB = clauseMapB.get(raw.contract_b_clause_id);

        if (!clauseB) {
          // Cross-document safety: Check if AI mistakenly referenced a Contract A clause as Contract B
          if (clauseMapA.has(raw.contract_b_clause_id)) {
            failureReason = failureReason || `Cross-document error: Clause "${raw.contract_b_clause_id}" belongs to Contract A, not Contract B.`;
          } else {
            failureReason = failureReason || `Referenced Contract B clause "${raw.contract_b_clause_id}" does not exist in Contract B.`;
          }
          statusB = 'UNVERIFIED_SOURCE_MISMATCH';
        } else {
          const quote = raw.contract_b_quote || '';
          const quoteCheck = verifyQuoteAgainstClause(clauseB, quote);
          statusB = quoteCheck.status;

          // Cross-document quote check: If quote not found in clauseB, does it exist in Contract A?
          if (statusB === 'UNVERIFIED_SOURCE_MISMATCH' && quote.length > 10) {
            for (const ca of docA.clauses) {
              if (ca.text.includes(quote.trim())) {
                failureReason = failureReason || 'Cross-document quote mismatch: Quoted text for Contract B was found in Contract A.';
                break;
              }
            }
          }

          sourceB = {
            document_id: docB.metadata.document_id,
            clause_id: clauseB.clause_id,
            section_id: clauseB.section_id,
            page_number: clauseB.page_number,
            exact_quote: quote,
            matched_range: quoteCheck.matched_range,
            number_label: clauseB.number_label,
          };
        }
      }
    }

    // ==========================================
    // 3. Synthesize Overall Verification Status
    // ==========================================
    let overallStatus: VerificationStatus = 'UNVERIFIED_SOURCE_MISMATCH';
    let isFullyVerified = false;

    if (raw.status === 'removed') {
      overallStatus = statusA;
      isFullyVerified = statusA === 'VERIFIED_EXACT' || statusA === 'VERIFIED_NORMALIZED';
    } else if (raw.status === 'added') {
      overallStatus = statusB;
      isFullyVerified = statusB === 'VERIFIED_EXACT' || statusB === 'VERIFIED_NORMALIZED';
    } else {
      // both A and B are involved
      const isAVerified = statusA === 'VERIFIED_EXACT' || statusA === 'VERIFIED_NORMALIZED';
      const isBVerified = statusB === 'VERIFIED_EXACT' || statusB === 'VERIFIED_NORMALIZED';

      if (isAVerified && isBVerified) {
        isFullyVerified = true;
        overallStatus =
          statusA === 'VERIFIED_EXACT' && statusB === 'VERIFIED_EXACT'
            ? 'VERIFIED_EXACT'
            : 'VERIFIED_NORMALIZED';
      } else {
        isFullyVerified = false;
        overallStatus = 'UNVERIFIED_SOURCE_MISMATCH';
      }
    }

    const finalFinding: ComparisonFinding = {
      id: findingId,
      status: raw.status,
      category: raw.category,
      title: raw.title,
      plain_english_summary: raw.plain_english_summary,
      practical_implication: failureReason
        ? `${raw.practical_implication} [Verification Note: ${failureReason}]`
        : raw.practical_implication,
      attention_level: raw.attention_level,
      contract_a_source: sourceA,
      contract_b_source: sourceB,
      confidence: isFullyVerified ? raw.confidence ?? 0.9 : 0.0,
      verification_status: overallStatus,
      suggested_question_for_counsel: raw.suggested_question_for_counsel,
    };

    if (isFullyVerified) {
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
