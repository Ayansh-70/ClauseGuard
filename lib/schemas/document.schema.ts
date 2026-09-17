import { z } from 'zod';

export const SupportedDocumentFormatSchema = z.enum([
  'text/plain',
  'text/markdown',
  'application/pdf',
]);

export const SupportedFileExtensionSchema = z.enum(['txt', 'md', 'pdf']);

export const TextSpanSchema = z.object({
  start_offset: z.number().int().nonnegative(),
  end_offset: z.number().int().nonnegative(),
});

export const SourceLocationSchema = z.object({
  document_id: z.string().min(1),
  page_number: z.number().int().positive().optional(),
  section_id: z.string().optional(),
  clause_id: z.string().optional(),
  span: TextSpanSchema,
  raw_line_number: z.number().int().positive().optional(),
});

export const DocumentMetadataSchema = z.object({
  document_id: z.string().min(1),
  file_name: z.string().min(1).max(255),
  file_size_bytes: z.number().int().nonnegative(),
  format: SupportedDocumentFormatSchema,
  extension: SupportedFileExtensionSchema,
  created_at: z.string().datetime(),
  sha256_hash: z.string().length(64),
  page_count: z.number().int().positive(),
  character_count: z.number().int().nonnegative(),
  word_count: z.number().int().nonnegative(),
});

export const DocumentPageSchema = z.object({
  page_number: z.number().int().positive(),
  text: z.string(),
  char_start_offset: z.number().int().nonnegative(),
  char_end_offset: z.number().int().nonnegative(),
});

export const DocumentSectionSchema = z.object({
  section_id: z.string().regex(/^sec_\d+$/),
  title: z.string().min(1),
  raw_heading: z.string(),
  level: z.number().int().min(1).max(5),
  start_offset: z.number().int().nonnegative(),
  end_offset: z.number().int().nonnegative(),
  page_number: z.number().int().positive().optional(),
});

export const ClauseSchema = z.object({
  clause_id: z.string().regex(/^clause_\d+$/),
  document_id: z.string().min(1),
  section_id: z.string().optional(),
  parent_clause_id: z.string().optional(),
  number_label: z.string().optional(),
  title: z.string().optional(),
  text: z.string().min(1),
  start_offset: z.number().int().nonnegative(),
  end_offset: z.number().int().nonnegative(),
  page_number: z.number().int().positive().optional(),
  line_number: z.number().int().positive(),
  subclause_ids: z.array(z.string()),
});

export const ChunkSchema = z.object({
  chunk_id: z.string().regex(/^chunk_\d+$/),
  document_id: z.string().min(1),
  clause_id: z.string(),
  section_id: z.string().optional(),
  page_number: z.number().int().positive().optional(),
  text: z.string().min(1),
  start_offset: z.number().int().nonnegative(),
  end_offset: z.number().int().nonnegative(),
  token_estimate: z.number().int().nonnegative(),
  sequence_index: z.number().int().nonnegative(),
});

export const SecurityStatusSchema = z.object({
  passed: z.boolean(),
  injection_patterns_detected: z.number().int().nonnegative(),
  flagged_tokens: z.array(z.string()),
  pii_redacted_count: z.number().int().nonnegative(),
  sanitized: z.boolean(),
  notes: z.array(z.string()).optional(),
});

export const StructuredDocumentSchema = z.object({
  metadata: DocumentMetadataSchema,
  canonical_text: z.string(),
  pages: z.array(DocumentPageSchema),
  sections: z.array(DocumentSectionSchema),
  clauses: z.array(ClauseSchema),
  chunks: z.array(ChunkSchema),
  security_status: SecurityStatusSchema,
});
