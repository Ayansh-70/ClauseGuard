import 'server-only';
import { AlignmentResult, StructuredDocument } from '@/types/domain';
import { AppError } from '@/lib/errors/app-error';
import { randomUUID } from 'crypto';

export interface ComparisonContext {
  comparison_id: string;
  doc_a_id: string;
  doc_b_id: string;
  file_name_a: string;
  file_name_b: string;
  formatted_contract_a: string;
  formatted_contract_b: string;
  formatted_aligned_pairs: string;
  aligned_pairs_count: number;
  alignment: AlignmentResult;
}

const MAX_COMPARISON_CONTEXT_CHARS = 180_000;

function formatDocumentClauses(doc: StructuredDocument, docLabel: string): string {
  const sectionMap = new Map<string, string>();
  for (const s of doc.sections) {
    sectionMap.set(s.section_id, s.title);
  }

  const lines: string[] = [
    `=== ${docLabel}: ${doc.metadata.file_name} (ID: ${doc.metadata.document_id}) ===`,
    `Total Clauses: ${doc.clauses.length} | Pages: ${doc.metadata.page_count}`,
    '',
  ];

  for (const c of doc.clauses) {
    const sec = c.section_id ? sectionMap.get(c.section_id) || 'General' : 'General';
    const label = c.number_label ? ` | Label: ${c.number_label}` : '';
    const page = c.page_number ? ` | Page: ${c.page_number}` : '';

    lines.push(`[${docLabel} Clause ID: ${c.clause_id}${label}${page} | Section: ${sec}]`);
    lines.push(c.text);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Builds deterministic, bounded comparison context for Contract A and Contract B.
 * Applies untrusted prompt injection boundaries and enforces hard character limits.
 */
export function buildComparisonContext(
  docA: StructuredDocument,
  docB: StructuredDocument,
  alignment: AlignmentResult
): ComparisonContext {
  if (!docA.clauses || docA.clauses.length === 0) {
    throw new AppError('INPUT_EMPTY', 'Contract A has no clauses available for comparison.', 400);
  }
  if (!docB.clauses || docB.clauses.length === 0) {
    throw new AppError('INPUT_EMPTY', 'Contract B has no clauses available for comparison.', 400);
  }

  const comparisonId = `comp_${randomUUID().slice(0, 12)}`;

  const rawContractA = formatDocumentClauses(docA, 'Contract A');
  const rawContractB = formatDocumentClauses(docB, 'Contract B');

  const wrappedContractA = `<untrusted_contract_a>\n${rawContractA}\n</untrusted_contract_a>`;
  const wrappedContractB = `<untrusted_contract_b>\n${rawContractB}\n</untrusted_contract_b>`;

  // Build structured aligned pairs map
  const pairLines: string[] = [
    '=== DETERMINISTIC CLAUSE ALIGNMENT SUMMARY ===',
    `Total Pre-aligned Pairs: ${alignment.aligned_count}`,
    `Contract A Unique Provisions: ${alignment.a_only_count}`,
    `Contract B Unique Provisions: ${alignment.b_only_count}`,
    '',
  ];

  for (const pair of alignment.pairs) {
    if (pair.alignment_type === 'ALIGNED' && pair.clause_a && pair.clause_b) {
      pairLines.push(
        `- Pair ${pair.pair_id}: [Contract A ${pair.clause_a.clause_id} (${pair.clause_a.number_label || 'clause'})] <-> [Contract B ${pair.clause_b.clause_id} (${pair.clause_b.number_label || 'clause'})] | Match Rationale: ${pair.match_rationale}`
      );
    } else if (pair.alignment_type === 'CONTRACT_A_ONLY' && pair.clause_a) {
      pairLines.push(
        `- [Contract A ONLY] ${pair.clause_a.clause_id} (${pair.clause_a.number_label || 'clause'})`
      );
    } else if (pair.alignment_type === 'CONTRACT_B_ONLY' && pair.clause_b) {
      pairLines.push(
        `- [Contract B ONLY] ${pair.clause_b.clause_id} (${pair.clause_b.number_label || 'clause'})`
      );
    }
  }

  const formattedAlignedPairs = pairLines.join('\n');

  const totalChars =
    wrappedContractA.length + wrappedContractB.length + formattedAlignedPairs.length;

  if (totalChars > MAX_COMPARISON_CONTEXT_CHARS) {
    throw new AppError(
      'INPUT_TOO_LARGE',
      `Combined contracts context length (${totalChars} chars) exceeds maximum comparison limit of ${MAX_COMPARISON_CONTEXT_CHARS} characters.`,
      413
    );
  }

  return {
    comparison_id: comparisonId,
    doc_a_id: docA.metadata.document_id,
    doc_b_id: docB.metadata.document_id,
    file_name_a: docA.metadata.file_name,
    file_name_b: docB.metadata.file_name,
    formatted_contract_a: wrappedContractA,
    formatted_contract_b: wrappedContractB,
    formatted_aligned_pairs: formattedAlignedPairs,
    aligned_pairs_count: alignment.aligned_count,
    alignment,
  };
}
