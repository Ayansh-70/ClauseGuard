import { AppError } from '../errors/app-error';
import { ExtractionResult, SupportedDocumentFormat } from '@/types/domain';
import { sanitizeControlCharacters } from '../security/safe-string';

export interface TextExtractor {
  supports(format: SupportedDocumentFormat): boolean;
  extract(buffer: Buffer, format: SupportedDocumentFormat): Promise<ExtractionResult>;
}

export class PlainTextExtractor implements TextExtractor {
  supports(format: SupportedDocumentFormat): boolean {
    return format === 'text/plain' || format === 'text/markdown';
  }

  async extract(buffer: Buffer, format: SupportedDocumentFormat): Promise<ExtractionResult> {
    const rawText = buffer.toString('utf-8');
    const sanitized = sanitizeControlCharacters(rawText);

    if (sanitized.trim().length === 0) {
      throw new AppError('INPUT_EMPTY', 'Extracted document content contains no readable text.', 400);
    }

    return {
      raw_text: sanitized,
      pages: [
        {
          page_number: 1,
          text: sanitized,
        },
      ],
      format,
      warnings: [],
    };
  }
}

export class PdfExtractor implements TextExtractor {
  supports(format: SupportedDocumentFormat): boolean {
    return format === 'application/pdf';
  }

  async extract(buffer: Buffer, format: SupportedDocumentFormat): Promise<ExtractionResult> {
    try {
      // Dynamic import ensures unpdf stays server-side
      const { getDocumentProxy, extractText } = await import('unpdf');

      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { totalPages, text } = await extractText(pdf, { mergePages: false });

      const pageTexts = Array.isArray(text) ? text : [text];
      const pagesList: { page_number: number; text: string }[] = [];

      for (let i = 0; i < pageTexts.length; i++) {
        const cleanText = sanitizeControlCharacters(pageTexts[i] || '').trim();
        pagesList.push({
          page_number: i + 1,
          text: cleanText,
        });
      }

      const combinedText = pagesList.map((p) => p.text).filter(Boolean).join('\n\n').trim();

      if (combinedText.length === 0) {
        throw new AppError(
          'PDF_EXTRACTION_FAILED',
          'PDF extraction yielded empty text. The file may be scanned images or password protected.',
          422
        );
      }

      return {
        raw_text: combinedText,
        pages: pagesList.length > 0 ? pagesList : [{ page_number: 1, text: combinedText }],
        format,
        warnings: totalPages > 1 ? [] : ['Single-page document extracted.'],
      };
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(
        'PDF_EXTRACTION_FAILED',
        `Failed to extract text from PDF: ${err instanceof Error ? err.message : 'Corrupt binary structure'}`,
        422,
        true,
        err
      );
    }
  }
}

/**
 * Composite extractor factory
 */
export class DocumentExtractionService {
  private extractors: TextExtractor[] = [new PlainTextExtractor(), new PdfExtractor()];

  async extract(buffer: Buffer, format: SupportedDocumentFormat): Promise<ExtractionResult> {
    const extractor = this.extractors.find((e) => e.supports(format));
    if (!extractor) {
      throw new AppError('UNSUPPORTED_FORMAT', `No extractor registered for format: ${format}`, 415);
    }
    return extractor.extract(buffer, format);
  }
}

export const extractionService = new DocumentExtractionService();
