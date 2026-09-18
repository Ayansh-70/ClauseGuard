import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FindingDetailModal } from '@/components/workstation/FindingDetailModal';
import { Finding } from '@/types/domain';

const mockFinding: Finding = {
  finding_id: 'find_001',
  clause_id: 'clause_003',
  category: 'INDEMNIFICATION',
  attention_level: 'HIGH_ATTENTION',
  title: 'Unilateral Indemnification Obligation',
  verbatim_quote:
    'Consultant agrees to defend, indemnify, and hold harmless Client from any and all claims.',
  plain_language_explanation:
    'You are legally bound to pay Client defense costs in any lawsuit brought by third parties.',
  why_it_matters:
    'This shifts uncapped financial litigation exposure onto the Consultant without reciprocal protection.',
  evidence: 'Clause 3 does not include any mutual indemnity from Client.',
  suggested_question_for_counsel:
    'Can we make this indemnity clause mutual and cap total liability to contract value?',
  verification_status: 'VERIFIED_EXACT',
  page_number: 1,
  matched_range: { start: 120, end: 210 },
};

describe('FindingDetailModal & Source Evidence View', () => {
  it('renders full explanation, commercial impact, and verified source evidence box', () => {
    const onClose = vi.fn();
    render(<FindingDetailModal finding={mockFinding} onClose={onClose} />);

    // Titles and sections
    expect(screen.getByText('Unilateral Indemnification Obligation')).toBeDefined();
    expect(screen.getByText(/Plain-English Explanation/i)).toBeDefined();
    expect(
      screen.getByText(
        'You are legally bound to pay Client defense costs in any lawsuit brought by third parties.'
      )
    ).toBeDefined();

    // Commercial risk
    expect(screen.getByText(/Commercial Risk & Practical Implication/i)).toBeDefined();

    // Central Product Feature: Source Evidence View
    expect(screen.getByText(/Original Document Evidence/i)).toBeDefined();
    expect(screen.getByText(/VERIFIED AGAINST DOCUMENT/i)).toBeDefined();
    expect(screen.getByText(/clause_003/i)).toBeDefined();
    expect(screen.getByText(/Offset: \[120\.\.210\]/i)).toBeDefined();
    expect(
      screen.getByText(
        /Consultant agrees to defend, indemnify, and hold harmless Client from any and all claims\./i
      )
    ).toBeDefined();

    // Questions for counsel
    expect(screen.getByText(/Targeted Questions for Legal Counsel/i)).toBeDefined();
    expect(
      screen.getByText(
        'Can we make this indemnity clause mutual and cap total liability to contract value?'
      )
    ).toBeDefined();
  });

  it('triggers onClose when clicking close button or pressing Escape key', () => {
    const onClose = vi.fn();
    render(<FindingDetailModal finding={mockFinding} onClose={onClose} />);

    const closeBtn = screen.getByLabelText(/Close details/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();

    // Test Escape key
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
