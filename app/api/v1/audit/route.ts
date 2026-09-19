import { NextRequest, NextResponse } from 'next/server';
import { StructuredDocumentSchema } from '@/lib/schemas/document.schema';
import { legalAuditService } from '@/lib/server/ai/legal-audit-service';
import { ingestRawText, ingestFileBuffer } from '@/lib/domain/ingestion-pipeline';
import { AppError, toSafeAppError } from '@/lib/errors/app-error';
import { reportStore } from '@/lib/server/report-store';

export const runtime = 'nodejs';

/**
 * POST /api/v1/audit
 * Audits a legal document using grounded Gemini inference with independent source verification.
 * Accepts:
 * - multipart/form-data with 'file' (PDF, TXT, MD)
 * - application/json with 'raw_text' string
 * - application/json with pre-structured 'document' (StructuredDocument)
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let structuredDoc;
    let rejectUnverified = true;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const rawText = formData.get('raw_text') as string | null;

      if (formData.get('reject_unverified') === 'false') {
        rejectUnverified = false;
      }

      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        structuredDoc = await ingestFileBuffer(file.name, buffer);
      } else if (rawText && typeof rawText === 'string' && rawText.trim().length > 0) {
        const fileName = (formData.get('file_name') as string) || 'Uploaded_Contract.txt';
        structuredDoc = await ingestRawText(rawText, fileName);
      } else {
        throw new AppError(
          'INVALID_PAYLOAD',
          'Multipart form data must include a valid "file" or non-empty "raw_text".',
          400
        );
      }
    } else {
      const body = await req.json();

      if (body.reject_unverified === false) {
        rejectUnverified = false;
      }

      if (body.document) {
        // Validate provided StructuredDocument against Zod schema
        const parsedDoc = StructuredDocumentSchema.safeParse(body.document);
        if (!parsedDoc.success) {
          throw new AppError(
            'INVALID_PAYLOAD',
            'Supplied document structure failed schema validation.',
            400,
            true,
            parsedDoc.error.format()
          );
        }
        structuredDoc = parsedDoc.data;
      } else if (typeof body.raw_text === 'string') {
        // Ingest raw text deterministically through Phase 2 pipeline first
        structuredDoc = await ingestRawText(body.raw_text, body.file_name || 'Uploaded_Agreement.txt');
      } else {
        throw new AppError(
          'INVALID_PAYLOAD',
          'Request must include either a "document" (StructuredDocument) or "raw_text" string.',
          400
        );
      }
    }

    // Execute grounded legal audit with source verification
    const auditResult = await legalAuditService.auditDocument(structuredDoc, {
      rejectUnverified,
    });

    // Cache verified audit result and structured document in server-side report store
    reportStore.saveAuditResult(auditResult);
    reportStore.saveDocument(structuredDoc);

    return NextResponse.json(auditResult, { status: 200 });
  } catch (err: unknown) {
    const safeError = toSafeAppError(err);
    return NextResponse.json(safeError.toPublicResponse(), { status: safeError.statusCode });
  }
}
