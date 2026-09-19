import { describe, it, expect } from 'vitest';
import {
  generateComparisonHtmlReport,
  generateComparisonMarkdownReport,
} from '@/lib/server/reports/comparison-report-generator';
import { ComparisonResult } from '@/types/domain';
import { GLOBAL_LEGAL_DISCLAIMER } from '@/lib/constants/disclaimers';

describe('Comparison Report Generator Unit Tests', () => {
  const mockDocMetaA = {
    document_id: 'doc_a',
    file_name: 'Consulting_Agreement_v1_Baseline.txt',
    file_size_bytes: 1500,
    format: 'text/plain' as const,
    extension: 'txt' as const,
    created_at: '2026-09-19T10:00:00.000Z',
    sha256_hash: 'hash_a',
    page_count: 2,
    character_count: 1500,
    word_count: 250,
  };

  const mockDocMetaB = {
    document_id: 'doc_b',
    file_name: 'Consulting_Agreement_v2_Revised.txt',
    file_size_bytes: 1600,
    format: 'text/plain' as const,
    extension: 'txt' as const,
    created_at: '2026-09-19T10:00:00.000Z',
    sha256_hash: 'hash_b',
    page_count: 2,
    character_count: 1600,
    word_count: 270,
  };

  const sampleComparison: ComparisonResult = {
    comparison_id: 'comp_report_test_200',
    summary: 'The revised agreement substantially alters payment terms from Net 30 to Net 60 and adds unilateral IP assignment.',
    findings: [
      {
        id: 'comp_001',
        category: 'PAYMENT_TERMS',
        title: 'Payment Window Extended',
        status: 'changed',
        attention_level: 'HIGH_ATTENTION',
        plain_english_summary: 'Payment period changed from Net 30 days to Net 60 days.',
        practical_implication: 'Delays cash flow collection by an additional month.',
        confidence: 0.95,
        verification_status: 'VERIFIED_EXACT',
        contract_a_source: {
          document_id: 'doc_a',
          clause_id: 'clause_a_003',
          exact_quote: 'Payment shall be made within thirty (30) days of receipt of invoice.',
          page_number: 1,
        },
        contract_b_source: {
          document_id: 'doc_b',
          clause_id: 'clause_b_003',
          exact_quote: 'Payment shall be made within sixty (60) calendar days of invoice receipt.',
          page_number: 2,
        },
        suggested_question_for_counsel: 'Can we reject Net 60 and compromise on Net 45 with late fee provisions?',
      },
      {
        id: 'comp_002',
        category: 'INTELLECTUAL_PROPERTY',
        title: 'Unilateral IP Assignment Added',
        status: 'added',
        attention_level: 'HIGH_ATTENTION',
        plain_english_summary: 'New clause obligates consultant to assign all background patents and inventions.',
        practical_implication: 'May inadvertently transfer pre-existing proprietary technology.',
        confidence: 0.92,
        verification_status: 'VERIFIED_EXACT',
        contract_a_source: undefined,
        contract_b_source: {
          document_id: 'doc_b',
          clause_id: 'clause_b_009',
          exact_quote: 'Consultant assigns all right, title, and interest in all developments and background IP.',
          page_number: 4,
        },
        suggested_question_for_counsel: 'How do we carve out pre-existing background IP from the assignment?',
      },
      {
        id: 'comp_003',
        category: 'AUDIT_RIGHTS',
        title: 'Audit Access Removed',
        status: 'removed',
        attention_level: 'MEDIUM_ATTENTION',
        plain_english_summary: 'The right to audit vendor records was omitted from the revised draft.',
        practical_implication: 'Prevents independent financial review.',
        confidence: 0.88,
        verification_status: 'VERIFIED_EXACT',
        contract_a_source: {
          document_id: 'doc_a',
          clause_id: 'clause_a_010',
          exact_quote: 'Client shall have the right to inspect books and records annually upon notice.',
          page_number: 3,
        },
        contract_b_source: undefined,
      },
    ],
    metadata: {
      comparison_id: 'comp_report_test_200',
      timestamp: '2026-09-19T10:00:00.000Z',
      contract_a_metadata: mockDocMetaA,
      contract_b_metadata: mockDocMetaB,
      aligned_pairs_count: 12,
      total_findings_count: 3,
      verified_findings_count: 3,
      unverified_findings_count: 0,
      rejected_findings_count: 0,
      duration_ms: 2200,
      provider_used: 'mock',
      model_used: 'mock-gemini-compare',
      prompt_version: '1.0',
      processing_status: 'completed',
      disclaimer: GLOBAL_LEGAL_DISCLAIMER,
    },
    disclaimer: GLOBAL_LEGAL_DISCLAIMER,
  };

  describe('generateComparisonHtmlReport', () => {
    it('produces valid HTML comparison memorandum', () => {
      const html = generateComparisonHtmlReport(sampleComparison);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('ClauseGuard');
      expect(html).toContain('Executive Contract Comparison &amp; Redline Memorandum');
      expect(html).toContain('Consulting_Agreement_v1_Baseline.txt');
      expect(html).toContain('Consulting_Agreement_v2_Revised.txt');
      expect(html).toContain('comp_report_test_200');
      expect(html).toContain('1. Executive Change Story &amp; Variance Summary');
      expect(html).toContain('2. Category-by-Category Shift Breakdown');
      expect(html).toContain('3. Detailed Clause Variances &amp; Dual Source Evidence');
      expect(html).toContain('4. Actionable Negotiation Checklist for Legal Counsel');
    });

    it('renders variance count indicators', () => {
      const html = generateComparisonHtmlReport(sampleComparison);

      expect(html).toContain('1 Modified Provisions');
      expect(html).toContain('1 Newly Added in B');
      expect(html).toContain('1 Omitted from B');
    });

    it('handles side-by-side dual source quotes and asymmetric provisions', () => {
      const html = generateComparisonHtmlReport(sampleComparison);

      // Changed provision (both quotes present)
      expect(html).toContain('Payment shall be made within thirty (30) days');
      expect(html).toContain('Payment shall be made within sixty (60) calendar days');

      // Added provision (Contract A null)
      expect(html).toContain('No corresponding provision found in Contract A');
      expect(html).toContain('Consultant assigns all right, title, and interest in all developments');

      // Removed provision (Contract B null)
      expect(html).toContain('Provision omitted from Contract B draft');
    });

    it('includes negotiation table for counsel', () => {
      const html = generateComparisonHtmlReport(sampleComparison);

      expect(html).toContain('Can we reject Net 60 and compromise on Net 45 with late fee provisions?');
      expect(html).toContain('How do we carve out pre-existing background IP from the assignment?');
    });

    it('contains statutory regulatory disclaimer and print directives', () => {
      const html = generateComparisonHtmlReport(sampleComparison);

      expect(html).toContain('Statutory Regulatory Notice &amp; Anti-UPL Statement');
      expect(html).toContain('@media print');
      expect(html).toContain('window.print()');
    });

    it('escapes XSS attempts in comparison summaries and quotes', () => {
      const maliciousComparison: ComparisonResult = {
        ...sampleComparison,
        summary: '<script>alert(1)</script>',
      };

      const html = generateComparisonHtmlReport(maliciousComparison);
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
  });

  describe('generateComparisonMarkdownReport', () => {
    it('produces structured Markdown document', () => {
      const md = generateComparisonMarkdownReport(sampleComparison);

      expect(md).toContain('# ClauseGuard Executive Contract Comparison Memorandum');
      expect(md).toContain('> **Baseline Contract (A):** Consulting_Agreement_v1_Baseline.txt');
      expect(md).toContain('> **Revised Contract (B):** Consulting_Agreement_v2_Revised.txt');
      expect(md).toContain('## 1. Executive Summary & Change Story');
      expect(md).toContain('## 2. Category-by-Category Shift Summary');
      expect(md).toContain('## 3. Detailed Clause Variances & Dual Verified Evidence');
      expect(md).toContain('## 4. Statutory Regulatory Notice & Anti-UPL Statement');
      expect(md).toContain(GLOBAL_LEGAL_DISCLAIMER);
    });

    it('formats category summary table in Markdown', () => {
      const md = generateComparisonMarkdownReport(sampleComparison);

      expect(md).toContain('| Category | Status | Highest Priority | Key Shift |');
      expect(md).toContain('PAYMENT TERMS');
      expect(md).toContain('INTELLECTUAL PROPERTY');
      expect(md).toContain('AUDIT RIGHTS');
    });
  });
});
