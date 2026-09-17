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
      // Dynamic require ensures pdf-parse stays server-side
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdf = require('pdf-parse');

      const pagesList: { page_number: number; text: string }[] = [];
      let currentPage = 1;

      // Custom page renderer to capture page-by-page text content
      const options = {
        pagerender: function (pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) {
          return pageData.getTextContent().then((textContent: { items: Array<{ str: string }> }) => {
            let pageText = '';
            for (const item of textContent.items) {
              pageText += item.str + ' ';
            }
            const cleanText = sanitizeControlCharacters(pageText).trim();
            pagesList.push({
              page_number: currentPage++,
              text: cleanText,
            });
            return cleanText;
          });
        },
      };

      const data = await pdf(buffer, options);
      const combinedText = sanitizeControlCharacters(data.text || '');

      if (combinedText.trim().length === 0) {
        throw new AppError(
          'PDF_EXTRACTION_FAILED',
          'PDF extraction yielded empty text. The file may be scanned images or password protected.',
          422
        );
      }

      // If per-page collection was empty, fallback to total text on page 1
      const finalPages =
        pagesList.length > 0
          ? pagesList
          : [
              {
                page_number: 1,
                text: combinedText,
              },
            ];

      return {
        raw_text: combinedText,
        pages: finalPages,
        format,
        warnings: data.numpages > 1 ? [] : ['Single-page document extracted.'],
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
