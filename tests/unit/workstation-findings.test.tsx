import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FindingCard } from '@/components/workstation/FindingCard';
import { FilterSortToolbar } from '@/components/workstation/FilterSortToolbar';
import { MetricsBar } from '@/components/workstation/MetricsBar';
import { Finding, AuditMetadata } from '@/types/domain';

const mockFindings: Finding[] = [
  {
    finding_id: 'find_001',
    clause_id: 'clause_002',
    category: 'INDEMNIFICATION',
    attention_level: 'HIGH_ATTENTION',
    title: 'Unilateral Indemnity Exposure',
    verbatim_quote: 'Contractor agrees to defend and indemnify Client.',
    plain_language_explanation: 'You must pay all legal defense costs for third-party claims.',
    why_it_matters: 'Creates uncapped financial liability.',
    evidence: 'Expressed unilaterally in Clause 2.',
    suggested_question_for_counsel: 'Can this indemnity be made mutual?',
    verification_status: 'VERIFIED_EXACT',
    page_number: 1,
    matched_range: { start: 10, end: 57 },
  },
  {
    finding_id: 'find_002',
    clause_id: 'clause_005',
    category: 'TERMINATION_RIGHTS',
    attention_level: 'MEDIUM_ATTENTION',
    title: 'Short Termination Notice Window',
    verbatim_quote: 'Client may terminate upon five days written notice.',
    plain_language_explanation: 'The client can cancel with almost no warning.',
    why_it_matters: 'Operational cash flow risk.',
    evidence: 'Asymmetrical notice provision.',
    suggested_question_for_counsel: 'Can we increase notice to 30 days?',
    verification_status: 'VERIFIED_EXACT',
    page_number: 2,
  },
  {
    finding_id: 'find_003',
    clause_id: 'clause_007',
    category: 'GOVERNING_LAW_DISPUTES',
    attention_level: 'STANDARD_NOTICE',
    title: 'New York Jurisdiction',
    verbatim_quote: 'Governed by the laws of New York.',
    plain_language_explanation: 'Disputes will be heard in New York state courts.',
    why_it_matters: 'Travel costs if litigation arises.',
    evidence: 'Standard choice of law.',
    suggested_question_for_counsel: 'Is this forum convenient?',
    verification_status: 'VERIFIED_EXACT',
    page_number: 3,
  },
];

const mockMetadata: AuditMetadata = {
  audited_at: new Date().toISOString(),
  model_used: 'gemini-2.5-flash',
  duration_ms: 1200,
  total_clauses_analyzed: 7,
  total_findings_count: 3,
  verified_count: 3,
  unverified_count: 0,
  rejected_count: 0,
};

describe('FindingCard Component', () => {
  it('renders attention badge, title, summary, why-it-matters, and source reference', () => {
    const onSelect = vi.fn();
    render(<FindingCard finding={mockFindings[0]} onSelect={onSelect} />);

    expect(screen.getByText('HIGH ATTENTION')).toBeDefined();
    expect(screen.getByText('INDEMNIFICATION')).toBeDefined();
    expect(screen.getByText('Unilateral Indemnity Exposure')).toBeDefined();
    expect(
      screen.getByText('You must pay all legal defense costs for third-party claims.')
    ).toBeDefined();
    expect(screen.getByText('Creates uncapped financial liability.')).toBeDefined();
    expect(screen.getByText(/Clause: clause_002/i)).toBeDefined();
    expect(screen.getByText('Verified')).toBeDefined();
  });

  it('triggers onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<FindingCard finding={mockFindings[0]} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Unilateral Indemnity Exposure'));
    expect(onSelect).toHaveBeenCalledWith(mockFindings[0]);
  });
});

describe('MetricsBar Component', () => {
  it('displays accurate counts for total, high, medium, and notices', () => {
    render(<MetricsBar findings={mockFindings} metadata={mockMetadata} />);

    expect(screen.getByText('3')).toBeDefined(); // Total
    expect(screen.getAllByText('1')).toHaveLength(3); // High, Medium, Notice counts
    expect(screen.getByText('Verified Source Grounded')).toBeDefined();
  });
});

describe('FilterSortToolbar Component', () => {
  it('triggers filter change when clicking tabs', () => {
    const onFilterChange = vi.fn();
    const onCategoryChange = vi.fn();
    const onSortChange = vi.fn();

    render(
      <FilterSortToolbar
        findings={mockFindings}
        activeFilter="ALL"
        onFilterChange={onFilterChange}
        selectedCategory="ALL"
        onCategoryChange={onCategoryChange}
        activeSort="ATTENTION_DESC"
        onSortChange={onSortChange}
      />
    );

    const highTab = screen.getByText(/High Attention \(1\)/i);
    fireEvent.click(highTab);
    expect(onFilterChange).toHaveBeenCalledWith('HIGH');

    const mediumTab = screen.getByText(/Medium Attention \(1\)/i);
    fireEvent.click(mediumTab);
    expect(onFilterChange).toHaveBeenCalledWith('MEDIUM');
  });
});
