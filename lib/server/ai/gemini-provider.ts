import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';
import { serverEnv } from '../env';
import { AppError } from '@/lib/errors/app-error';
import { AuditContext } from './context-builder';
import { AUDIT_SYSTEM_INSTRUCTION, buildAuditPrompt } from './audit-prompts';
import {
  RawGeminiAuditOutput,
  RawGeminiAuditOutputSchema,
} from '@/lib/schemas/finding.schema';

export interface AIProvider {
  generateAudit(context: AuditContext): Promise<RawGeminiAuditOutput>;
}

/**
 * Official Google Gemini AI Provider implementing structured JSON outputs.
 */
export class GoogleGeminiProvider implements AIProvider {
  private client: GoogleGenAI | null = null;
  private modelName: string;
  private timeoutMs: number;

  constructor(apiKey?: string, modelName?: string, timeoutMs?: number) {
    const key = apiKey || serverEnv.GEMINI_API_KEY;
    this.modelName = modelName || serverEnv.GEMINI_MODEL || 'gemini-2.5-flash';
    this.timeoutMs = timeoutMs || serverEnv.GEMINI_TIMEOUT_MS || 30000;

    if (key) {
      this.client = new GoogleGenAI({ apiKey: key });
    }
  }

  async generateAudit(context: AuditContext): Promise<RawGeminiAuditOutput> {
    if (!this.client) {
      throw new AppError(
        'AI_PROVIDER_ERROR',
        'Gemini API key is not configured. Set GEMINI_API_KEY in your server environment.',
        500,
        true
      );
    }

    const userPrompt = buildAuditPrompt(context);

    // Enforce strict response schema using @google/genai Types
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.STRING,
          description: 'High-level 2-3 sentence executive summary of key contractual findings.',
        },
        primary_concerns: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Bullet list of top commercial concerns or material risk areas.',
        },
        findings: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              finding_id: {
                type: Type.STRING,
                description: 'Unique finding ID, e.g. find_001, find_002',
              },
              clause_id: {
                type: Type.STRING,
                description: 'Primary referenced clause ID exactly as tagged, e.g. clause_001',
              },
              affected_clause_ids: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of all related clause IDs',
              },
              category: {
                type: Type.STRING,
                description:
                  'Contract category (PAYMENT_TERMS, LIABILITY_LIMITS, INDEMNIFICATION, INTELLECTUAL_PROPERTY, TERMINATION_RIGHTS, CONFIDENTIALITY, RESTRICTIONS_NON_COMPETE, GOVERNING_LAW_DISPUTES, MATERIAL_OBLIGATIONS)',
              },
              attention_level: {
                type: Type.STRING,
                description: 'Attention tier: HIGH_ATTENTION, MEDIUM_ATTENTION, LOW_ATTENTION, INFORMATIONAL',
              },
              title: {
                type: Type.STRING,
                description: 'Short descriptive title of the finding',
              },
              verbatim_quote: {
                type: Type.STRING,
                description: 'Exact verbatim excerpt from the referenced clause text supporting this finding',
              },
              plain_language_explanation: {
                type: Type.STRING,
                description: 'Plain-English explanation at an 8th-grade reading level',
              },
              why_it_matters: {
                type: Type.STRING,
                description: 'Practical business and commercial hazard of this provision',
              },
              evidence: {
                type: Type.STRING,
                description: 'Detailed analysis citing the specific language in the clause',
              },
              uncertainty: {
                type: Type.STRING,
                description: 'Any caveats, ambiguity, or missing information in the text',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Confidence in document grounding (between 0.0 and 1.0)',
              },
              suggested_question_for_counsel: {
                type: Type.STRING,
                description: 'Targeted question to ask a qualified attorney',
              },
            },
            required: [
              'finding_id',
              'clause_id',
              'category',
              'attention_level',
              'title',
              'verbatim_quote',
              'plain_language_explanation',
              'why_it_matters',
              'evidence',
              'suggested_question_for_counsel',
            ],
          },
        },
      },
      required: ['summary', 'primary_concerns', 'findings'],
    };

    // Execution with timeout guard
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new AppError('AI_TIMEOUT', `AI audit request timed out after ${this.timeoutMs}ms.`, 504));
      }, this.timeoutMs);
    });

    const apiPromise = (async () => {
      try {
        const response = await this.client!.models.generateContent({
          model: this.modelName,
          contents: userPrompt,
          config: {
            systemInstruction: AUDIT_SYSTEM_INSTRUCTION,
            temperature: 0.0, // Strict deterministic inference
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
            'AI provider returned unparseable JSON output.',
            422,
            true,
            jsonErr
          );
        }

        // Validate structure against Zod schema (Level 1 Validation)
        const validated = RawGeminiAuditOutputSchema.safeParse(parsedJson);
        if (!validated.success) {
          throw new AppError(
            'SCHEMA_VALIDATION_FAILED',
            'AI audit response failed structural schema validation.',
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
          `Gemini API request failed: ${err instanceof Error ? err.message : 'Unknown provider error'}`,
          502,
          true
        );
      }
    })();

    return Promise.race([apiPromise, timeoutPromise]);
  }
}

