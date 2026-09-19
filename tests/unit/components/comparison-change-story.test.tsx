import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComparisonChangeStory } from '@/components/workstation/ComparisonChangeStory';
import { ComparisonFinding } from '@/types/domain';

describe('ComparisonChangeStory Component', () => {
  const mockComparisonFindings: ComparisonFinding[] = [
    {
      id: 'cmp_find_001',
      category: 'payment',
      status: 'changed',
      attention_level: 'HIGH_ATTENTION',
      title: 'Payment Window Modified',
      plain_english_summary: 'Net-30 was changed to Net-60 in revised version.',
      practical_implication: 'Delays payment collection by 30 days.',
      confidence: 0.95,
      verification_status: 'VERIFIED_EXACT',
      contract_a_source: {
        document_id: 'doc_a',
        clause_id: 'clause_a_001',
        exact_quote: 'Payment within 30 days.',
      },
      contract_b_source: {
        document_id: 'doc_b',
        clause_id: 'clause_b_001',
        exact_quote: 'Payment within 60 days.',
      },
      suggested_question_for_counsel: 'Can Net-30 terms be reinstated?',
    },
    {
      id: 'cmp_find_002',
      category: 'audit_rights',
      status: 'added',
      attention_level: 'MEDIUM_ATTENTION',
      title: 'Security Audit Rights Added',
      plain_english_summary: 'Client granted annual audit rights.',
      practical_implication: 'New compliance burden on vendor.',
      confidence: 0.9,
      verification_status: 'VERIFIED_EXACT',
      contract_b_source: {
        document_id: 'doc_b',
        clause_id: 'clause_b_005',
        exact_quote: 'Client may conduct annual security audits.',
      },
    },
    {
      id: 'cmp_find_003',
      category: 'confidentiality',
      status: 'same',
      attention_level: 'STANDARD_NOTICE',
      title: 'Confidentiality Obligations Identical',
      plain_english_summary: 'Both agreements retain 3-year confidentiality.',
      practical_implication: 'No change to commercial risk.',
      confidence: 0.98,
      verification_status: 'VERIFIED_EXACT',
      contract_a_source: {
        document_id: 'doc_a',
        clause_id: 'clause_a_003',
        exact_quote: 'Confidentiality shall survive for 3 years.',
      },
      contract_b_source: {
        document_id: 'doc_b',
        clause_id: 'clause_b_003',
        exact_quote: 'Confidentiality shall survive for 3 years.',
      },
    },
  ];

  it('renders null when findings array is empty', () => {
    const { container } = render(
      <ComparisonChangeStory findings={[]} onSelectFinding={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders executive change story header and metrics rollup', () => {
    render(
      <ComparisonChangeStory findings={mockComparisonFindings} onSelectFinding={vi.fn()} />
    );

    expect(screen.getByText('Executive Change Story')).toBeDefined();
    expect(
      screen.getByText(/Don't read both contracts line by line/i)
    ).toBeDefined();

    // Metric badges
    expect(screen.getByText(/2 Categories Modified/i)).toBeDefined();
    expect(screen.getByText(/1 Unchanged/i)).toBeDefined();
    expect(screen.getByText(/1 modified terms/i)).toBeDefined();
    expect(screen.getByText(/1 newly added obligations/i)).toBeDefined();
  });

  it('groups findings by category and displays change details', () => {
    render(
      <ComparisonChangeStory findings={mockComparisonFindings} onSelectFinding={vi.fn()} />
    );

    // Formatted Categories (snake_case replaced with spaces)
    expect(screen.getByText('payment')).toBeDefined();
    expect(screen.getByText('audit rights')).toBeDefined();
    expect(screen.getByText('confidentiality')).toBeDefined();

    // Plain English change summaries
    expect(screen.getByText('Net-30 was changed to Net-60 in revised version.')).toBeDefined();
    expect(screen.getByText('Client granted annual audit rights.')).toBeDefined();

    // Dual clause pointers
    expect(screen.getByText('A: clause_a_001')).toBeDefined();
    expect(screen.getByText('B: clause_b_001')).toBeDefined();
    expect(screen.getByText('B: clause_b_005')).toBeDefined();
  });

  it('fires onSelectFinding when category card is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ComparisonChangeStory findings={mockComparisonFindings} onSelectFinding={onSelect} />
    );

    const categoryCard = screen.getByRole('button', {
      name: /Inspect category change: payment/i,
    });

    fireEvent.click(categoryCard);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockComparisonFindings[0]);

    fireEvent.keyDown(categoryCard, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});
