import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PriorityReviewSection } from '@/components/workstation/PriorityReviewSection';
import { Finding } from '@/types/domain';

describe('PriorityReviewSection Component', () => {
  const mockFindings: Finding[] = [
    {
      finding_id: 'find_001',
      clause_id: 'clause_001',
      category: 'TERMINATION_RIGHTS',
      attention_level: 'LOW_ATTENTION',
      title: 'Standard Notice Window',
      verbatim_quote: 'Either party may terminate with 30 days notice.',
      plain_language_explanation: 'Standard termination window provided.',
      why_it_matters: 'Operational notice requirement.',
      evidence: 'Section 4.',
      suggested_question_for_counsel: 'Is 30 days sufficient?',
      confidence: 0.9,
      verification_status: 'VERIFIED_EXACT',
    },
    {
      finding_id: 'find_002',
      clause_id: 'clause_002',
      category: 'INDEMNIFICATION',
      attention_level: 'HIGH_ATTENTION',
      title: 'Uncapped Indemnity Clause',
      verbatim_quote: 'Contractor shall defend and hold harmless Client from all claims.',
      plain_language_explanation: 'Indemnity is one-sided and uncapped.',
      why_it_matters: 'Creates unlimited balance-sheet exposure.',
      evidence: 'Section 8.',
      suggested_question_for_counsel: 'Can indemnity be capped at contract value?',
      confidence: 0.95,
      verification_status: 'VERIFIED_EXACT',
    },
    {
      finding_id: 'find_003',
      clause_id: 'clause_003',
      category: 'LIABILITY_LIMITS',
      attention_level: 'HIGH_ATTENTION',
      title: 'Waiver of Consequential Damages Excluded',
      verbatim_quote: 'Liability shall not exclude lost profits or consequential damages.',
      plain_language_explanation: 'Special damages are not disclaimed.',
      why_it_matters: 'Leaves vendor open to consequential damages.',
      evidence: 'Section 9.',
      suggested_question_for_counsel: 'Add mutual consequential damages waiver.',
      confidence: 0.85,
      verification_status: 'VERIFIED_EXACT',
    },
    {
      finding_id: 'find_004',
      clause_id: 'clause_004',
      category: 'PAYMENT_TERMS',
      attention_level: 'MEDIUM_ATTENTION',
      title: 'Net 90 Payment Terms',
      verbatim_quote: 'Invoices payable within 90 days of receipt.',
      plain_language_explanation: 'Delayed payment timeline.',
      why_it_matters: 'Puts strain on working capital.',
      evidence: 'Section 3.',
      suggested_question_for_counsel: 'Can Net-90 be reduced to Net-30?',
      confidence: 0.88,
      verification_status: 'VERIFIED_NORMALIZED',
    },
  ];

  it('renders null when findings list is empty', () => {
    const { container } = render(
      <PriorityReviewSection findings={[]} onSelectFinding={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('deterministically selects and ranks the top 3 findings', () => {
    render(
      <PriorityReviewSection findings={mockFindings} onSelectFinding={vi.fn()} />
    );

    // Section header
    expect(screen.getByText('Priority Review — Start Here')).toBeDefined();
    expect(screen.getByText('Top 3 of 4 findings')).toBeDefined();

    // Top finding (HIGH_ATTENTION with 0.95 confidence)
    expect(screen.getByText('Uncapped Indemnity Clause')).toBeDefined();
    // Second finding (HIGH_ATTENTION with 0.85 confidence)
    expect(screen.getByText('Waiver of Consequential Damages Excluded')).toBeDefined();
    // Third finding (MEDIUM_ATTENTION)
    expect(screen.getByText('Net 90 Payment Terms')).toBeDefined();

    // 4th finding (LOW_ATTENTION) should NOT be in the top 3
    expect(screen.queryByText('Standard Notice Window')).toBeNull();
  });

  it('renders why-it-matters and verification badge', () => {
    render(
      <PriorityReviewSection findings={mockFindings} onSelectFinding={vi.fn()} />
    );

    expect(screen.getByText('Creates unlimited balance-sheet exposure.')).toBeDefined();
    expect(screen.getByText('Leaves vendor open to consequential damages.')).toBeDefined();
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
  });

  it('fires onSelectFinding when card is clicked or activated with keyboard', () => {
    const onSelect = vi.fn();
    render(
      <PriorityReviewSection findings={mockFindings} onSelectFinding={onSelect} />
    );

    const card = screen.getByRole('button', {
      name: /Inspect priority finding: Uncapped Indemnity Clause/i,
    });

    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockFindings[1]);

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});
