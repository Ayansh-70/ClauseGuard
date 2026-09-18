/**
 * JuriLens / ClauseRadar — Authoritative Domain Types
 * Core domain contracts for document ingestion, structural parsing,
 * security scanning, and downstream AI analysis.
 */

// Attention classification replacing arbitrary risk scores
export type AttentionLevel =
  | 'HIGH_ATTENTION'
  | 'MEDIUM_ATTENTION'
  | 'LOW_ATTENTION'
  | 'INFORMATIONAL'
  | 'STANDARD_NOTICE';

// Standard commercial contract dimensions
export type ContractCategory =
  | 'PAYMENT_TERMS'
  | 'LIABILITY_LIMITS'
  | 'INDEMNIFICATION'
  | 'INTELLECTUAL_PROPERTY'
  | 'TERMINATION_RIGHTS'
  | 'CONFIDENTIALITY'
  | 'RESTRICTIONS_NON_COMPETE'
  | 'GOVERNING_LAW_DISPUTES'
  | 'MATERIAL_OBLIGATIONS';

// Quote verification outcome status
export type VerificationStatus =
  | 'VERIFIED_EXACT'
  | 'VERIFIED_NORMALIZED'
  | 'UNVERIFIED_SOURCE_MISMATCH'
  | 'NO_QUOTE_PROVIDED';

// Supported document MIME types and extensions
export type SupportedDocumentFormat = 'text/plain' | 'text/markdown' | 'application/pdf';
export type SupportedFileExtension = 'txt' | 'md' | 'pdf';

/**
 * Exact character span in a document or page
 */
export interface TextSpan {
  start_offset: number; // 0-based character index (inclusive)
  end_offset: number;   // 0-based character index (exclusive)
}

/**
 * Source location reference for complete auditability
 */
export interface SourceLocation {
  document_id: string;
  page_number?: number;      // 1-based page index (if available from format)
  section_id?: string;       // Stable ID of enclosing section
  clause_id?: string;        // Stable ID of enclosing clause
  span: TextSpan;            // Character span relative to canonical normalized text
  raw_line_number?: number;  // Line number in extracted text
}

/**
 * Document metadata extracted during ingestion
 */
export interface DocumentMetadata {
  document_id: string;       // Cryptographic/deterministic hash identifier
  file_name: string;         // Sanitized original filename
  file_size_bytes: number;   // Input size
  format: SupportedDocumentFormat;
  extension: SupportedFileExtension;
  created_at: string;        // ISO 8601 timestamp
  sha256_hash: string;       // Content integrity hash
  page_count: number;        // Number of extracted pages (>= 1)
  character_count: number;   // Total character count in normalized text
  word_count: number;        // Word count estimate
}

/**
 * Individual page representation (preserves physical format boundaries)
 */
export interface DocumentPage {
  page_number: number;       // 1-based
  text: string;              // Normalized text on this page
  char_start_offset: number; // Offset of page start in canonical document
  char_end_offset: number;   // Offset of page end in canonical document
}

/**
 * Structural section or heading detected in the agreement
 */
export interface DocumentSection {
  section_id: string;        // e.g. "sec_001"
  title: string;             // Section header, e.g. "ARTICLE 3: PAYMENT TERMS"
  raw_heading: string;       // Unmodified heading string
  level: number;             // Heading hierarchy depth: 1 (Article), 2 (Section), 3 (Subsection)
  start_offset: number;      // Character start in canonical text
  end_offset: number;        // Character end in canonical text
  page_number?: number;      // Page where section starts
}

/**
 * Segmented legal clause or subclause
 */
export interface Clause {
  clause_id: string;         // Stable, zero-padded identifier: "clause_001", "clause_002"
  document_id: string;       // Parent document ID
  section_id?: string;       // Associated section ID if nested under a heading
  parent_clause_id?: string; // Parent clause ID for nested numbering (e.g. 4.2(a) -> 4.2)
  number_label?: string;     // Explicit numbering label if found: "4.1", "(b)", "III.A"
  title?: string;            // Synthesized or extracted title
  text: string;              // Verbatim normalized clause text
  start_offset: number;      // Character start in canonical text
  end_offset: number;        // Character end in canonical text
  page_number?: number;      // Page where clause begins
  line_number: number;       // 1-based line number in canonical text
  subclause_ids: string[];   // Children clause IDs for nested navigation
}

/**
 * Deterministic text chunk for retrieval and token-bounded processing
 */
export interface Chunk {
  chunk_id: string;          // Stable chunk ID: "chunk_001"
  document_id: string;
  clause_id: string;         // Primary referenced clause
  section_id?: string;
  page_number?: number;
  text: string;              // Chunk text content
  start_offset: number;
  end_offset: number;
  token_estimate: number;    // Approximate token count (chars / 4)
  sequence_index: number;    // 0-based sequential ordering
}

/**
 * Security inspection status
 */
export interface SecurityStatus {
  passed: boolean;
  injection_patterns_detected: number;
  flagged_tokens: string[];
  pii_redacted_count: number;
  sanitized: boolean;
  notes?: string[];
}

/**
 * Source reference supporting fine-grained citation and verification
 */
export interface SourceReference {
  clause_id: string;
  page_number?: number;
  excerpt: string;
  matched_range?: {
    start: number;
    end: number;
  };
}

/**
 * Individual AI finding contract
 */
