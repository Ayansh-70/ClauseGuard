import { NextRequest, NextResponse } from 'next/server';
import { StructuredDocumentSchema } from '@/lib/schemas/document.schema';
import { comparisonService } from '@/lib/server/ai/comparison-service';
import { ingestRawText, ingestFileBuffer } from '@/lib/domain/ingestion-pipeline';
import { AppError, toSafeAppError } from '@/lib/errors/app-error';
import { StructuredDocument } from '@/types/domain';
import { reportStore } from '@/lib/server/report-store';

export const runtime = 'nodejs';

/**
 * POST /api/v1/compare
 * Compares two contracts using deterministic clause alignment, Gemini semantic comparison,
 * and dual source quote verification.
 * Accepts:
 * - multipart/form-data: (file_a & file_b) OR (raw_text_a & raw_text_b)
 * - application/json:
 *   {
 *     contract_a: { raw_text?: string, file_name?: string, document?: StructuredDocument },
 *     contract_b: { raw_text?: string, file_name?: string, document?: StructuredDocument },
 *     reject_unverified?: boolean
 *   }
 *   OR
 *   { raw_text_a, raw_text_b, file_name_a?, file_name_b?, reject_unverified? }
 *   OR
 *   { document_a, document_b, reject_unverified? }
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let docA: StructuredDocument;
    let docB: StructuredDocument;
    let rejectUnverified = true;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      if (formData.get('reject_unverified') === 'false') {
        rejectUnverified = false;
      }

      const fileA = (formData.get('file_a') || formData.get('file1')) as File | null;
      const fileB = (formData.get('file_b') || formData.get('file2')) as File | null;
      const rawA = (formData.get('raw_text_a') || formData.get('text_a')) as string | null;
      const rawB = (formData.get('raw_text_b') || formData.get('text_b')) as string | null;

      // Ingest Contract A
      if (fileA && fileA.size > 0) {
        const bufA = Buffer.from(await fileA.arrayBuffer());
        docA = await ingestFileBuffer(fileA.name, bufA);
      } else if (rawA && typeof rawA === 'string' && rawA.trim().length > 0) {
        const nameA = (formData.get('file_name_a') as string) || 'Contract_A.txt';
        docA = await ingestRawText(rawA, nameA);
      } else {
        throw new AppError(
          'INVALID_PAYLOAD',
          'Multipart form data requires Contract A as "file_a" or non-empty "raw_text_a".',
          400
        );
      }

      // Ingest Contract B
      if (fileB && fileB.size > 0) {
        const bufB = Buffer.from(await fileB.arrayBuffer());
        docB = await ingestFileBuffer(fileB.name, bufB);
      } else if (rawB && typeof rawB === 'string' && rawB.trim().length > 0) {
        const nameB = (formData.get('file_name_b') as string) || 'Contract_B.txt';
        docB = await ingestRawText(rawB, nameB);
      } else {
        throw new AppError(
          'INVALID_PAYLOAD',
          'Multipart form data requires Contract B as "file_b" or non-empty "raw_text_b".',
          400
        );
      }
    } else {
      const body = await req.json();

      if (body.reject_unverified === false) {
        rejectUnverified = false;
      }

      // Extract Contract A representation
      if (body.document_a) {
        const parsed = StructuredDocumentSchema.safeParse(body.document_a);
        if (!parsed.success) {
          throw new AppError('INVALID_PAYLOAD', 'Contract A failed document schema validation.', 400, true, parsed.error.format());
        }
        docA = parsed.data;
      } else if (body.contract_a?.document) {
        const parsed = StructuredDocumentSchema.safeParse(body.contract_a.document);
        if (!parsed.success) {
          throw new AppError('INVALID_PAYLOAD', 'Contract A failed document schema validation.', 400, true, parsed.error.format());
        }
        docA = parsed.data;
      } else if (typeof body.contract_a?.raw_text === 'string' && body.contract_a.raw_text.trim().length > 0) {
        docA = await ingestRawText(body.contract_a.raw_text, body.contract_a.file_name || 'Contract_A.txt');
      } else if (typeof body.raw_text_a === 'string' && body.raw_text_a.trim().length > 0) {
        docA = await ingestRawText(body.raw_text_a, body.file_name_a || 'Contract_A.txt');
      } else {
        throw new AppError('INVALID_PAYLOAD', 'Request must include Contract A (raw_text_a or document_a).', 400);
      }

      // Extract Contract B representation
      if (body.document_b) {
        const parsed = StructuredDocumentSchema.safeParse(body.document_b);
        if (!parsed.success) {
          throw new AppError('INVALID_PAYLOAD', 'Contract B failed document schema validation.', 400, true, parsed.error.format());
        }
        docB = parsed.data;
      } else if (body.contract_b?.document) {
        const parsed = StructuredDocumentSchema.safeParse(body.contract_b.document);
        if (!parsed.success) {
          throw new AppError('INVALID_PAYLOAD', 'Contract B failed document schema validation.', 400, true, parsed.error.format());
        }
        docB = parsed.data;
      } else if (typeof body.contract_b?.raw_text === 'string' && body.contract_b.raw_text.trim().length > 0) {
        docB = await ingestRawText(body.contract_b.raw_text, body.contract_b.file_name || 'Contract_B.txt');
      } else if (typeof body.raw_text_b === 'string' && body.raw_text_b.trim().length > 0) {
        docB = await ingestRawText(body.raw_text_b, body.file_name_b || 'Contract_B.txt');
      } else {
        throw new AppError('INVALID_PAYLOAD', 'Request must include Contract B (raw_text_b or document_b).', 400);
      }
    }

    // Execute Grounded Contract Comparison
    const comparisonResult = await comparisonService.compareDocuments(docA, docB, {
      rejectUnverified,
    });

    // Cache verified comparison result and structured documents in server-side report store
    reportStore.saveComparisonResult(comparisonResult);
    reportStore.saveDocument(docA);
    reportStore.saveDocument(docB);

    return NextResponse.json(comparisonResult, { status: 200 });
  } catch (err: unknown) {
    const safeError = toSafeAppError(err);
    return NextResponse.json(safeError.toPublicResponse(), { status: safeError.statusCode });
  }
}
