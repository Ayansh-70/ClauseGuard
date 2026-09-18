import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComparisonStatusBadge } from '@/components/workstation/ComparisonStatusBadge';
import { ComparisonMetricsBar } from '@/components/workstation/ComparisonMetricsBar';
import { ComparisonFindingCard } from '@/components/workstation/ComparisonFindingCard';
import { ComparisonDetailModal } from '@/components/workstation/ComparisonDetailModal';
import { ComparisonFilterToolbar } from '@/components/workstation/ComparisonFilterToolbar';
import { ComparisonFinding, ComparisonMetadata } from '@/types/domain';

const mockFindings: ComparisonFinding[] = [
  {
    id: 'comp_001',
    status: 'changed',
    category: 'payment',
    title: 'Payment Window Modified',
    plain_english_summary: 'Net-30 was changed to Net-60.',
    practical_implication: 'Delays payment collection by 30 days.',
    attention_level: 'MEDIUM_ATTENTION',
    confidence: 0.95,
    verification_status: 'VERIFIED_EXACT',
    contract_a_source: {
      document_id: 'doc_a',
      clause_id: 'clause_a_001',
      exact_quote: 'Payment within 30 days.',
      page_number: 1,
      number_label: '2.1',
    },
    contract_b_source: {
      document_id: 'doc_b',
      clause_id: 'clause_b_001',
      exact_quote: 'Payment within 60 days.',
      page_number: 1,
      number_label: '2.1',
    },
    suggested_question_for_counsel: 'Can we insist on maintaining Net-30 payment terms?',
  },
  {
    id: 'comp_002',
    status: 'added',
    category: 'obligations',
    title: 'Security Audit Clause Added',
    plain_english_summary: 'Contract B introduces annual facility audit rights.',
    practical_implication: 'Creates new operational inspection burden.',
    attention_level: 'HIGH_ATTENTION',
    confidence: 0.92,
    verification_status: 'VERIFIED_EXACT',
    contract_b_source: {
      document_id: 'doc_b',
      clause_id: 'clause_b_008',
      exact_quote: 'Client may conduct annual security audits.',
      page_number: 2,
    },
    suggested_question_for_counsel: 'Is this audit right reciprocal?',
  },
  {
    id: 'comp_003',
    status: 'removed',
    category: 'non_solicitation',
    title: 'Non-Solicitation Omitted',
    plain_english_summary: 'Non-solicitation restriction was removed in Contract B.',
    practical_implication: 'Staff recruitment is no longer restricted.',
    attention_level: 'HIGH_ATTENTION',
    confidence: 0.9,
    verification_status: 'VERIFIED_EXACT',
    contract_a_source: {
      document_id: 'doc_a',
      clause_id: 'clause_a_005',
      exact_quote: 'Neither party shall solicit employees for 24 months.',
      page_number: 2,
    },
  },
  {
    id: 'comp_004',
    status: 'same',
    category: 'governing_law',
    title: 'Governing Law Substantially Same',
    plain_english_summary: 'Both contracts designate New York law.',
    practical_implication: 'No change in legal forum or governing jurisdiction.',
    attention_level: 'STANDARD_NOTICE',
    confidence: 0.98,
    verification_status: 'VERIFIED_EXACT',
    contract_a_source: {
      document_id: 'doc_a',
      clause_id: 'clause_a_007',
      exact_quote: 'Governed by New York law.',
    },
    contract_b_source: {
      document_id: 'doc_b',
      clause_id: 'clause_b_007',
      exact_quote: 'Interpreted under New York law.',
    },
  },
  {
    id: 'comp_005',
    status: 'ambiguous',
    category: 'liability',
    title: 'Liability Cap Equivalence Uncertain',
    plain_english_summary: 'Wording in Contract B may or may not expand liability.',
    practical_implication: 'Ambiguous wording could lead to disputes.',
    attention_level: 'HIGH_ATTENTION',
    confidence: 0.75,
    verification_status: 'VERIFIED_NORMALIZED',
    contract_a_source: {
      document_id: 'doc_a',
      clause_id: 'clause_a_004',
      exact_quote: 'Liability capped at fees paid in prior 30 days.',
    },
    contract_b_source: {
      document_id: 'doc_b',
      clause_id: 'clause_b_004',
      exact_quote: 'Liability limited to annual amounts paid.',
    },
    suggested_question_for_counsel: 'Does this wording clarify or expand our financial cap?',
  },
];

