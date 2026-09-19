import { NextRequest, NextResponse } from 'next/server';
import { reportStore, isValidReportId } from '@/lib/server/report-store';
import {
  generateComparisonHtmlReport,
  generateComparisonMarkdownReport,
} from '@/lib/server/reports/comparison-report-generator';
import { AppError, toSafeAppError } from '@/lib/errors/app-error';

export const runtime = 'nodejs';

/**
 * Sanitizes a filename for Content-Disposition header.
 */
function sanitizeFileNameForHeader(raw: string | undefined): string {
  if (!raw) return 'comparison';
  return raw.replace(/[^a-zA-Z0-9_\-.]/g, '_').replace(/_+/g, '_');
}

/**
 * Shared comparison report generation handler.
 */
function handleComparisonReportGeneration(id: string | null, format: string | null, download: boolean) {
  if (!id) {
    throw new AppError('INVALID_REQUEST', 'Parameter "id" or "comparison_id" is required.', 400);
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

  const comparisonResult = reportStore.getComparisonResult(trimmedId);
  if (!comparisonResult) {
    throw new AppError(
      'REPORT_NOT_FOUND',
      `Comparison report for ID "${trimmedId}" was not found or has expired. Please re-run the comparison.`,
      404
    );
  }

  const nameA = sanitizeFileNameForHeader(comparisonResult.metadata?.contract_a_metadata?.file_name || 'Contract_A');
  const nameB = sanitizeFileNameForHeader(comparisonResult.metadata?.contract_b_metadata?.file_name || 'Contract_B');
  const baseName = `${nameA}_vs_${nameB}`;

  if (normalizedFormat === 'markdown' || normalizedFormat === 'md') {
    const markdown = generateComparisonMarkdownReport(comparisonResult);
    const fileName = `${baseName}_comparison_memorandum.md`;
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

  const html = generateComparisonHtmlReport(comparisonResult);
  const fileName = `${baseName}_comparison_memorandum.html`;
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
 * GET /api/v1/export/comparison-report?id=<comparison_id>&format=<html|markdown>&download=<true|false>
 */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('comparison_id');
    const format = req.nextUrl.searchParams.get('format');
    const download = req.nextUrl.searchParams.get('download') === 'true';

    return handleComparisonReportGeneration(id, format, download);
  } catch (err: unknown) {
    const safeError = toSafeAppError(err);
    return NextResponse.json(safeError.toPublicResponse(), { status: safeError.statusCode });
  }
}

/**
 * POST /api/v1/export/comparison-report
 * Body: { id?: string, comparison_id?: string, format?: 'html' | 'markdown', download?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = body.id || body.comparison_id || null;
    const format = body.format || null;
    const download = Boolean(body.download);

    return handleComparisonReportGeneration(id, format, download);
  } catch (err: unknown) {
    const safeError = toSafeAppError(err);
    return NextResponse.json(safeError.toPublicResponse(), { status: safeError.statusCode });
  }
}