export interface Finding {
  finding_id: string;                  // e.g. "find_001"
  clause_id: string;                   // Primary referenced Clause.clause_id
  affected_clause_ids?: string[];      // Multiple clause IDs if finding spans several clauses
  category: ContractCategory;
  attention_level: AttentionLevel;
  severity?: 'low' | 'medium' | 'high'; // Optional severity alias mapped to attention
  title: string;                       // Short descriptive title
  verbatim_quote: string;              // Verbatim quote from source clause
  source_references?: SourceReference[]; // Fine-grained source citations
  plain_language_explanation: string;  // 8th-grade readability explanation
  why_it_matters: string;              // Practical commercial hazard
  evidence: string;                    // Supporting reasoning
  uncertainty?: string;                // Ambiguities or caveats in the text
  confidence?: number;                 // Model confidence in grounded finding (0.0 - 1.0)
  page_number?: number;                // Page number of source clause
  suggested_question_for_counsel: string; // Question to ask an attorney
  verification_status: VerificationStatus;
  matched_range?: {                    // Exact verified coordinates in source text
    start: number;
    end: number;
  };
  suggested_alternative?: string;      // Illustrative counter-proposal
  alternative_rationale?: string;      // Rationale explaining the counter-proposal
}

/**
 * Metadata for a completed audit run
 */
export interface AuditMetadata {
  audited_at: string;
  model_used: string;
  duration_ms: number;
  total_clauses_analyzed: number;
  total_findings_count: number;
  verified_count: number;
  unverified_count: number;
  rejected_count: number;
  file_name?: string;
  page_count?: number;
  character_count?: number;
}

/**
 * Complete Grounded Legal Audit Result
 */
export interface AuditResult {
  document_id: string;
  summary: string;
  findings: Finding[];
  rejected_findings?: Finding[];
  primary_concerns: string[];
  metadata: AuditMetadata;
}

/**
 * Canonical Structured Document: output of ingestion and clause segmentation
 */
export interface StructuredDocument {
  metadata: DocumentMetadata;
  canonical_text: string;    // The single canonical normalized source of truth
  pages: DocumentPage[];     // Preserved page boundaries
  sections: DocumentSection[]; // Structural headings
  clauses: Clause[];         // Segmented clauses with stable IDs
  chunks: Chunk[];           // Deterministic retrieval chunks
  security_status: SecurityStatus; // Security scan results
}

/**
 * Complete Document Workspace State
 */
export interface DocumentWorkspace {
  document: StructuredDocument;
  findings: Finding[];
  overall_summary: {
    high_count: number;
    medium_count: number;
    low_count: number;
    info_count: number;
    primary_concerns: string[];
  };
}

/**
 * Raw extraction output from a format extractor before normalization
 */
export interface ExtractionResult {
  raw_text: string;
  pages: {
    page_number: number;
    text: string;
  }[];
  format: SupportedDocumentFormat;
  warnings: string[];
}

/**
 * High-level Ingestion Result
 */
export interface IngestionResult {
  success: boolean;
  document?: StructuredDocument;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * ============================================================================
 * Phase 5: Contract Comparison Domain Types
 * ============================================================================
 */

export type ComparisonStatus = 'same' | 'changed' | 'added' | 'removed' | 'ambiguous';

export type ComparisonCategory =
  | 'payment'
  | 'fees'
  | 'term'
  | 'renewal'
  | 'termination'
  | 'obligations'
  | 'liability'
  | 'indemnity'
  | 'intellectual_property'
  | 'confidentiality'
  | 'data_protection'
  | 'restrictions'
  | 'non_compete'
  | 'non_solicitation'
  | 'warranties'
  | 'dispute_resolution'
  | 'governing_law'
  | 'jurisdiction'
  | 'miscellaneous'
  | (string & {});

/**
 * Independent source reference for a contract in a comparison finding
 */
export interface ComparisonSourceReference {
  document_id: string;
  clause_id: string;
  section_id?: string;
  page_number?: number;
  exact_quote: string;
  matched_range?: {
    start: number;
    end: number;
  };
  number_label?: string;
}

/**
 * An individual finding comparing two contracts
 */
export interface ComparisonFinding {
  id: string; // e.g. "comp_001"
  status: ComparisonStatus;
  category: string;
  title: string;
  plain_english_summary: string;
  practical_implication: string;
  attention_level: AttentionLevel;
  contract_a_source?: ComparisonSourceReference;
  contract_b_source?: ComparisonSourceReference;
  confidence: number;
  verification_status: VerificationStatus;
  suggested_question_for_counsel?: string;
}

/**
 * Metadata for an executed comparison run
 */
export interface ComparisonMetadata {
  comparison_id: string;
  contract_a_metadata: DocumentMetadata;
  contract_b_metadata: DocumentMetadata;
  timestamp: string;
  provider_used: string;
  model_used: string;
  prompt_version: string;
  processing_status: 'completed' | 'failed' | 'partial';
  duration_ms: number;
  aligned_pairs_count: number;
  total_findings_count: number;
  verified_findings_count: number;
  unverified_findings_count: number;
  rejected_findings_count: number;
  disclaimer: string;
}

/**
 * Complete Grounded Contract Comparison Result
 */
export interface ComparisonResult {
  comparison_id: string;
  summary: string;
  findings: ComparisonFinding[];
  rejected_findings?: ComparisonFinding[];
  metadata: ComparisonMetadata;
  disclaimer: string;
}

/**
 * Deterministic clause-to-clause alignment between two contracts
 */
export interface AlignedClausePair {
  pair_id: string;
  alignment_type: 'ALIGNED' | 'CONTRACT_A_ONLY' | 'CONTRACT_B_ONLY';
  clause_a?: Clause;
  clause_b?: Clause;
  similarity_score: number;
  match_rationale: string;
}

export interface AlignmentResult {
  pairs: AlignedClausePair[];
  aligned_count: number;
  a_only_count: number;
  b_only_count: number;
}