/**
 * Mock Gemini Provider for deterministic testing without external API calls.
 */
export class MockGeminiProvider implements AIProvider {
  private mockResponse: RawGeminiAuditOutput | null = null;
  private shouldTimeout = false;
  private shouldFail = false;
  private errorMessage = 'Mocked provider failure';

  constructor(options?: {
    mockResponse?: RawGeminiAuditOutput;
    shouldTimeout?: boolean;
    shouldFail?: boolean;
    errorMessage?: string;
  }) {
    if (options?.mockResponse) this.mockResponse = options.mockResponse;
    if (options?.shouldTimeout) this.shouldTimeout = options.shouldTimeout;
    if (options?.shouldFail) this.shouldFail = options.shouldFail;
    if (options?.errorMessage) this.errorMessage = options.errorMessage;
  }

  setMockResponse(response: RawGeminiAuditOutput) {
    this.mockResponse = response;
  }

  async generateAudit(context: AuditContext): Promise<RawGeminiAuditOutput> {
    if (this.shouldTimeout) {
      throw new AppError('AI_TIMEOUT', 'AI audit request timed out after 30000ms.', 504);
    }
    if (this.shouldFail) {
      throw new AppError('AI_PROVIDER_ERROR', this.errorMessage, 502);
    }

    if (this.mockResponse) {
      return this.mockResponse;
    }

    // Default realistic mock response grounded in standard test contract
    return {
      summary: `Automated legal audit completed for ${context.file_name}. Identified material indemnity and payment provisions.`,
      primary_concerns: [
        'Unilateral indemnification liability shifts third-party defense costs to Contractor.',
        'Extended payment timeline of Net-90 days with no interest remedies.',
      ],
      findings: [
        {
          finding_id: 'find_001',
          clause_id: 'clause_002',
          affected_clause_ids: ['clause_002'],
          category: 'INDEMNIFICATION',
          attention_level: 'HIGH_ATTENTION',
          title: 'Unilateral Indemnification Obligation',
          verbatim_quote: 'Contractor agrees to defend and indemnify Client against third-party claims.',
          plain_language_explanation:
            'You are required to pay the client’s legal defense costs if they are sued by a third party.',
          why_it_matters:
            'This creates uncapped financial exposure that could far exceed the total fees earned under this agreement.',
          evidence: 'Clause 002 explicitly mandates defense and indemnification without reciprocal obligations.',
          uncertainty: 'The clause does not specify whether negligence is required to trigger indemnity.',
          confidence: 0.95,
          suggested_question_for_counsel:
            'Can we make this indemnity mutual and cap total liability to the fees paid under this agreement?',
        },
      ],
    };
  }
}
