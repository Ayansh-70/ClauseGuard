import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EvidenceNavigator } from '@/components/workstation/EvidenceNavigator';
import { Finding, ComparisonFinding } from '@/types/domain';

const mockAuditFinding1: Finding = {
  finding_id: 'find_001',
  clause_id: 'clause_002',
  category: 'INDEMNIFICATION',
  attention_level: 'HIGH_ATTENTION',
  title: 'Unilateral Indemnity Exposure',
  verbatim_quote: 'Contractor agrees to indemnify and hold harmless Client.',
  plain_language_explanation: 'You must pay all legal defense costs for third-party claims.',
  why_it_matters: 'Creates uncapped financial liability.',
  evidence: 'Clause 2 unilateral expression.',
  suggested_question_for_counsel: 'Can this indemnity be made mutual and capped?',
  verification_status: 'VERIFIED_EXACT',
  page_number: 2,
};

const mockAuditFinding2: Finding = {
  finding_id: 'find_002',
  clause_id: 'clause_005',
  category: 'TERMINATION_RIGHTS',
  attention_level: 'MEDIUM_ATTENTION',
  title: 'Immediate Termination Without Cause',
  verbatim_quote: 'Client may terminate immediately upon notice.',
  plain_language_explanation: 'The client can cancel with zero advance warning.',
  why_it_matters: 'Severe cash flow uncertainty.',
  evidence: 'Clause 5 notice terms.',
  suggested_question_for_counsel: 'Request 30 days minimum notice.',
  verification_status: 'VERIFIED_EXACT',
  page_number: 4,
};

const mockComparisonFindingChanged: ComparisonFinding = {
  id: 'comp_001',
  status: 'changed',
  category: 'liability',
  title: 'Liability Cap Reduced to 1x Fees',
  plain_english_summary: 'Liability was capped at 3x annual fees in Contract A, but reduced to 1x in Contract B.',
  practical_implication: 'Reduces recovery in the event of vendor breach.',
  attention_level: 'HIGH_ATTENTION',
  confidence: 0.95,
  verification_status: 'VERIFIED_EXACT',
  contract_a_source: {
    document_id: 'doc_a_123',
    clause_id: 'clause_008',
    page_number: 5,
    exact_quote: 'Aggregate liability shall not exceed three times (3x) annual fees paid.',
  },
  contract_b_source: {
    document_id: 'doc_b_456',
    clause_id: 'clause_009',
    page_number: 6,
    exact_quote: 'Aggregate liability shall be capped at one times (1x) total fees paid.',
  },
  suggested_question_for_counsel: 'Can we insist on maintaining the 3x cap from Contract A?',
};

const mockComparisonFindingAdded: ComparisonFinding = {
  id: 'comp_002',
  status: 'added',
  category: 'data_protection',
  title: 'New Mandatory Security Audit Provision',
  plain_english_summary: 'Contract B introduces an annual third-party SOC 2 security audit requirement.',
  practical_implication: 'Imposes recurring compliance and auditing costs on the vendor.',
  attention_level: 'MEDIUM_ATTENTION',
  confidence: 0.9,
  verification_status: 'VERIFIED_EXACT',
  // contract_a_source is undefined (asymmetric provision added in B)
  contract_b_source: {
    document_id: 'doc_b_456',
    clause_id: 'clause_012',
    page_number: 8,
    exact_quote: 'Vendor shall undergo an annual SOC 2 Type II examination at its sole expense.',
  },
};

const mockComparisonFindingRemoved: ComparisonFinding = {
  id: 'comp_003',
  status: 'removed',
  category: 'intellectual_property',
  title: 'Work-for-Hire Assignment Clause Omitted',
  plain_english_summary: 'The IP work-for-hire assignment from Contract A was deleted in Contract B.',
  practical_implication: 'Customer may not own custom deliverables created by vendor.',
  attention_level: 'HIGH_ATTENTION',
  confidence: 0.92,
  verification_status: 'VERIFIED_EXACT',
  contract_a_source: {
    document_id: 'doc_a_123',
    clause_id: 'clause_004',
    page_number: 3,
    exact_quote: 'All Work Product shall be deemed work made for hire.',
  },
  // contract_b_source is undefined (asymmetric provision removed in B)
};