const mockMetadata: ComparisonMetadata = {
  comparison_id: 'comp_test_123',
  contract_a_metadata: {
    document_id: 'doc_a',
    file_name: 'Original_Agreement.txt',
    file_size_bytes: 1500,
    format: 'text/plain',
    extension: 'txt',
    created_at: new Date().toISOString(),
    sha256_hash: 'a'.repeat(64),
    page_count: 2,
    character_count: 1500,
    word_count: 200,
  },
  contract_b_metadata: {
    document_id: 'doc_b',
    file_name: 'Revised_Proposal.txt',
    file_size_bytes: 1600,
    format: 'text/plain',
    extension: 'txt',
    created_at: new Date().toISOString(),
    sha256_hash: 'b'.repeat(64),
    page_count: 2,
    character_count: 1600,
    word_count: 215,
  },
  timestamp: new Date().toISOString(),
  provider_used: 'mock',
  model_used: 'deterministic-evaluator',
  prompt_version: 'v1.0-grounded-compare',
  processing_status: 'completed',
  duration_ms: 1500,
  aligned_pairs_count: 7,
  total_findings_count: 5,
  verified_findings_count: 5,
  unverified_findings_count: 0,
  rejected_findings_count: 0,
  disclaimer: 'Informational only.',
};

describe('Comparison UI Components', () => {
  describe('ComparisonStatusBadge', () => {
    it('renders all 5 statuses with correct accessible labels', () => {
      const { rerender } = render(<ComparisonStatusBadge status="changed" />);
      expect(screen.getByText('Changed')).toBeDefined();

      rerender(<ComparisonStatusBadge status="added" />);
      expect(screen.getByText('Added in B')).toBeDefined();

      rerender(<ComparisonStatusBadge status="removed" />);
      expect(screen.getByText('Removed in B')).toBeDefined();

      rerender(<ComparisonStatusBadge status="same" />);
      expect(screen.getByText('Substantially Same')).toBeDefined();

      rerender(<ComparisonStatusBadge status="ambiguous" />);
      expect(screen.getByText('Needs Review')).toBeDefined();
    });
  });

  describe('ComparisonMetricsBar', () => {
    it('calculates and renders correct counts for all statuses', () => {
      render(
        <ComparisonMetricsBar
          findings={mockFindings}
          metadata={mockMetadata}
        />
      );

      expect(screen.getByText('Total Findings')).toBeDefined();
      expect(screen.getByText('5')).toBeDefined(); // Total
      expect(screen.getAllByText('1')).toHaveLength(5); // 1 changed, 1 added, 1 removed, 1 ambiguous, 1 same
      expect(screen.getByText('modified')).toBeDefined();
      expect(screen.getByText('5 of 5 findings verified against verbatim text')).toBeDefined();
    });
  });

  describe('ComparisonFindingCard', () => {
    it('renders finding details and triggers selection callback on click and keyboard', () => {
      const onSelect = vi.fn();
      render(<ComparisonFindingCard finding={mockFindings[0]} onSelect={onSelect} />);

      expect(screen.getByText('Payment Window Modified')).toBeDefined();
      expect(screen.getByText('Net-30 was changed to Net-60.')).toBeDefined();
      expect(screen.getByText('A: clause_a_001')).toBeDefined();
      expect(screen.getByText('B: clause_b_001')).toBeDefined();

      const card = screen.getByRole('button', { name: /Payment Window Modified/i });
      fireEvent.click(card);
      expect(onSelect).toHaveBeenCalledWith(mockFindings[0]);

      fireEvent.keyDown(card, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe('ComparisonDetailModal', () => {
    it('renders side-by-side evidence for changed finding', () => {
      const onClose = vi.fn();
      render(<ComparisonDetailModal finding={mockFindings[0]} onClose={onClose} />);

      expect(screen.getByText('Payment Window Modified')).toBeDefined();
      expect(screen.getByText('Net-30 was changed to Net-60.')).toBeDefined();
      expect(screen.getByText('Delays payment collection by 30 days.')).toBeDefined();

      // Side-by-side evidence
      expect(screen.getByText('Contract A (Baseline)')).toBeDefined();
      expect(screen.getByText('“Payment within 30 days.”')).toBeDefined();
      expect(screen.getByText('Verified against Contract A')).toBeDefined();

      expect(screen.getByText('Contract B (Revised)')).toBeDefined();
      expect(screen.getByText('“Payment within 60 days.”')).toBeDefined();
      expect(screen.getByText('Verified against Contract B')).toBeDefined();
    });

    it('renders asymmetric "added" finding with clear placeholder in Contract A', () => {
      const onClose = vi.fn();
      render(<ComparisonDetailModal finding={mockFindings[1]} onClose={onClose} />);

      expect(screen.getByText('Security Audit Clause Added')).toBeDefined();
      expect(screen.getByText('No corresponding provision found')).toBeDefined();
      expect(screen.getByText('“Client may conduct annual security audits.”')).toBeDefined();
    });

    it('renders asymmetric "removed" finding with clear placeholder in Contract B', () => {
      const onClose = vi.fn();
      render(<ComparisonDetailModal finding={mockFindings[2]} onClose={onClose} />);

      expect(screen.getByText('Non-Solicitation Omitted')).toBeDefined();
      expect(screen.getByText('“Neither party shall solicit employees for 24 months.”')).toBeDefined();
      expect(screen.getByText('No corresponding provision found')).toBeDefined();
    });

    it('renders ambiguity alert for ambiguous finding', () => {
      const onClose = vi.fn();
      render(<ComparisonDetailModal finding={mockFindings[4]} onClose={onClose} />);

      expect(screen.getByText('Correspondence Uncertain (Needs Review)')).toBeDefined();
    });

    it('copies question for counsel when copy button is clicked', () => {
      // Mock clipboard writeText
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      const onClose = vi.fn();
      render(<ComparisonDetailModal finding={mockFindings[0]} onClose={onClose} />);

      const copyBtn = screen.getByRole('button', { name: /Copy Question/i });
      fireEvent.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledWith(
        'Can we insist on maintaining Net-30 payment terms?'
      );
    });

    it('closes modal on Escape key', () => {
      const onClose = vi.fn();
      render(<ComparisonDetailModal finding={mockFindings[0]} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('ComparisonFilterToolbar', () => {
    it('triggers status change callback when clicking status tab', () => {
      const onStatusChange = vi.fn();
      render(
        <ComparisonFilterToolbar
          findings={mockFindings}
          activeStatus="ALL"
          onStatusChange={onStatusChange}
          selectedCategory="ALL"
          onCategoryChange={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
          hideSame={false}
          onToggleHideSame={vi.fn()}
        />
      );

      const changedTab = screen.getByRole('tab', { name: /Changed/i });
      fireEvent.click(changedTab);
      expect(onStatusChange).toHaveBeenCalledWith('changed');
    });

    it('triggers category and search change callbacks', () => {
      const onCategoryChange = vi.fn();
      const onSearchChange = vi.fn();
      render(
        <ComparisonFilterToolbar
          findings={mockFindings}
          activeStatus="ALL"
          onStatusChange={vi.fn()}
          selectedCategory="ALL"
          onCategoryChange={onCategoryChange}
          searchQuery=""
          onSearchChange={onSearchChange}
          hideSame={false}
          onToggleHideSame={vi.fn()}
        />
      );

      const searchInput = screen.getByLabelText('Search comparison findings');
      fireEvent.change(searchInput, { target: { value: 'payment' } });
      expect(onSearchChange).toHaveBeenCalledWith('payment');

      const categorySelect = screen.getByLabelText('Filter findings by category');
      fireEvent.change(categorySelect, { target: { value: 'payment' } });
      expect(onCategoryChange).toHaveBeenCalledWith('payment');
    });
  });
});
