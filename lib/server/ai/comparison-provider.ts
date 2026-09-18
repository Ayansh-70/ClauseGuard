import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';
import { serverEnv } from '../env';
import { AppError } from '@/lib/errors/app-error';
import { ComparisonContext } from './comparison-context-builder';
import { COMPARISON_SYSTEM_INSTRUCTION, buildComparisonPrompt } from './comparison-prompts';
import {
  RawGeminiComparisonOutput,
  RawGeminiComparisonOutputSchema,
  RawGeminiComparisonFinding,
} from '@/lib/schemas/comparison.schema';
import { AttentionLevel } from '@/types/domain';

export interface ComparisonProvider {
  compareContracts(context: ComparisonContext): Promise<RawGeminiComparisonOutput>;
}

/**
 * Official Google Gemini AI Provider for contract comparison using structured JSON output.
 */
export class GoogleGeminiComparisonProvider implements ComparisonProvider {
  private client: GoogleGenAI | null = null;
  private modelName: string;
  private timeoutMs: number;

  constructor(apiKey?: string, modelName?: string, timeoutMs?: number) {
    const key = apiKey || serverEnv.GEMINI_API_KEY;
    this.modelName = modelName || serverEnv.GEMINI_MODEL || 'gemini-2.5-flash';
    this.timeoutMs = timeoutMs || serverEnv.GEMINI_TIMEOUT_MS || 35000;

    if (key) {
      this.client = new GoogleGenAI({ apiKey: key });
    }
  }

  async compareContracts(context: ComparisonContext): Promise<RawGeminiComparisonOutput> {
    if (!this.client) {
      throw new AppError(
        'AI_PROVIDER_ERROR',
        'Gemini API key is not configured. Set GEMINI_API_KEY in your server environment.',
        500,
        true
      );
    }

    const userPrompt = buildComparisonPrompt(context);

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.STRING,
          description: 'Concise 2-3 sentence overview of substantive variances between Contract A and Contract B.',
        },
        findings: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'Unique finding ID, e.g. comp_001' },
              status: {
                type: Type.STRING,
                description: 'Comparison status: same, changed, added, removed, or ambiguous',
              },
              category: {
                type: Type.STRING,
                description: 'Legal/commercial category (indemnity, liability, payment, termination, etc.)',
              },
              title: { type: Type.STRING, description: 'Descriptive title of the variance' },
              plain_english_summary: {
                type: Type.STRING,
                description: 'Plain-language explanation of the difference at an 8th-grade reading level',
              },
              practical_implication: {
                type: Type.STRING,
                description: 'Practical business and legal consequence of the difference',
              },
              attention_level: {
                type: Type.STRING,
                description: 'HIGH_ATTENTION, MEDIUM_ATTENTION, LOW_ATTENTION, INFORMATIONAL, or STANDARD_NOTICE',
              },
              contract_a_clause_id: {
                type: Type.STRING,
                description: 'Referenced clause ID in Contract A (e.g. clause_001)',
              },
              contract_a_quote: {
                type: Type.STRING,
                description: 'Exact verbatim excerpt from Contract A clause',
              },
              contract_b_clause_id: {
                type: Type.STRING,
                description: 'Referenced clause ID in Contract B (e.g. clause_002)',
              },
              contract_b_quote: {
                type: Type.STRING,
                description: 'Exact verbatim excerpt from Contract B clause',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Confidence in accuracy of comparison (0.0 to 1.0)',
              },
              suggested_question_for_counsel: {
                type: Type.STRING,
                description: 'Targeted question to consult legal counsel about regarding this difference',
              },
            },
            required: [
              'id',
              'status',
              'category',
              'title',
              'plain_english_summary',
              'practical_implication',
              'attention_level',
            ],
          },
        },
      },
      required: ['summary', 'findings'],
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new AppError(
            'AI_TIMEOUT',
            `AI comparison request timed out after ${this.timeoutMs}ms.`,
            504
          )
        );
      }, this.timeoutMs);
    });

    const apiPromise = (async () => {
      try {
        const response = await this.client!.models.generateContent({
          model: this.modelName,
          contents: userPrompt,
          config: {
            systemInstruction: COMPARISON_SYSTEM_INSTRUCTION,
            temperature: 0.0,
            responseMimeType: 'application/json',
            responseSchema,
          },
        });

        const rawText = response.text || '{}';
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(rawText);
        } catch (jsonErr) {
          throw new AppError(
            'SCHEMA_VALIDATION_FAILED',
            'AI comparison provider returned unparseable JSON output.',
            422,
            true,
            jsonErr
          );
        }

        const validated = RawGeminiComparisonOutputSchema.safeParse(parsedJson);
        if (!validated.success) {
          throw new AppError(
            'SCHEMA_VALIDATION_FAILED',
            'AI comparison response failed structural schema validation.',
            422,
            true,
            validated.error.format()
          );
        }

        return validated.data;
      } catch (err: unknown) {
        if (err instanceof AppError) throw err;
        throw new AppError(
          'AI_PROVIDER_ERROR',
          `Gemini comparison API request failed: ${err instanceof Error ? err.message : 'Unknown provider error'}`,
          502,
          true
        );
      }
    })();

    return Promise.race([apiPromise, timeoutPromise]);
  }
}

