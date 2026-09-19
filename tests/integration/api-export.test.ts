import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getAuditReport, POST as postAuditReport } from '@/app/api/v1/export/report/route';
import {
  GET as getComparisonReport,
  POST as postComparisonReport,
} from '@/app/api/v1/export/comparison-report/route';
import { POST as runAudit } from '@/app/api/v1/audit/route';
import { POST as runCompare } from '@/app/api/v1/compare/route';
import { legalAuditService } from '@/lib/server/ai/legal-audit-service';
import { comparisonService } from '@/lib/server/ai/comparison-service';
import { MockGeminiProvider } from '@/lib/server/ai/gemini-provider';
import { MockComparisonProvider } from '@/lib/server/ai/comparison-provider';
import { reportStore } from '@/lib/server/report-store';
import { DocumentMetadata } from '@/types/domain';

function createMockDocMeta(id: string, fileName: string): DocumentMetadata {
  return {
    document_id: id,
    file_name: fileName,
    file_size_bytes: 1000,
    format: 'text/plain',
    extension: 'txt',
    created_at: '2026-09-19T10:00:00.000Z',
    sha256_hash: 'mockhash123',
    page_count: 1,
    character_count: 1000,
    word_count: 150,
  };
}

describe('Export API Endpoints Integration Tests', () => {
  beforeEach(() => {
    reportStore.clear();
    legalAuditService.setProvider(new MockGeminiProvider());
    comparisonService.setProvider(new MockComparisonProvider());
  });

  describe('GET /api/v1/export/report', () => {
    it('returns 400 when document id parameter is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/export/report');
      const res = await getAuditReport(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error.code).toBe('INVALID_REQUEST');
      expect(data.error.message).toContain('required');
    });

    it('returns 400 when document id fails format validation (path traversal attempt)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/export/report?id=../../etc/passwd');
      const res = await getAuditReport(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('returns 400 when format parameter is unsupported', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/export/report?id=doc_123&format=yaml');
      const res = await getAuditReport(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error.code).toBe('INVALID_REQUEST');
      expect(data.error.message).toContain('format');
    });

    it('returns 404 when document id is not found in report store', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/export/report?id=doc_missing_999');
      const res = await getAuditReport(req);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error.code).toBe('REPORT_NOT_FOUND');
    });

    it('seamlessly exports HTML report after running an audit', async () => {
      // Step 1: Run audit
      const auditReq = new NextRequest('http://localhost:3000/api/v1/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: [
            '1. Scope: Consultant will provide software development services.',
            '',
            '2. Indemnity: Consultant agrees to defend and indemnify Client against third-party claims.',
          ].join('\n'),
          file_name: 'Consulting_Agreement.txt',
        }),
      });
      const auditRes = await runAudit(auditReq);
      expect(auditRes.status).toBe(200);
      const auditData = await auditRes.json();
      const documentId = auditData.document_id;
      expect(documentId).toBeDefined();

      // Step 2: Export HTML report
      const exportReq = new NextRequest(
        `http://localhost:3000/api/v1/export/report?id=${documentId}&format=html`
      );
      const exportRes = await getAuditReport(exportReq);
      expect(exportRes.status).toBe(200);
      expect(exportRes.headers.get('content-type')).toContain('text/html');

      const htmlBody = await exportRes.text();
      expect(htmlBody).toContain('ClauseGuard');
      expect(htmlBody).toContain('Consulting_Agreement.txt');
      expect(htmlBody).toContain('Grounded Legal Audit &amp; Risk Assessment Memorandum');
      expect(htmlBody).toContain('Indemnification &amp; Third-Party Exposure');
      expect(htmlBody).toContain('clause_002');
    });

    it('exports Markdown memorandum with download disposition', async () => {
      // Seed audit result directly in report store
      reportStore.saveAuditResult({
        document_id: 'doc_seeded_001',
        summary: 'A standard non-disclosure agreement.',
        primary_concerns: ['Confidentiality term'],
        findings: [],
        metadata: {
          audited_at: '2026-09-19T10:00:00.000Z',
          model_used: 'mock-evaluator',
          duration_ms: 800,
          total_clauses_analyzed: 4,
          total_findings_count: 0,
          verified_count: 0,
          unverified_count: 0,
          rejected_count: 0,
          file_name: 'Mutual_NDA.txt',
        },
      });

      const exportReq = new NextRequest(
        'http://localhost:3000/api/v1/export/report?id=doc_seeded_001&format=markdown&download=true'
      );
      const exportRes = await getAuditReport(exportReq);
      expect(exportRes.status).toBe(200);
      expect(exportRes.headers.get('content-type')).toContain('text/markdown');
      expect(exportRes.headers.get('content-disposition')).toContain('attachment; filename="Mutual_NDA.txt_audit_memorandum.md"');

      const mdBody = await exportRes.text();
      expect(mdBody).toContain('# ClauseGuard Grounded Legal Audit Memorandum');
      expect(mdBody).toContain('Mutual_NDA.txt');
    });

    it('supports POST /api/v1/export/report with JSON payload', async () => {
      reportStore.saveAuditResult({
        document_id: 'doc_post_001',
        summary: 'Summary for POST export test.',
        primary_concerns: [],
        findings: [],
        metadata: {
          audited_at: '2026-09-19T10:00:00.000Z',
          model_used: 'mock-evaluator',
          duration_ms: 500,
          total_clauses_analyzed: 2,
          total_findings_count: 0,
          verified_count: 0,
          unverified_count: 0,
          rejected_count: 0,
          file_name: 'Sample.txt',
        },
      });

      const postReq = new NextRequest('http://localhost:3000/api/v1/export/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'doc_post_001', format: 'html' }),
      });
      const postRes = await postAuditReport(postReq);
      expect(postRes.status).toBe(200);
      expect(postRes.headers.get('content-type')).toContain('text/html');
    });
  });

  describe('GET /api/v1/export/comparison-report', () => {
    it('returns 400 when comparison id is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/export/comparison-report');
      const res = await getComparisonReport(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('returns 404 when comparison id is not in store', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/export/comparison-report?id=comp_missing_123'
      );
      const res = await getComparisonReport(req);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error.code).toBe('REPORT_NOT_FOUND');
    });

    it('seamlessly exports comparison HTML report after running compare endpoint', async () => {
      // Step 1: Run comparison
      const compareReq = new NextRequest('http://localhost:3000/api/v1/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text_a: '1. Term. This agreement expires in 1 year.',
          file_name_a: 'Contract_2024.txt',
          raw_text_b: '1. Term. This agreement expires in 3 years.',
          file_name_b: 'Contract_2025.txt',
        }),
      });

      const compareRes = await runCompare(compareReq);
      expect(compareRes.status).toBe(200);
      const compareData = await compareRes.json();
      const comparisonId = compareData.comparison_id;
      expect(comparisonId).toBeDefined();

      // Step 2: Export comparison HTML report
      const exportReq = new NextRequest(
        `http://localhost:3000/api/v1/export/comparison-report?id=${comparisonId}&format=html`
      );
      const exportRes = await getComparisonReport(exportReq);
      expect(exportRes.status).toBe(200);
      expect(exportRes.headers.get('content-type')).toContain('text/html');

      const htmlBody = await exportRes.text();
      expect(htmlBody).toContain('Executive Contract Comparison &amp; Redline Memorandum');
      expect(htmlBody).toContain('Contract_2024.txt');
      expect(htmlBody).toContain('Contract_2025.txt');
      expect(htmlBody).toContain('Dual-Source Verified');
    });

    it('exports comparison Markdown memorandum with download disposition', async () => {
      reportStore.saveComparisonResult({
        comparison_id: 'comp_seeded_002',
        summary: 'Comparison memorandum Markdown test.',
        findings: [],
        metadata: {
          comparison_id: 'comp_seeded_002',
          timestamp: '2026-09-19T10:00:00.000Z',
          contract_a_metadata: createMockDocMeta('doc_a', 'NDA_A.txt'),
          contract_b_metadata: createMockDocMeta('doc_b', 'NDA_B.txt'),
          aligned_pairs_count: 3,
          total_findings_count: 0,
          verified_findings_count: 0,
          unverified_findings_count: 0,
          rejected_findings_count: 0,
          duration_ms: 1100,
          provider_used: 'mock',
          model_used: 'mock-compare',
          prompt_version: '1.0',
          processing_status: 'completed',
          disclaimer: 'Disclaimer test',
        },
        disclaimer: 'Disclaimer test',
      });

      const exportReq = new NextRequest(
        'http://localhost:3000/api/v1/export/comparison-report?id=comp_seeded_002&format=markdown&download=true'
      );
      const exportRes = await getComparisonReport(exportReq);
      expect(exportRes.status).toBe(200);
      expect(exportRes.headers.get('content-type')).toContain('text/markdown');
      expect(exportRes.headers.get('content-disposition')).toContain('attachment; filename="NDA_A.txt_vs_NDA_B.txt_comparison_memorandum.md"');

      const mdBody = await exportRes.text();
      expect(mdBody).toContain('# ClauseGuard Executive Contract Comparison Memorandum');
      expect(mdBody).toContain('NDA_A.txt');
      expect(mdBody).toContain('NDA_B.txt');
    });

    it('supports POST /api/v1/export/comparison-report with JSON payload', async () => {
      reportStore.saveComparisonResult({
        comparison_id: 'comp_post_002',
        summary: 'POST comparison export test.',
        findings: [],
        metadata: {
          comparison_id: 'comp_post_002',
          timestamp: '2026-09-19T10:00:00.000Z',
          contract_a_metadata: createMockDocMeta('doc_a', 'Draft_A.txt'),
          contract_b_metadata: createMockDocMeta('doc_b', 'Draft_B.txt'),
          aligned_pairs_count: 2,
          total_findings_count: 0,
          verified_findings_count: 0,
          unverified_findings_count: 0,
          rejected_findings_count: 0,
          duration_ms: 700,
          provider_used: 'mock',
          model_used: 'mock-evaluator',
          prompt_version: '1.0',
          processing_status: 'completed',
          disclaimer: 'Disclaimer test',
        },
        disclaimer: 'Disclaimer test',
      });

      const postReq = new NextRequest('http://localhost:3000/api/v1/export/comparison-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'comp_post_002', format: 'html' }),
      });
      const postRes = await postComparisonReport(postReq);
      expect(postRes.status).toBe(200);
      expect(postRes.headers.get('content-type')).toContain('text/html');
    });
  });
});
