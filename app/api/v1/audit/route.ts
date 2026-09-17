import { NextRequest, NextResponse } from 'next/server';
import { StructuredDocumentSchema } from '@/lib/schemas/document.schema';
import { legalAuditService } from '@/lib/server/ai/legal-audit-service';
import { ingestRawText } from '@/lib/domain/ingestion-pipeline';
import { AppError, toSafeAppError } from '@/lib/errors/app-error';

export const runtime = 'nodejs';

/**
 * POST /api/v1/audit
 * Audits a legal document using grounded Gemini inference with independent source verification.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let structuredDoc;

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

    // Execute grounded legal audit with source verification
    const auditResult = await legalAuditService.auditDocument(structuredDoc, {
      rejectUnverified: body.reject_unverified !== false,
    });

    return NextResponse.json(auditResult, { status: 200 });
  } catch (err: unknown) {
    const safeError = toSafeAppError(err);
    return NextResponse.json(safeError.toPublicResponse(), { status: safeError.statusCode });
  }
}
