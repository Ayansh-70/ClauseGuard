import { NextRequest, NextResponse } from 'next/server';
import { reportStore, isValidReportId } from '@/lib/server/report-store';
import { generateAuditHtmlReport, generateAuditMarkdownReport } from '@/lib/server/reports/audit-report-generator';
import { AppError, toSafeAppError } from '@/lib/errors/app-error';

export const runtime = 'nodejs';

/**
 * Sanitizes a filename for Content-Disposition header.
 */
function sanitizeFileNameForHeader(raw: string | undefined): string {
  if (!raw) return 'document';
  return raw.replace(/[^a-zA-Z0-9_\-.]/g, '_').replace(/_+/g, '_');
}

/**
 * Shared report generation handler.
 */
function handleReportGeneration(id: string | null, format: string | null, download: boolean) {
  if (!id) {
    throw new AppError('INVALID_REQUEST', 'Parameter "id" or "document_id" is required.', 400);
  }

  const trimmedId = id.trim();
  if (!isValidReportId(trimmedId)) {
    throw new AppError(
      'INVALID_REQUEST',
      'Invalid report ID format. Must be alphanumeric with underscores, hyphens, or dots (3-100 chars).',
      400
    );
  }

  const normalizedFormat = (format || 'html').toLowerCase().trim();
  if (!['html', 'markdown', 'md'].includes(normalizedFormat)) {
    throw new AppError('INVALID_REQUEST', 'Parameter "format" must be either "html" or "markdown".', 400);
  }

  const auditResult = reportStore.getAuditResult(trimmedId);
  if (!auditResult) {
    throw new AppError(
      'REPORT_NOT_FOUND',
      `Audit report for document ID "${trimmedId}" was not found or has expired. Please re-run the audit.`,
      404
    );
  }

  const baseName = sanitizeFileNameForHeader(auditResult.metadata?.file_name);

  if (normalizedFormat === 'markdown' || normalizedFormat === 'md') {
    const markdown = generateAuditMarkdownReport(auditResult);
    const fileName = `${baseName}_audit_memorandum.md`;
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': download ? `attachment; filename="${fileName}"` : `inline; filename="${fileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  }

  const html = generateAuditHtmlReport(auditResult);
  const fileName = `${baseName}_audit_memorandum.html`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': download ? `attachment; filename="${fileName}"` : `inline; filename="${fileName}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    },
  });
}

/**
 * GET /api/v1/export/report?id=<document_id>&format=<html|markdown>&download=<true|false>
 */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('document_id');
    const format = req.nextUrl.searchParams.get('format');
    const download = req.nextUrl.searchParams.get('download') === 'true';

    return handleReportGeneration(id, format, download);
  } catch (err: unknown) {
    const safeError = toSafeAppError(err);
    return NextResponse.json(safeError.toPublicResponse(), { status: safeError.statusCode });
  }
}

/**
 * POST /api/v1/export/report
 * Body: { id?: string, document_id?: string, format?: 'html' | 'markdown', download?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = body.id || body.document_id || null;
    const format = body.format || null;
    const download = Boolean(body.download);

    return handleReportGeneration(id, format, download);
  } catch (err: unknown) {
    const safeError = toSafeAppError(err);
    return NextResponse.json(safeError.toPublicResponse(), { status: safeError.statusCode });
  }
}
