import { describe, it, expect, beforeEach } from 'vitest';
import { reportStore } from '@/lib/server/report-store';
import { StructuredDocument } from '@/types/domain';

function createMockDocument(documentId: string, fileName = 'contract.txt'): StructuredDocument {
  const canonical_text =
    'PREAMBLE: This agreement is made on Jan 1, 2026.\n\n' +
    'SECTION 1: PAYMENT TERMS\n' +
    'Clause 1.1: Customer shall pay $10,000 upon execution.\n\n' +
    'SECTION 2: TERMINATION\n' +
    'Clause 2.1: Either party may terminate with 30 days notice.\n\n' +
    'SIGNATURES: Authorized representative signs here.';

  const clause1Text = 'Clause 1.1: Customer shall pay $10,000 upon execution.';
  const clause1Start = canonical_text.indexOf(clause1Text);
  const clause1End = clause1Start + clause1Text.length;

  const clause2Text = 'Clause 2.1: Either party may terminate with 30 days notice.';
  const clause2Start = canonical_text.indexOf(clause2Text);
  const clause2End = clause2Start + clause2Text.length;

  return {
    metadata: {
      document_id: documentId,
      file_name: fileName,
      file_size_bytes: canonical_text.length,
      format: 'text/plain',
      extension: 'txt',
      created_at: new Date().toISOString(),
      sha256_hash: 'abc123hash',
      page_count: 1,
      character_count: canonical_text.length,
      word_count: 35,
    },
    canonical_text,
    pages: [
      {
        page_number: 1,
        text: canonical_text,
        char_start_offset: 0,
        char_end_offset: canonical_text.length,
      },
    ],
    sections: [
      {
        section_id: 'sec_001',
        title: 'SECTION 1: PAYMENT TERMS',
        raw_heading: 'SECTION 1: PAYMENT TERMS',
        level: 1,
        start_offset: canonical_text.indexOf('SECTION 1: PAYMENT TERMS'),
        end_offset: clause1End,
      },
      {
        section_id: 'sec_002',
        title: 'SECTION 2: TERMINATION',
        raw_heading: 'SECTION 2: TERMINATION',
        level: 1,
        start_offset: canonical_text.indexOf('SECTION 2: TERMINATION'),
        end_offset: clause2End,
      },
    ],
    clauses: [
      {
        clause_id: 'clause_001',
        document_id: documentId,
        section_id: 'sec_001',
        number_label: '1.1',
        text: clause1Text,
        start_offset: clause1Start,
        end_offset: clause1End,
        page_number: 1,
        line_number: 4,
        subclause_ids: [],
      },
      {
        clause_id: 'clause_002',
        document_id: documentId,
        section_id: 'sec_002',
        number_label: '2.1',
        text: clause2Text,
        start_offset: clause2Start,
        end_offset: clause2End,
        page_number: 1,
        line_number: 7,
        subclause_ids: [],
      },
    ],
    chunks: [],
    security_status: {
      passed: true,
      injection_patterns_detected: 0,
      flagged_tokens: [],
      pii_redacted_count: 0,
      sanitized: true,
    },
  };
}

describe('ReportStore StructuredDocument & Clause Context Tests', () => {
  beforeEach(() => {
    reportStore.clear();
  });

  it('saves and retrieves a StructuredDocument by document_id', () => {
    const doc = createMockDocument('doc_test_101', 'Master_Services.txt');
    reportStore.saveDocument(doc);

    const retrieved = reportStore.getDocument('doc_test_101');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.metadata.file_name).toBe('Master_Services.txt');
    expect(retrieved?.clauses).toHaveLength(2);
  });

  it('rejects saving document with invalid report ID format', () => {
    const invalidDoc = createMockDocument('../../evil_path');
    reportStore.saveDocument(invalidDoc);

    expect(reportStore.getDocument('../../evil_path')).toBeNull();
  });

  it('retrieves clause context with accurate surrounding before/after text', () => {
    const doc = createMockDocument('doc_test_context_01');
    reportStore.saveDocument(doc);

    const context = reportStore.getClauseContext('doc_test_context_01', 'clause_001', 30);
    expect(context).not.toBeNull();
    expect(context?.document_id).toBe('doc_test_context_01');
    expect(context?.clause.clause_id).toBe('clause_001');
    expect(context?.clause.number_label).toBe('1.1');
    expect(context?.clause.text).toBe('Clause 1.1: Customer shall pay $10,000 upon execution.');
    expect(context?.section?.title).toBe('SECTION 1: PAYMENT TERMS');

    // Surrounding context boundaries
    expect(context?.surrounding_context.before_text).toContain('SECTION 1: PAYMENT TERMS');
    expect(context?.surrounding_context.after_text).toContain('SECTION 2: TERMINATION');
  });

  it('enforces strict document isolation (Document A cannot return Document B clauses)', () => {
    const docA = createMockDocument('doc_alpha_01', 'Contract_A.txt');
    const docB = createMockDocument('doc_beta_02', 'Contract_B.txt');
    reportStore.saveDocument(docA);
    reportStore.saveDocument(docB);

    // Clause exists in both docs, but retrieving with docA must only return docA's context
    const contextA = reportStore.getClauseContext('doc_alpha_01', 'clause_001');
    expect(contextA?.file_name).toBe('Contract_A.txt');
    expect(contextA?.document_id).toBe('doc_alpha_01');

    const contextB = reportStore.getClauseContext('doc_beta_02', 'clause_001');
    expect(contextB?.file_name).toBe('Contract_B.txt');
    expect(contextB?.document_id).toBe('doc_beta_02');

    // Cross-request with mismatched ID returns null
    const crossQuery = reportStore.getClauseContext('doc_alpha_01', 'nonexistent_clause_999');
    expect(crossQuery).toBeNull();
  });

  it('returns null for non-existent document or non-existent clause', () => {
    expect(reportStore.getClauseContext('nonexistent_doc', 'clause_001')).toBeNull();

    const doc = createMockDocument('doc_existing');
    reportStore.saveDocument(doc);
    expect(reportStore.getClauseContext('doc_existing', 'clause_999')).toBeNull();
  });

  it('clears document store when clear() is called', () => {
    const doc = createMockDocument('doc_to_clear');
    reportStore.saveDocument(doc);
    expect(reportStore.getDocument('doc_to_clear')).not.toBeNull();

    reportStore.clear();
    expect(reportStore.getDocument('doc_to_clear')).toBeNull();
  });
});
