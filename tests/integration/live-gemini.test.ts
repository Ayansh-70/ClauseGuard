import { describe, it, expect } from 'vitest';
import { GoogleGeminiProvider } from '@/lib/server/ai/gemini-provider';
import { LegalAuditService } from '@/lib/server/ai/legal-audit-service';
import { ingestRawText } from '@/lib/domain/ingestion-pipeline';

// Only run if explicitly enabled via environment variable
const isLiveTestEnabled =
  process.env.LIVE_GEMINI_TEST === 'true' && Boolean(process.env.GEMINI_API_KEY);

describe.skipIf(!isLiveTestEnabled)('Live Gemini Integration Test (Opt-in)', () => {
  it('executes live audit with Google Gemini API against a sample contract', async () => {
    const sampleContract = [
      'CONSULTING SERVICES AGREEMENT',
      '',
      'ARTICLE 1: ENGAGEMENT',
      '1.1 Services. Contractor shall provide marketing consulting services.',
      '',
      'ARTICLE 2: INDEMNIFICATION & LIABILITY',
      '2.1 Uncapped Indemnity. Contractor agrees to indemnify, defend, and hold harmless Client from all claims.',
      '',
      'ARTICLE 3: PAYMENT',
      '3.1 Invoicing. Client shall pay within 30 days of receiving invoices.',
    ].join('\n');

    const document = await ingestRawText(sampleContract, 'live_test_agreement.txt');
    const liveProvider = new GoogleGeminiProvider(process.env.GEMINI_API_KEY);
    const service = new LegalAuditService(liveProvider);

    const result = await service.auditDocument(document);

    expect(result.document_id).toBeDefined();
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.metadata.model_used).toBeDefined();

    // Verify all returned findings are grounded
    for (const finding of result.findings) {
      expect(finding.clause_id).toMatch(/^clause_\d+$/);
      expect(finding.verification_status).toMatch(/^VERIFIED_/);
    }
  });
});