describe('EvidenceNavigator Component', () => {
  beforeEach(() => {
    // Reset global fetch mock
    vi.restoreAllMocks();
  });

  describe('Mode A: Single Audit Evidence', () => {
    it('renders audit finding header, title, badges, and plain explanation', () => {
      const onClose = vi.fn();
      render(
        <EvidenceNavigator
          mode="audit"
          finding={mockAuditFinding1}
          fileName="Master_Agreement.pdf"
          onClose={onClose}
        />
      );

      expect(screen.getByText('Grounded Audit Evidence')).toBeDefined();
      expect(screen.getByText('Master_Agreement.pdf')).toBeDefined();
      expect(screen.getByText('Unilateral Indemnity Exposure')).toBeDefined();
      expect(screen.getByText('HIGH ATTENTION')).toBeDefined();
      expect(screen.getByText('INDEMNIFICATION')).toBeDefined();
      expect(screen.getByText('Clause: clause_002')).toBeDefined();
      expect(screen.getByText('Page: 2')).toBeDefined();
      expect(
        screen.getByText('You must pay all legal defense costs for third-party claims.')
      ).toBeDefined();
    });

    it('highlights quote text using a semantic mark tag', () => {
      const onClose = vi.fn();
      const rawText =
        'Section 2. Contractor agrees to indemnify and hold harmless Client. Such indemnity shall survive termination.';

      const { container } = render(
        <EvidenceNavigator
          mode="audit"
          finding={mockAuditFinding1}
          rawTextFallback={rawText}
          onClose={onClose}
        />
      );

      const markElements = container.querySelectorAll('mark');
      expect(markElements.length).toBeGreaterThan(0);
      expect(markElements[0].textContent).toBe(mockAuditFinding1.verbatim_quote);
    });

    it('renders counsel question with copy button', () => {
      const onClose = vi.fn();
      render(
        <EvidenceNavigator
          mode="audit"
          finding={mockAuditFinding1}
          onClose={onClose}
        />
      );

      expect(screen.getByText('Targeted Question for Legal Counsel')).toBeDefined();
      expect(screen.getByText('Can this indemnity be made mutual and capped?')).toBeDefined();
      expect(screen.getByText('Copy')).toBeDefined();
    });

    it('allows toggling surrounding context visibility', () => {
      const onClose = vi.fn();
      render(
        <EvidenceNavigator
          mode="audit"
          finding={mockAuditFinding1}
          onClose={onClose}
        />
      );

      const toggleButton = screen.getByText('Hide Surrounding Context');
      expect(toggleButton).toBeDefined();
      fireEvent.click(toggleButton);
      expect(screen.getByText('Show Surrounding Context')).toBeDefined();
    });

    it('supports Next and Previous finding navigation', () => {
      const onClose = vi.fn();
      const onSelect = vi.fn();

      render(
        <EvidenceNavigator
          mode="audit"
          finding={mockAuditFinding1}
          allAuditFindings={[mockAuditFinding1, mockAuditFinding2]}
          onSelectAuditFinding={onSelect}
          onClose={onClose}
        />
      );

      expect(screen.getByText('1/2')).toBeDefined();
      const nextBtn = screen.getByLabelText('Next finding');
      fireEvent.click(nextBtn);
      expect(onSelect).toHaveBeenCalledWith(mockAuditFinding2);
    });

    it('triggers onClose when Close button or Done button is clicked', () => {
      const onClose = vi.fn();
      render(
        <EvidenceNavigator
          mode="audit"
          finding={mockAuditFinding1}
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByText('Done'));
      expect(onClose).toHaveBeenCalled();

      fireEvent.click(screen.getByLabelText('Close navigator'));
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('closes on Escape key press', () => {
      const onClose = vi.fn();
      render(
        <EvidenceNavigator
          mode="audit"
          finding={mockAuditFinding1}
          onClose={onClose}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mode B: Contract Comparison Evidence', () => {
    it('renders comparison finding with side-by-side Contract A and B evidence', () => {
      const onClose = vi.fn();
      const { container } = render(
        <EvidenceNavigator
          mode="compare"
          comparisonFinding={mockComparisonFindingChanged}
          contractA_name="Contract_v1.txt"
          contractB_name="Contract_v2.txt"
          onClose={onClose}
        />
      );

      expect(screen.getByText('Contract Comparison Evidence')).toBeDefined();
      expect(screen.getByText('Liability Cap Reduced to 1x Fees')).toBeDefined();
      expect(screen.getByText('Contract A (Baseline)')).toBeDefined();
      expect(screen.getByText('Contract B (Revised)')).toBeDefined();

      // Check highlights in both panes
      const marks = container.querySelectorAll('mark');
      expect(marks.length).toBe(2);
      expect(marks[0].textContent).toBe(mockComparisonFindingChanged.contract_a_source?.exact_quote);
      expect(marks[1].textContent).toBe(mockComparisonFindingChanged.contract_b_source?.exact_quote);
    });

    it('handles asymmetric provision: displays clear notice for newly added terms (absent in Contract A)', () => {
      const onClose = vi.fn();
      render(
        <EvidenceNavigator
          mode="compare"
          comparisonFinding={mockComparisonFindingAdded}
          onClose={onClose}
        />
      );

      expect(
        screen.getByText('No corresponding provision found in Contract A')
      ).toBeDefined();
      expect(
        screen.getByText('This term is uniquely introduced in Contract B (Revised version).')
      ).toBeDefined();
      expect(
        screen.getByText(mockComparisonFindingAdded.contract_b_source!.exact_quote)
      ).toBeDefined();
    });

    it('handles asymmetric provision: displays clear notice for removed terms (omitted in Contract B)', () => {
      const onClose = vi.fn();
      render(
        <EvidenceNavigator
          mode="compare"
          comparisonFinding={mockComparisonFindingRemoved}
          onClose={onClose}
        />
      );

      expect(
        screen.getByText('Provision omitted in Contract B')
      ).toBeDefined();
      expect(
        screen.getByText('This term was present in Contract A but was deleted in Contract B.')
      ).toBeDefined();
      expect(
        screen.getByText(mockComparisonFindingRemoved.contract_a_source!.exact_quote)
      ).toBeDefined();
    });

    it('allows switching between Side-by-Side, Contract A tab, and Contract B tab', () => {
      const onClose = vi.fn();
      render(
        <EvidenceNavigator
          mode="compare"
          comparisonFinding={mockComparisonFindingChanged}
          onClose={onClose}
        />
      );

      const contractATab = screen.getByText('Contract A');
      fireEvent.click(contractATab);

      // In Contract A tab, Contract B header is not shown
      expect(screen.getByText('Contract A (Baseline)')).toBeDefined();
      expect(screen.queryByText('Contract B (Revised)')).toBeNull();

      const contractBTab = screen.getByText('Contract B');
      fireEvent.click(contractBTab);
      expect(screen.getByText('Contract B (Revised)')).toBeDefined();
      expect(screen.queryByText('Contract A (Baseline)')).toBeNull();

      const sideBySideTab = screen.getByText('Side-by-Side');
      fireEvent.click(sideBySideTab);
      expect(screen.getByText('Contract A (Baseline)')).toBeDefined();
      expect(screen.getByText('Contract B (Revised)')).toBeDefined();
    });
  });
});
