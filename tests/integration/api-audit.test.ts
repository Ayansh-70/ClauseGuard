import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/audit/route';
import { legalAuditService } from '@/lib/server/ai/legal-audit-service';
import { MockGeminiProvider } from '@/lib/server/ai/gemini-provider';
import { ingestRawText } from '@/lib/domain/ingestion-pipeline';

describe('POST /api/v1/audit API Endpoint', () => {
  beforeEach(() => {
    // Inject Mock provider so API tests do not call live network
    legalAuditService.setProvider(new MockGeminiProvider());
  });

  it('audits a contract from raw_text input successfully', async () => {
    const rawText = [
      '1. Scope. Contractor provides consulting.',
      '',
      '2. Indemnity. Contractor agrees to defend and indemnify Client against third-party claims.',
    ].join('\n');

    const req = new NextRequest('http://localhost:3000/api/v1/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: rawText, file_name: 'test_agreement.txt' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.document_id).toBeDefined();
    expect(data.summary).toBeDefined();
    expect(data.findings).toHaveLength(1);
    expect(data.findings[0].clause_id).toBe('clause_002');
    expect(data.findings[0].verification_status).toBe('VERIFIED_EXACT');
  });

  it('audits an already structured document successfully', async () => {
    const rawText = [
      '1. Scope. Work performed.',
      '',
      '2. Indemnity. Contractor agrees to defend and indemnify Client against third-party claims.',
    ].join('\n');

    const structuredDoc = await ingestRawText(rawText);

    const req = new NextRequest('http://localhost:3000/api/v1/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: structuredDoc }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.document_id).toBe(structuredDoc.metadata.document_id);
    expect(data.findings).toHaveLength(1);
  });

  it('rejects invalid request payloads with 400 Bad Request', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unexpected_field: 'invalid' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const errorData = await res.json();
    expect(errorData.error.code).toBe('INVALID_PAYLOAD');
  });
});
