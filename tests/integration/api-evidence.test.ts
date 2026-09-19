import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getEvidence } from '@/app/api/v1/evidence/route';
import { POST as runAudit } from '@/app/api/v1/audit/route';
import { POST as runCompare } from '@/app/api/v1/compare/route';
import { legalAuditService } from '@/lib/server/ai/legal-audit-service';
import { comparisonService } from '@/lib/server/ai/comparison-service';
import { MockGeminiProvider } from '@/lib/server/ai/gemini-provider';
import { MockComparisonProvider } from '@/lib/server/ai/comparison-provider';
import { reportStore } from '@/lib/server/report-store';
import { StructuredDocument } from '@/types/domain';

function createMockDocument(documentId: string, fileName = 'Master_Agreement.txt'): StructuredDocument {
  const canonical_text =
    'ARTICLE 1: CONFIDENTIALITY\n' +
    'Clause 1.1: Recipient shall hold all Confidential Information in strict confidence.\n\n' +
    'ARTICLE 2: INDEMNITY\n' +
    'Clause 2.1: Vendor shall indemnify Customer against all third-party claims.\n\n' +
    'ARTICLE 3: GOVERNING LAW\n' +
    'Clause 3.1: Governed by the laws of the State of Delaware.';

  const c1Text = 'Clause 1.1: Recipient shall hold all Confidential Information in strict confidence.';
  const c1Start = canonical_text.indexOf(c1Text);
  const c1End = c1Start + c1Text.length;

  const c2Text = 'Clause 2.1: Vendor shall indemnify Customer against all third-party claims.';
  const c2Start = canonical_text.indexOf(c2Text);
  const c2End = c2Start + c2Text.length;

  return {
    metadata: {
      document_id: documentId,
      file_name: fileName,
      file_size_bytes: canonical_text.length,
      format: 'text/plain',
      extension: 'txt',
      created_at: new Date().toISOString(),
      sha256_hash: 'hash_test_123',
      page_count: 1,
      character_count: canonical_text.length,
      word_count: 30,
    },
    canonical_text,
    pages: [
      {
        page_number: 1,
        text: canonical_text,
        char_start_offset: 0,
        char_end_offset: canonical_text.length,
      },
    ],
    sections: [
      {
        section_id: 'sec_001',
        title: 'ARTICLE 1: CONFIDENTIALITY',
        raw_heading: 'ARTICLE 1: CONFIDENTIALITY',
        level: 1,
        start_offset: 0,
        end_offset: c1End,
      },
    ],
    clauses: [
      {
        clause_id: 'clause_001',
        document_id: documentId,
        section_id: 'sec_001',
        number_label: '1.1',
        text: c1Text,
        start_offset: c1Start,
        end_offset: c1End,
        page_number: 1,
        line_number: 2,
        subclause_ids: [],
      },
      {
        clause_id: 'clause_002',
        document_id: documentId,
        number_label: '2.1',
        text: c2Text,
        start_offset: c2Start,
        end_offset: c2End,
        page_number: 1,
        line_number: 5,
        subclause_ids: [],
      },
    ],
    chunks: [],
    security_status: {
      passed: true,
      injection_patterns_detected: 0,
      flagged_tokens: [],
      pii_redacted_count: 0,
      sanitized: true,
    },
  };
}