/**
 * Deterministic Mock Comparison Provider for testing without external Gemini API keys.
 * Dynamically extracts actual clause quotes from the pre-aligned comparison context.
 */
export class MockComparisonProvider implements ComparisonProvider {
  private mockResponse: RawGeminiComparisonOutput | null = null;
  private shouldTimeout = false;
  private shouldFail = false;
  private errorMessage = 'Mocked comparison provider failure';

  constructor(options?: {
    mockResponse?: RawGeminiComparisonOutput;
    shouldTimeout?: boolean;
    shouldFail?: boolean;
    errorMessage?: string;
  }) {
    if (options?.mockResponse) this.mockResponse = options.mockResponse;
    if (options?.shouldTimeout) this.shouldTimeout = options.shouldTimeout;
    if (options?.shouldFail) this.shouldFail = options.shouldFail;
    if (options?.errorMessage) this.errorMessage = options.errorMessage;
  }

  setMockResponse(response: RawGeminiComparisonOutput) {
    this.mockResponse = response;
  }

  async compareContracts(context: ComparisonContext): Promise<RawGeminiComparisonOutput> {
    if (this.shouldTimeout) {
      throw new AppError('AI_TIMEOUT', 'AI comparison request timed out after 35000ms.', 504);
    }
    if (this.shouldFail) {
      throw new AppError('AI_PROVIDER_ERROR', this.errorMessage, 502);
    }

    if (this.mockResponse) {
      return this.mockResponse;
    }

    // Dynamic generation from aligned pairs
    const findings: RawGeminiComparisonFinding[] = [];
    let findingIdx = 1;

    for (const pair of context.alignment.pairs) {
      if (pair.alignment_type === 'ALIGNED' && pair.clause_a && pair.clause_b) {
        const textA = pair.clause_a.text.trim();
        const textB = pair.clause_b.text.trim();

        // Extract first sentence or first 100 chars
        const quoteA = (textA.match(/^([^.?!]+[.?!])/)?.[1] || textA.slice(0, 100)).trim();
        const quoteB = (textB.match(/^([^.?!]+[.?!])/)?.[1] || textB.slice(0, 100)).trim();

        const isIdentical = textA.toLowerCase() === textB.toLowerCase();
        const status = isIdentical ? 'same' : 'changed';

        const category = detectCategory(textA + ' ' + textB);
        const attentionLevel: AttentionLevel = isIdentical
          ? 'INFORMATIONAL'
          : category === 'indemnity' || category === 'liability'
          ? 'HIGH_ATTENTION'
          : 'MEDIUM_ATTENTION';

        findings.push({
          id: `comp_${String(findingIdx++).padStart(3, '0')}`,
          status,
          category,
          title: isIdentical
            ? `Substantially Identical Terms in ${category}`
            : `Modified ${category} Terms`,
          plain_english_summary: isIdentical
            ? `Both contracts contain equivalent provisions governing ${category}.`
            : `Contract B alters the wording and obligations for ${category} compared to Contract A.`,
          practical_implication: isIdentical
            ? 'No substantive commercial shift observed between the two versions.'
            : 'Changes the balance of risk or execution expectations between the parties.',
          attention_level: attentionLevel,
          contract_a_clause_id: pair.clause_a.clause_id,
          contract_a_quote: quoteA,
          contract_b_clause_id: pair.clause_b.clause_id,
          contract_b_quote: quoteB,
          confidence: 0.95,
          suggested_question_for_counsel: isIdentical
            ? undefined
            : `Does the revision in Contract B alter our rights or financial liabilities regarding ${category}?`,
        });
      } else if (pair.alignment_type === 'CONTRACT_A_ONLY' && pair.clause_a) {
        const textA = pair.clause_a.text.trim();
        const quoteA = (textA.match(/^([^.?!]+[.?!])/)?.[1] || textA.slice(0, 100)).trim();
        const category = detectCategory(textA);

        findings.push({
          id: `comp_${String(findingIdx++).padStart(3, '0')}`,
          status: 'removed',
          category,
          title: `Omitted Provision in Contract B (${category})`,
          plain_english_summary: `Contract A contains a provision regarding ${category} that is entirely omitted in Contract B.`,
          practical_implication: 'Removal of this clause may strip protections or obligations present in the baseline draft.',
          attention_level: 'HIGH_ATTENTION',
          contract_a_clause_id: pair.clause_a.clause_id,
          contract_a_quote: quoteA,
          confidence: 0.9,
          suggested_question_for_counsel: `Should we request reinstatement of this ${category} clause in Contract B?`,
        });
      } else if (pair.alignment_type === 'CONTRACT_B_ONLY' && pair.clause_b) {
        const textB = pair.clause_b.text.trim();
        const quoteB = (textB.match(/^([^.?!]+[.?!])/)?.[1] || textB.slice(0, 100)).trim();
        const category = detectCategory(textB);

        findings.push({
          id: `comp_${String(findingIdx++).padStart(3, '0')}`,
          status: 'added',
          category,
          title: `New Provision Introduced in Contract B (${category})`,
          plain_english_summary: `Contract B introduces a new provision regarding ${category} not found in Contract A.`,
          practical_implication: 'Introduces new legal exposure or affirmative covenants not contemplated in the baseline.',
          attention_level: 'HIGH_ATTENTION',
          contract_b_clause_id: pair.clause_b.clause_id,
          contract_b_quote: quoteB,
          confidence: 0.9,
          suggested_question_for_counsel: `Is this newly added ${category} term acceptable or does it need to be stricken?`,
        });
      }

      if (findings.length >= 10) break;
    }

    return {
      summary: `Automated comparative audit completed between ${context.file_name_a} and ${context.file_name_b}. Evaluated ${context.aligned_pairs_count} aligned clauses.`,
      findings,
    };
  }
}

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('indemnif')) return 'indemnity';
  if (lower.includes('liab') || lower.includes('damage')) return 'liability';
  if (lower.includes('terminat') || lower.includes('cancel')) return 'termination';
  if (lower.includes('pay') || lower.includes('fee') || lower.includes('invoic')) return 'payment';
  if (lower.includes('confiden') || lower.includes('secret')) return 'confidentiality';
  if (lower.includes('intellect') || lower.includes('patent') || lower.includes('copyright')) return 'intellectual_property';
  if (lower.includes('warrant')) return 'warranties';
  if (lower.includes('law') || lower.includes('jurisdict')) return 'governing_law';
  return 'obligations';
}
