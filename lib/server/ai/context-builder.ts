import 'server-only';
import { StructuredDocument } from '@/types/domain';
import { AppError } from '@/lib/errors/app-error';

export interface AuditContext {
  document_id: string;
  file_name: string;
  total_clauses: number;
  formatted_context: string;
}

const MAX_AUDIT_CONTEXT_CHARS = 120_000;

/**
 * Converts a StructuredDocument into a clean, source-anchored string for Gemini inference.
 * Preserves clause IDs, section titles, and page numbers while stripping application internal state.
 */
export function buildAuditContext(document: StructuredDocument): AuditContext {
  if (!document.clauses || document.clauses.length === 0) {
    throw new AppError('INPUT_EMPTY', 'Document has no clauses available for audit.', 400);
  }

  const header = [
    `DOCUMENT: ${document.metadata.file_name}`,
    `DOCUMENT ID: ${document.metadata.document_id}`,
    `TOTAL CLAUSES: ${document.clauses.length}`,
    `PAGE COUNT: ${document.metadata.page_count}`,
    '',
    '=== BEGIN CONTRACT CLAUSES ===',
    '',
  ].join('\n');

  // Build map of section titles for quick lookup
  const sectionMap = new Map<string, string>();
  for (const sec of document.sections) {
    sectionMap.set(sec.section_id, sec.title);
  }

  const clauseBlocks: string[] = [];

  for (const clause of document.clauses) {
    const sectionTitle = clause.section_id ? sectionMap.get(clause.section_id) || 'General' : 'General';
    const pageStr = clause.page_number ? ` | Page: ${clause.page_number}` : '';
    const labelStr = clause.number_label ? ` | Label: ${clause.number_label}` : '';

    const block = [
      `[Clause ID: ${clause.clause_id}${labelStr}${pageStr} | Section: ${sectionTitle}]`,
      clause.text,
      '',
    ].join('\n');

    clauseBlocks.push(block);
  }

  const footer = ['=== END CONTRACT CLAUSES ==='].join('\n');
  const fullText = header + clauseBlocks.join('\n') + footer;

  if (fullText.length > MAX_AUDIT_CONTEXT_CHARS) {
    throw new AppError(
      'INPUT_TOO_LARGE',
      `Document context length (${fullText.length} chars) exceeds maximum processing threshold of ${MAX_AUDIT_CONTEXT_CHARS} characters.`,
      413
    );
  }

  return {
    document_id: document.metadata.document_id,
    file_name: document.metadata.file_name,
    total_clauses: document.clauses.length,
    formatted_context: fullText,
  };
}
