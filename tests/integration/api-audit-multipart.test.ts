// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/audit/route';
import { legalAuditService } from '@/lib/server/ai/legal-audit-service';
import { MockGeminiProvider } from '@/lib/server/ai/gemini-provider';

describe('POST /api/v1/audit with multipart/form-data', () => {
  beforeEach(() => {
    legalAuditService.setProvider(new MockGeminiProvider());
  });

  it('successfully audits document uploaded via multipart/form-data with file', async () => {
    const contractText = [
      '1. Scope. Technology advisory services.',
      '',
      '2. Indemnification. Contractor agrees to defend and indemnify Client against third-party claims.',
    ].join('\n');

    const formData = new FormData();
    const file = new File([contractText], 'Master_Agreement.txt', { type: 'text/plain' });
    formData.append('file', file);
    formData.append('reject_unverified', 'true');

    const nativeReq = new Request('http://localhost:3000/api/v1/audit', {
      method: 'POST',
      body: formData,
    });
    const req = new NextRequest(nativeReq);

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.document_id).toBeDefined();
    expect(data.summary).toBeDefined();
    expect(data.findings).toHaveLength(1);
    expect(data.findings[0].clause_id).toBe('clause_002');
    expect(data.findings[0].verification_status).toBe('VERIFIED_EXACT');
    expect(data.metadata.file_name).toBe('Master_Agreement.txt');
  });

  it('handles empty multipart form data with 400 Bad Request', async () => {
    const formData = new FormData();
    const nativeReq = new Request('http://localhost:3000/api/v1/audit', {
      method: 'POST',
      body: formData,
    });
    const req = new NextRequest(nativeReq);

    const res = await POST(req);
    expect(res.status).toBe(400);

    const errorJson = await res.json();
    expect(errorJson.error.code).toBe('INVALID_PAYLOAD');
  });
});
