import { describe, it, expect } from 'vitest';
import {
  generateAuditHtmlReport,
  generateAuditMarkdownReport,
} from '@/lib/server/reports/audit-report-generator';
import { AuditResult } from '@/types/domain';
import { GLOBAL_LEGAL_DISCLAIMER } from '@/lib/constants/disclaimers';

describe('Audit Report Generator Unit Tests', () => {
  const sampleAudit: AuditResult = {
    document_id: 'doc_audit_test_100',
    summary: 'The agreement presents significant unilateral risks in the indemnification and liability clauses.',
    primary_concerns: [
      'Uncapped unilateral indemnification obligation',
      'Asymmetric termination rights favoring Counterparty',
    ],
    findings: [
      {
        finding_id: 'find_001',
        clause_id: 'clause_008',
        category: 'INDEMNIFICATION',
        attention_level: 'HIGH_ATTENTION',
        title: 'Uncapped Broad Indemnification',
        plain_language_explanation: 'The contractor must indemnify the client against all claims without financial limitation.',
        why_it_matters: 'Exposes company assets to unbounded liability.',
        verbatim_quote: 'Contractor shall defend, indemnify, and hold harmless the Company against all claims.',
        evidence: 'Direct indemnification provision spotted in Section 8.',
        verification_status: 'VERIFIED_EXACT',
        page_number: 2,
        matched_range: { start: 100, end: 180 },
        confidence: 0.95,
        suggested_question_for_counsel: 'Can we cap indemnification to fees paid in previous 12 months?',
      },
      {
        finding_id: 'find_002',
        clause_id: 'clause_012',
        category: 'GOVERNING_LAW_DISPUTES',
        attention_level: 'STANDARD_NOTICE',
        title: 'Delaware Governing Law',
        plain_language_explanation: 'Standard commercial governing law and jurisdiction provision.',
        why_it_matters: 'Designates Delaware venue for litigation.',
        evidence: 'Standard choice of law language.',
        verbatim_quote: 'This Agreement shall be governed by the laws of the State of Delaware.',
        verification_status: 'VERIFIED_EXACT',
        page_number: 3,
        matched_range: { start: 500, end: 570 },
        confidence: 0.9,
        suggested_question_for_counsel: 'Is Delaware venue acceptable for our entity?',
      },
    ],
    metadata: {
      audited_at: '2026-09-19T10:00:00.000Z',
      model_used: 'mock-gemini-audit',
      duration_ms: 1850,
      total_clauses_analyzed: 15,
      total_findings_count: 2,
      verified_count: 2,
      unverified_count: 0,
      rejected_count: 0,
      page_count: 4,
      file_name: 'Master_Consulting_Services_Agreement.pdf',
    },
  };

  describe('generateAuditHtmlReport', () => {
    it('produces valid HTML document with executive structure', () => {
      const html = generateAuditHtmlReport(sampleAudit);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('ClauseGuard');
      expect(html).toContain('Master_Consulting_Services_Agreement.pdf');
      expect(html).toContain('doc_audit_test_100');
      expect(html).toContain('Commercial Consulting / Services Agreement');
      expect(html).toContain('1. Executive Summary &amp; Assessment Overview');
      expect(html).toContain('2. Priority Review — Provisions Deserving Immediate Attention');
      expect(html).toContain('3. Comprehensive Document Observations &amp; Verified Source Evidence');
      expect(html).toContain('4. Actionable Briefing Checklist for Legal Counsel');
    });

    it('embeds verified quotes with clause citation and coordinates', () => {
      const html = generateAuditHtmlReport(sampleAudit);

      expect(html).toContain('Contractor shall defend, indemnify, and hold harmless the Company against all claims.');
      expect(html).toContain('clause_008');
      expect(html).toContain('Page: 2');
      expect(html).toContain('[100..180]');
    });

    it('embeds actionable questions for counsel table', () => {
      const html = generateAuditHtmlReport(sampleAudit);

      expect(html).toContain('Can we cap indemnification to fees paid in previous 12 months?');
      expect(html).toContain('INDEMNIFICATION');
    });

    it('contains statutory anti-UPL disclaimer', () => {
      const html = generateAuditHtmlReport(sampleAudit);

      expect(html).toContain('Statutory Regulatory Notice &amp; Anti-UPL Statement');
      expect(html).toContain('attorney representation');
    });

    it('contains print CSS directives and floating screen action buttons', () => {
      const html = generateAuditHtmlReport(sampleAudit);

      expect(html).toContain('@media print');
      expect(html).toContain('window.print()');
      expect(html).toContain('Download Markdown (.md)');
      expect(html).toContain('page-break-inside-avoid');
    });

    it('safely escapes XSS characters in untrusted contract text', () => {
      const maliciousAudit: AuditResult = {
        ...sampleAudit,
        summary: 'Reviewing <script>alert("xss")</script> & malicious "payload"',
        findings: [
          {
            ...sampleAudit.findings[0],
            title: '<img src=x onerror=alert(1)> Title',
            plain_language_explanation: 'Explanation with <b>bold</b> and <script>',
            verbatim_quote: 'Quote with <marquee>tag</marquee>',
          },
        ],
      };

      const html = generateAuditHtmlReport(maliciousAudit);

      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('handles zero findings cleanly with balanced agreement message', () => {
      const emptyAudit: AuditResult = {
        ...sampleAudit,
        findings: [],
        metadata: {
          ...sampleAudit.metadata,
          total_findings_count: 0,
          verified_count: 0,
        },
      };

      const html = generateAuditHtmlReport(emptyAudit);
      expect(html).toContain('No material risk observations detected');
    });
  });

  describe('generateAuditMarkdownReport', () => {
    it('generates well-formed Markdown memorandum', () => {
      const md = generateAuditMarkdownReport(sampleAudit);

      expect(md).toContain('# ClauseGuard Grounded Legal Audit Memorandum');
      expect(md).toContain('> **Document:** Master_Consulting_Services_Agreement.pdf');
      expect(md).toContain('> **Document ID:** `doc_audit_test_100`');
      expect(md).toContain('## 1. Executive Summary');
      expect(md).toContain('## 2. Priority Review — Start Here');
      expect(md).toContain('## 3. Comprehensive Document Observations & Verified Evidence');
      expect(md).toContain('## 4. Regulatory Notice & Anti-UPL Statement');
      expect(md).toContain(GLOBAL_LEGAL_DISCLAIMER);
    });

    it('formats verbatim quotes in blockquotes', () => {
      const md = generateAuditMarkdownReport(sampleAudit);

      expect(md).toContain('> "Contractor shall defend, indemnify, and hold harmless the Company against all claims."');
      expect(md).toContain('*Clause: `clause_008` | Page 2 | Offset [100..180]*');
    });

    it('includes counsel negotiation question', () => {
      const md = generateAuditMarkdownReport(sampleAudit);

      expect(md).toContain('**Question for Legal Counsel:**');
      expect(md).toContain('*Can we cap indemnification to fees paid in previous 12 months?*');
    });
  });
});
