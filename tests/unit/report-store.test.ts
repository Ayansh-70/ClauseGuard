import { describe, it, expect, beforeEach } from 'vitest';
import { reportStore, isValidReportId } from '@/lib/server/report-store';
import { AuditResult, ComparisonResult } from '@/types/domain';

describe('ReportStore & ID Validation Unit Tests', () => {
  beforeEach(() => {
    reportStore.clear();
  });

  describe('isValidReportId', () => {
    it('accepts valid alphanumeric, hyphen, underscore, and dot IDs (3-100 chars)', () => {
      expect(isValidReportId('doc_123')).toBe(true);
      expect(isValidReportId('doc-456_test.v1')).toBe(true);
      expect(isValidReportId('comparison_2026_09_19_abc')).toBe(true);
      expect(isValidReportId('abc')).toBe(true);
    });

    it('rejects path traversal attempts', () => {
      expect(isValidReportId('../secret')).toBe(false);
      expect(isValidReportId('..\\secret')).toBe(false);
      expect(isValidReportId('/etc/passwd')).toBe(false);
      expect(isValidReportId('c:/windows')).toBe(false);
      expect(isValidReportId('foo/bar')).toBe(false);
    });

    it('rejects null bytes and control characters', () => {
      expect(isValidReportId('doc\x00123')).toBe(false);
      expect(isValidReportId('doc\n123')).toBe(false);
      expect(isValidReportId('<script>')).toBe(false);
      expect(isValidReportId('doc 123')).toBe(false);
    });

    it('rejects too short or too long IDs', () => {
      expect(isValidReportId('')).toBe(false);
      expect(isValidReportId('a')).toBe(false);
      expect(isValidReportId('ab')).toBe(false);
      expect(isValidReportId('a'.repeat(101))).toBe(false);
    });
  });

  describe('AuditResult Caching', () => {
    const mockAudit: AuditResult = {
      document_id: 'doc_valid_test_01',
      summary: 'Executive summary test',
      primary_concerns: ['Concern 1'],
      findings: [],
      metadata: {
        audited_at: '2026-09-19T10:00:00.000Z',
        model_used: 'mock-evaluator',
        duration_ms: 1200,
        total_clauses_analyzed: 5,
        total_findings_count: 0,
        verified_count: 0,
        unverified_count: 0,
        rejected_count: 0,
        file_name: 'test_agreement.txt',
      },
    };

    it('stores and retrieves an AuditResult by document_id', () => {
      reportStore.saveAuditResult(mockAudit);
      const retrieved = reportStore.getAuditResult('doc_valid_test_01');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.document_id).toBe('doc_valid_test_01');
      expect(retrieved?.summary).toBe('Executive summary test');
    });

    it('returns null for non-existent or invalid document IDs', () => {
      expect(reportStore.getAuditResult('non_existent_id')).toBeNull();
      expect(reportStore.getAuditResult('../invalid')).toBeNull();
      expect(reportStore.getAuditResult('')).toBeNull();
    });

    it('does not store results with invalid document_id', () => {
      const invalidAudit = { ...mockAudit, document_id: '../evil' };
      reportStore.saveAuditResult(invalidAudit);
      expect(reportStore.getAuditResult('../evil')).toBeNull();
    });

    it('clears all cached entries when clear() is called', () => {
      reportStore.saveAuditResult(mockAudit);
      expect(reportStore.getAuditResult('doc_valid_test_01')).not.toBeNull();
      reportStore.clear();
      expect(reportStore.getAuditResult('doc_valid_test_01')).toBeNull();
    });
  });

  describe('ComparisonResult Caching', () => {
    const mockDocMeta = {
      document_id: 'doc_1',
      file_name: 'Contract_A.txt',
      file_size_bytes: 500,
      format: 'text/plain' as const,
      extension: 'txt' as const,
      created_at: '2026-09-19T10:00:00.000Z',
      sha256_hash: 'hash1',
      page_count: 1,
      character_count: 500,
      word_count: 100,
    };

    const mockComparison: ComparisonResult = {
      comparison_id: 'comp_valid_test_01',
      summary: 'Comparison summary test',
      findings: [],
      metadata: {
        comparison_id: 'comp_valid_test_01',
        timestamp: '2026-09-19T10:00:00.000Z',
        contract_a_metadata: mockDocMeta,
        contract_b_metadata: { ...mockDocMeta, document_id: 'doc_2', file_name: 'Contract_B.txt' },
        aligned_pairs_count: 5,
        total_findings_count: 0,
        verified_findings_count: 0,
        unverified_findings_count: 0,
        rejected_findings_count: 0,
        duration_ms: 1500,
        provider_used: 'mock',
        model_used: 'mock-evaluator',
        prompt_version: '1.0',
        processing_status: 'completed',
        disclaimer: 'Disclaimer test',
      },
      disclaimer: 'Disclaimer test',
    };

    it('stores and retrieves a ComparisonResult by comparison_id', () => {
      reportStore.saveComparisonResult(mockComparison);
      const retrieved = reportStore.getComparisonResult('comp_valid_test_01');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.comparison_id).toBe('comp_valid_test_01');
      expect(retrieved?.summary).toBe('Comparison summary test');
    });

    it('returns null for non-existent or invalid comparison IDs', () => {
      expect(reportStore.getComparisonResult('non_existent_comp')).toBeNull();
      expect(reportStore.getComparisonResult('../path_attack')).toBeNull();
    });

    it('does not store comparison results with invalid comparison_id', () => {
      const invalidComp = { ...mockComparison, comparison_id: '/etc/shadow' };
      reportStore.saveComparisonResult(invalidComp);
      expect(reportStore.getComparisonResult('/etc/shadow')).toBeNull();
    });
  });
});
