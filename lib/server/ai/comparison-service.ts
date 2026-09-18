import 'server-only';
import { ComparisonResult, StructuredDocument } from '@/types/domain';
import {
  ComparisonProvider,
  GoogleGeminiComparisonProvider,
  MockComparisonProvider,
} from './comparison-provider';
import { alignDocumentClauses } from '@/lib/domain/clause-aligner';
import { buildComparisonContext } from './comparison-context-builder';
import {
  verifyComparisonFindings,
  ComparisonVerificationOptions,
} from './comparison-quote-verifier';
import { ComparisonResultSchema } from '@/lib/schemas/comparison.schema';
import { GLOBAL_LEGAL_DISCLAIMER } from '@/lib/constants/disclaimers';

export interface ComparisonServiceOptions extends ComparisonVerificationOptions {
  modelName?: string;
}

/**
 * Service orchestrating deterministic alignment, AI comparative analysis,
 * and dual source quote verification between two contracts.
 */
export class ComparisonService {
  private provider: ComparisonProvider;

  constructor(provider?: ComparisonProvider) {
    if (provider) {
      this.provider = provider;
    } else if (!process.env.GEMINI_API_KEY || process.env.USE_MOCK_AI === 'true') {
      this.provider = new MockComparisonProvider();
    } else {
      this.provider = new GoogleGeminiComparisonProvider();
    }
  }

  public setProvider(provider: ComparisonProvider): void {
    this.provider = provider;
  }

  /**
   * Compares two structured legal documents and returns a verified ComparisonResult.
   */
  async compareDocuments(
    docA: StructuredDocument,
    docB: StructuredDocument,
    options: ComparisonServiceOptions = {}
  ): Promise<ComparisonResult> {
    const startTime = Date.now();

    // 1. Deterministic Clause Alignment Stage
    const alignment = alignDocumentClauses(docA, docB);

    // 2. Build Bounded, Untrusted Comparison Context
    const context = buildComparisonContext(docA, docB, alignment);

    // 3. AI Semantic Comparison
    const rawOutput = await this.provider.compareContracts(context);

    // 4. Dual Source Quote Verification
    const verification = verifyComparisonFindings(rawOutput.findings, docA, docB, {
      rejectUnverified: options.rejectUnverified ?? true,
    });

    const durationMs = Date.now() - startTime;
    const isMock = !process.env.GEMINI_API_KEY || process.env.USE_MOCK_AI === 'true';

    // 5. Privacy-safe audit log (metadata only; no contract text or keys)
    if (process.env.NODE_ENV !== 'test') {
      console.info('[ComparisonService] Comparison completed', {
        comparison_id: context.comparison_id,
        doc_a_id: docA.metadata.document_id,
        doc_b_id: docB.metadata.document_id,
        aligned_pairs: alignment.aligned_count,
        total_findings: verification.total_analyzed,
        verified_count: verification.verified_count,
        rejected_count: verification.rejected_count,
        duration_ms: durationMs,
      });
    }

    const comparisonResult: ComparisonResult = {
      comparison_id: context.comparison_id,
      summary: rawOutput.summary,
      findings: verification.verified_findings,
      rejected_findings: verification.rejected_findings,
      metadata: {
        comparison_id: context.comparison_id,
        contract_a_metadata: docA.metadata,
        contract_b_metadata: docB.metadata,
        timestamp: new Date().toISOString(),
        provider_used: isMock ? 'mock' : 'google-gemini',
        model_used: isMock
          ? 'deterministic-evaluator (dev/demo)'
          : (options.modelName || process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
        prompt_version: 'v1.0-grounded-compare',
        processing_status: 'completed',
        duration_ms: durationMs,
        aligned_pairs_count: alignment.aligned_count,
        total_findings_count: verification.total_analyzed,
        verified_findings_count: verification.verified_count,
        unverified_findings_count: verification.unverified_count,
        rejected_findings_count: verification.rejected_count,
        disclaimer: GLOBAL_LEGAL_DISCLAIMER,
      },
      disclaimer: GLOBAL_LEGAL_DISCLAIMER,
    };

    // 6. Final Schema Validation
    return ComparisonResultSchema.parse(comparisonResult);
  }
}

export const comparisonService = new ComparisonService();
