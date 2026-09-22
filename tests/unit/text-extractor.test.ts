import { describe, it, expect } from 'vitest';
import { PdfExtractor, PlainTextExtractor, extractionService } from '@/lib/domain/text-extractor';
import { ingestFileBuffer } from '@/lib/domain/ingestion-pipeline';
import { AppError } from '@/lib/errors/app-error';

function createSamplePdfBuffer(text: string): Buffer {
  const stream = `BT /F1 12 Tf 100 700 Td (${text}) Tj ET`;
  const pdfString = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length ${stream.length} >> stream
${stream}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000212 00000 n 
trailer << /Root 1 0 R /Size 5 >>
startxref
${270 + stream.length}
%%EOF`;
  return Buffer.from(pdfString, 'utf-8');
}

describe('Text Extractor & PdfExtractor (Serverless Native)', () => {
  const pdfExtractor = new PdfExtractor();
  const plainTextExtractor = new PlainTextExtractor();

  it('supports application/pdf format', () => {
    expect(pdfExtractor.supports('application/pdf')).toBe(true);
    expect(pdfExtractor.supports('text/plain')).toBe(false);
  });

  it('supports text/plain and text/markdown format', () => {
    expect(plainTextExtractor.supports('text/plain')).toBe(true);
    expect(plainTextExtractor.supports('text/markdown')).toBe(true);
    expect(plainTextExtractor.supports('application/pdf')).toBe(false);
  });

  it('successfully extracts text from a PDF without DOMMatrix errors', async () => {
    const pdfBuf = createSamplePdfBuffer('Confidential Non-Disclosure Agreement');
    const result = await pdfExtractor.extract(pdfBuf, 'application/pdf');

    expect(result.raw_text).toContain('Confidential Non-Disclosure Agreement');
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].page_number).toBe(1);
    expect(result.pages[0].text).toContain('Confidential Non-Disclosure Agreement');
    expect(result.format).toBe('application/pdf');
  });

  it('ingests a PDF buffer through the end-to-end ingestion pipeline', async () => {
    const pdfBuf = createSamplePdfBuffer('ARTICLE 1: DEFINITIONS. Confidential Information shall mean all non-public data.');
    const structuredDoc = await ingestFileBuffer('agreement.pdf', pdfBuf);

    expect(structuredDoc.metadata.file_name).toBe('agreement.pdf');
    expect(structuredDoc.metadata.format).toBe('application/pdf');
    expect(structuredDoc.metadata.page_count).toBeGreaterThanOrEqual(1);
    expect(structuredDoc.canonical_text).toContain('ARTICLE 1: DEFINITIONS');
    expect(structuredDoc.clauses.length).toBeGreaterThan(0);
  });

  it('throws AppError for corrupt or unreadable PDF content', async () => {
    const corruptBuffer = Buffer.from('NOT_A_VALID_PDF_STREAM', 'utf-8');

    await expect(pdfExtractor.extract(corruptBuffer, 'application/pdf')).rejects.toThrow(AppError);
  });

  it('delegates properly via extractionService', async () => {
    const pdfBuf = createSamplePdfBuffer('Commercial Services Contract');
    const result = await extractionService.extract(pdfBuf, 'application/pdf');

    expect(result.raw_text).toContain('Commercial Services Contract');
  });
});
