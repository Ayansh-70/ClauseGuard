// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/compare/route';
import { comparisonService } from '@/lib/server/ai/comparison-service';
import { MockComparisonProvider } from '@/lib/server/ai/comparison-provider';
import { ingestRawText } from '@/lib/domain/ingestion-pipeline';

describe('POST /api/v1/compare API Endpoint', () => {
  beforeEach(() => {
    comparisonService.setProvider(new MockComparisonProvider());
  });

  const contractAText = [
    'SECTION 1. FEES',
    '',
    '1.1 Invoicing. Client shall pay within 30 days.',
    '',
    'SECTION 2. INDEMNIFICATION',
    '',
    '2.1 Contractor shall defend Client against claims.',
  ].join('\n');

  const contractBText = [
    'SECTION 1. FEES',
    '',
    '1.1 Invoicing. Client shall pay within 60 days.',
    '',
    'SECTION 2. INDEMNIFICATION',
    '',
    '2.1 Contractor shall defend Client up to $50,000.',
  ].join('\n');

  it('compares two contracts via JSON with nested contract_a and contract_b objects', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contract_a: { raw_text: contractAText, file_name: 'Master_A.txt' },
        contract_b: { raw_text: contractBText, file_name: 'Revised_B.txt' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.comparison_id).toBeDefined();
    expect(data.summary).toBeDefined();
    expect(data.metadata.contract_a_metadata.file_name).toBe('Master_A.txt');
    expect(data.metadata.contract_b_metadata.file_name).toBe('Revised_B.txt');
    expect(data.findings.length).toBeGreaterThan(0);
  });

  it('compares two contracts via JSON with flat raw_text_a and raw_text_b', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text_a: contractAText,
        raw_text_b: contractBText,
        file_name_a: 'Baseline.txt',
        file_name_b: 'Counterproposal.txt',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.comparison_id).toBeDefined();
    expect(data.findings.length).toBeGreaterThan(0);
  });

  it('compares pre-structured documents via JSON', async () => {
    const docA = await ingestRawText(contractAText, 'DocA.txt');
    const docB = await ingestRawText(contractBText, 'DocB.txt');

    const req = new NextRequest('http://localhost:3000/api/v1/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_a: docA,
        document_b: docB,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.comparison_id).toBeDefined();
    expect(data.metadata.contract_a_metadata.document_id).toBe(docA.metadata.document_id);
    expect(data.metadata.contract_b_metadata.document_id).toBe(docB.metadata.document_id);
  });

  it('compares two files uploaded via multipart/form-data', async () => {
    const formData = new FormData();
    const fileA = new File([contractAText], 'Agreement_A.txt', { type: 'text/plain' });
    const fileB = new File([contractBText], 'Agreement_B.txt', { type: 'text/plain' });

    formData.append('file_a', fileA);
    formData.append('file_b', fileB);
    formData.append('reject_unverified', 'true');

    const nativeReq = new Request('http://localhost:3000/api/v1/compare', {
      method: 'POST',
      body: formData,
    });
    const req = new NextRequest(nativeReq);

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.comparison_id).toBeDefined();
    expect(data.metadata.contract_a_metadata.file_name).toBe('Agreement_A.txt');
    expect(data.metadata.contract_b_metadata.file_name).toBe('Agreement_B.txt');
  });

  it('returns 400 Bad Request when Contract A or B is missing in JSON payload', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contract_a: { raw_text: contractAText },
        // contract_b omitted
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const err = await res.json();
    expect(err.error.code).toBe('INVALID_PAYLOAD');
  });

  it('returns 400 Bad Request when files are missing in multipart/form-data', async () => {
    const formData = new FormData();
    const fileA = new File([contractAText], 'Only_A.txt', { type: 'text/plain' });
    formData.append('file_a', fileA);
    // file_b omitted

    const nativeReq = new Request('http://localhost:3000/api/v1/compare', {
      method: 'POST',
      body: formData,
    });
    const req = new NextRequest(nativeReq);

    const res = await POST(req);
    expect(res.status).toBe(400);

    const err = await res.json();
    expect(err.error.code).toBe('INVALID_PAYLOAD');
  });
});
