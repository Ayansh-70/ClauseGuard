import { NextRequest, NextResponse } from 'next/server';
import { reportStore, isValidReportId } from '@/lib/server/report-store';
import { resolveEvidence } from '@/lib/domain/evidence-resolver';
import { AppError, toSafeAppError } from '@/lib/errors/app-error';

export const runtime = 'nodejs';

/**
 * GET /api/v1/evidence
 * Retrieves grounded source clause context, surrounding document text, and optional quote alignment.
 * Query params:
 * - document_id: string (required)
 * - clause_id: string (required)
 * - quote: string (optional)
 * - radius: number (optional, default 400, max 2000)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('document_id') || searchParams.get('id');
    const clauseId = searchParams.get('clause_id');
    const quote = searchParams.get('quote') || undefined;
    const radiusParam = searchParams.get('radius');
    const radius = radiusParam ? parseInt(radiusParam, 10) : 400;

    if (!documentId) {
      throw new AppError('INVALID_REQUEST', 'Parameter "document_id" is required.', 400);
    }
    if (!clauseId) {
      throw new AppError('INVALID_REQUEST', 'Parameter "clause_id" is required.', 400);
    }

    const trimmedDocId = documentId.trim();
    if (!isValidReportId(trimmedDocId)) {
      throw new AppError('INVALID_REQUEST', 'Invalid document_id format.', 400);
    }

    const trimmedClauseId = clauseId.trim();
    if (!isValidReportId(trimmedClauseId)) {
      throw new AppError('INVALID_REQUEST', 'Invalid clause_id format.', 400);
    }

    const safeRadius = isNaN(radius) ? 400 : Math.max(0, Math.min(2000, radius));

    const context = reportStore.getClauseContext(trimmedDocId, trimmedClauseId, safeRadius);
    if (!context) {
      const doc = reportStore.getDocument(trimmedDocId);
      if (!doc) {
        throw new AppError(
          'DOCUMENT_NOT_FOUND',
          `Document with ID "${trimmedDocId}" was not found or has expired. Please re-run analysis.`,
          404
        );
      }
      throw new AppError(
        'CLAUSE_NOT_FOUND',
        `Clause with ID "${trimmedClauseId}" was not found in document "${trimmedDocId}".`,
        404
      );
    }

    let resolvedEvidence;
    if (quote) {
      resolvedEvidence = resolveEvidence({
        clauseText: context.clause.text,
        clauseStartOffset: context.clause.start_offset,
        quote,
        surroundingBefore: context.surrounding_context.before_text,
        surroundingAfter: context.surrounding_context.after_text,
      });
    }

    return NextResponse.json(
      {
        ...context,
        resolved_evidence: resolvedEvidence,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (err: unknown) {
    const safeError = toSafeAppError(err);
    return NextResponse.json(safeError.toPublicResponse(), { status: safeError.statusCode });
  }
}