describe('Evidence API Endpoint Integration Tests (GET /api/v1/evidence)', () => {
  beforeEach(() => {
    reportStore.clear();
    legalAuditService.setProvider(new MockGeminiProvider());
    comparisonService.setProvider(new MockComparisonProvider());
  });

  it('returns 400 when document_id parameter is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/evidence?clause_id=clause_001');
    const res = await getEvidence(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe('INVALID_REQUEST');
    expect(json.error.message).toContain('document_id');
  });

  it('returns 400 when clause_id parameter is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/evidence?document_id=doc_123');
    const res = await getEvidence(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe('INVALID_REQUEST');
    expect(json.error.message).toContain('clause_id');
  });

  it('returns 400 when document_id or clause_id contains path traversal', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/evidence?document_id=../../etc/passwd&clause_id=clause_001');
    const res = await getEvidence(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe('INVALID_REQUEST');
  });

  it('returns 404 DOCUMENT_NOT_FOUND when document is not in cache', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/evidence?document_id=nonexistent_doc_01&clause_id=clause_001');
    const res = await getEvidence(req);
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error.code).toBe('DOCUMENT_NOT_FOUND');
  });

  it('returns 404 CLAUSE_NOT_FOUND when clause does not exist in document', async () => {
    const doc = createMockDocument('doc_valid_01');
    reportStore.saveDocument(doc);

    const req = new NextRequest('http://localhost:3000/api/v1/evidence?document_id=doc_valid_01&clause_id=clause_999');
    const res = await getEvidence(req);
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error.code).toBe('CLAUSE_NOT_FOUND');
  });

  it('returns 200 with clause text and surrounding context for valid query', async () => {
    const doc = createMockDocument('doc_valid_02', 'Services_Contract.txt');
    reportStore.saveDocument(doc);

    const req = new NextRequest('http://localhost:3000/api/v1/evidence?document_id=doc_valid_02&clause_id=clause_001&radius=30');
    const res = await getEvidence(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.document_id).toBe('doc_valid_02');
    expect(json.file_name).toBe('Services_Contract.txt');
    expect(json.clause.clause_id).toBe('clause_001');
    expect(json.clause.text).toContain('strict confidence');
    expect(json.surrounding_context.before_text).toBeDefined();
    expect(json.surrounding_context.after_text).toBeDefined();
  });

  it('returns 200 with pre-resolved evidence coordinates when quote is supplied', async () => {
    const doc = createMockDocument('doc_valid_03');
    reportStore.saveDocument(doc);

    const quote = 'strict confidence';
    const req = new NextRequest(
      `http://localhost:3000/api/v1/evidence?document_id=doc_valid_03&clause_id=clause_001&quote=${encodeURIComponent(quote)}`
    );
    const res = await getEvidence(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.resolved_evidence).toBeDefined();
    expect(json.resolved_evidence.isResolved).toBe(true);
    expect(json.resolved_evidence.highlightText).toBe('strict confidence');
    expect(json.resolved_evidence.status).toBe('EXACT_QUOTE');
  });

  it('caches ingested document during POST /api/v1/audit so evidence route resolves it immediately', async () => {
    const contractText =
      '1. Payment. Client shall pay within 30 days.\n2. Liability. Liability is capped at fees paid.';

    const auditReq = new NextRequest('http://localhost:3000/api/v1/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text: contractText,
        file_name: 'Audit_Test_Agreement.txt',
      }),
    });

    const auditRes = await runAudit(auditReq);
    expect(auditRes.status).toBe(200);
    const auditData = await auditRes.json();
    const docId = auditData.document_id;
    expect(docId).toBeDefined();

    // Now call /api/v1/evidence with docId
    const evidenceReq = new NextRequest(
      `http://localhost:3000/api/v1/evidence?document_id=${docId}&clause_id=clause_001`
    );
    const evidenceRes = await getEvidence(evidenceReq);
    expect(evidenceRes.status).toBe(200);

    const evidenceData = await evidenceRes.json();
    expect(evidenceData.document_id).toBe(docId);
    expect(evidenceData.clause.clause_id).toBe('clause_001');
    expect(evidenceData.file_name).toBe('Audit_Test_Agreement.txt');
  });

  it('caches both docA and docB during POST /api/v1/compare for dual evidence retrieval', async () => {
    const textA = '1. Term. Agreement shall last 1 year.\n2. Payment. Monthly billing.';
    const textB = '1. Term. Agreement shall last 3 years.\n2. Payment. Upfront billing.';

    const compareReq = new NextRequest('http://localhost:3000/api/v1/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text_a: textA,
        raw_text_b: textB,
        file_name_a: 'Version_1.txt',
        file_name_b: 'Version_2.txt',
      }),
    });

    const compareRes = await runCompare(compareReq);
    expect(compareRes.status).toBe(200);
    const compData = await compareRes.json();

    const docA_id = compData.metadata.contract_a_metadata.document_id;
    const docB_id = compData.metadata.contract_b_metadata.document_id;

    // Retrieve Contract A clause
    const reqA = new NextRequest(
      `http://localhost:3000/api/v1/evidence?document_id=${docA_id}&clause_id=clause_001`
    );
    const resA = await getEvidence(reqA);
    expect(resA.status).toBe(200);
    const dataA = await resA.json();
    expect(dataA.file_name).toBe('Version_1.txt');

    // Retrieve Contract B clause
    const reqB = new NextRequest(
      `http://localhost:3000/api/v1/evidence?document_id=${docB_id}&clause_id=clause_001`
    );
    const resB = await getEvidence(reqB);
    expect(resB.status).toBe(200);
    const dataB = await resB.json();
    expect(dataB.file_name).toBe('Version_2.txt');
  });
});
