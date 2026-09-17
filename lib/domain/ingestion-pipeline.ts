import { createHash } from 'crypto';
import { StructuredDocument } from '@/types/domain';
import { validateFile, validateRawTextInput, ValidatedFileInput } from './file-validator';
import { extractionService } from './text-extractor';
import { normalizePages } from './text-normalizer';
import { detectDocumentSections } from './structure-detector';
import { segmentDocumentClauses } from './clause-segmenter';
import { createDeterministicChunks } from './deterministic-chunker';
import { scanForSuspiciousContent } from '../security/safe-string';
import { StructuredDocumentSchema } from '../schemas/document.schema';

/**
 * Ingestion options
 */
export interface IngestionOptions {
  documentIdOverride?: string;
}

/**
 * Executes the complete deterministic ingestion, extraction, and segmentation pipeline.
 */
export async function ingestDocument(
  input: ValidatedFileInput,
  options: IngestionOptions = {}
): Promise<StructuredDocument> {
  // 1. Content Hash & Document ID
  const sha256 = createHash('sha256').update(input.buffer).digest('hex');
  const documentId = options.documentIdOverride || `doc_${sha256.slice(0, 12)}`;

  // 2. Format-Specific Text Extraction
  const extraction = await extractionService.extract(input.buffer, input.format);

  // 3. Deterministic Text Normalization & Page Preservation
  const { canonical_text, pages } = normalizePages(extraction.pages);

  // 4. Security Inspection (Heuristic Prompt-Injection Detection)
  const securityStatus = scanForSuspiciousContent(canonical_text);

  // 5. Structural Section & Heading Detection
  const sections = detectDocumentSections(canonical_text, pages);

  // 6. Deterministic Clause Segmentation & Nesting Allocation
  const clauses = segmentDocumentClauses(documentId, canonical_text, sections, pages);

  // 7. Deterministic Chunking for Downstream Token-Bounded Processing
  const chunks = createDeterministicChunks(documentId, clauses);

  // 8. Word and Character Counts
  const characterCount = canonical_text.length;
  const wordCount = canonical_text.trim().length > 0 ? canonical_text.trim().split(/\s+/).length : 0;

  const structuredDoc: StructuredDocument = {
    metadata: {
      document_id: documentId,
      file_name: input.fileName,
      file_size_bytes: input.sizeBytes,
      format: input.format,
      extension: input.extension,
      created_at: new Date().toISOString(),
      sha256_hash: sha256,
      page_count: pages.length,
      character_count: characterCount,
      word_count: wordCount,
    },
    canonical_text,
    pages,
    sections,
    clauses,
    chunks,
    security_status: securityStatus,
  };

  // 9. Strict Zod Schema Validation at Trust Boundary
  return StructuredDocumentSchema.parse(structuredDoc);
}

/**
 * High-level helper for file upload buffers
 */
export async function ingestFileBuffer(
  fileName: string,
  buffer: Buffer,
  options?: IngestionOptions
): Promise<StructuredDocument> {
  const validated = validateFile(fileName, buffer);
  return ingestDocument(validated, options);
}

/**
 * High-level helper for direct raw text or pasted input
 */
export async function ingestRawText(
  text: string,
  documentName = 'Pasted_Agreement.txt',
  options?: IngestionOptions
): Promise<StructuredDocument> {
  const validated = validateRawTextInput(text, documentName);
  return ingestDocument(validated, options);
}
