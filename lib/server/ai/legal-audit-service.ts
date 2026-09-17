import 'server-only';
import { AuditResult, StructuredDocument } from '@/types/domain';
import { AIProvider, GoogleGeminiProvider } from './gemini-provider';
import { buildAuditContext } from './context-builder';
import { verifyFindings, VerificationOptions } from './quote-verifier';
import { AuditResultSchema } from '@/lib/schemas/finding.schema';

export interface AuditServiceOptions extends VerificationOptions {
  modelName?: string;
}

/**
 * Service orchestrating grounded contract legal auditing.
 * Enforces dual-level validation: Schema Validation (Level 1) + Source Verification (Level 2).
 */
export class LegalAuditService {
  private provider: AIProvider;

  constructor(provider?: AIProvider) {
    this.provider = provider || new GoogleGeminiProvider();
  }

  /**
   * Allows replacing provider at runtime (e.g. for testing)
   */
  public setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  /**
   * Executes a full grounded audit of a structured legal document.
   */
  async auditDocument(
    document: StructuredDocument,
    options: AuditServiceOptions = {}
  ): Promise<AuditResult> {
    const startTime = Date.now();

    // 1. Build grounded, structured AI context
    const context = buildAuditContext(document);

    // 2. Execute structured inference via AI provider
    const rawOutput = await this.provider.generateAudit(context);

    // 3. Level 2 Validation: Independent Source & Quote Verification
    const verification = verifyFindings(rawOutput.findings, document, {
      rejectUnverified: options.rejectUnverified ?? true,
    });

    const durationMs = Date.now() - startTime;

    // 4. Safe privacy logging (metadata only; never raw contract text or keys)
    if (process.env.NODE_ENV !== 'test') {
      console.info('[LegalAuditService] Audit completed', {
        document_id: document.metadata.document_id,
        file_name: document.metadata.file_name,
        duration_ms: durationMs,
        clauses_analyzed: document.clauses.length,
        raw_findings_count: rawOutput.findings.length,
        verified_count: verification.verified_count,
        rejected_count: verification.rejected_count,
      });
    }

    const auditResult: AuditResult = {
      document_id: document.metadata.document_id,
      summary: rawOutput.summary,
      findings: verification.verified_findings,
      rejected_findings: verification.rejected_findings,
      primary_concerns: rawOutput.primary_concerns,
      metadata: {
        audited_at: new Date().toISOString(),
        model_used: options.modelName || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        duration_ms: durationMs,
        total_clauses_analyzed: document.clauses.length,
        total_findings_count: verification.total_analyzed,
        verified_count: verification.verified_count,
        unverified_count: verification.unverified_count,
        rejected_count: verification.rejected_count,
      },
    };

    // 5. Final Schema Validation at trust boundary
    return AuditResultSchema.parse(auditResult);
  }
}

export const legalAuditService = new LegalAuditService();
