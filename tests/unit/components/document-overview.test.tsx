import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentOverview } from '@/components/workstation/DocumentOverview';
import { AuditMetadata } from '@/types/domain';

describe('DocumentOverview Component', () => {
  const mockMetadata: AuditMetadata = {
    audited_at: '2026-09-19T10:00:00.000Z',
    model_used: 'gemini-2.5-flash',
    duration_ms: 2450,
    total_clauses_analyzed: 14,
    total_findings_count: 5,
    verified_count: 5,
    unverified_count: 0,
    rejected_count: 0,
    page_count: 3,
    file_name: 'Master_Services_Consulting_Agreement.pdf',
    character_count: 12500,
  };

  it('renders document filename, document ID, and Audit Complete indicator', () => {
    render(
      <DocumentOverview
        fileName="Master_Services_Consulting_Agreement.pdf"
        documentId="doc_abc123"
        metadata={mockMetadata}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('Master_Services_Consulting_Agreement.pdf')).toBeDefined();
    expect(screen.getByText(/ID: doc_abc123/i)).toBeDefined();
    expect(screen.getByText('Audit Complete')).toBeDefined();
  });

  it('correctly infers document classifications from filename', () => {
    const { rerender } = render(
      <DocumentOverview
        fileName="Master_Consulting_Agreement.txt"
        documentId="doc_001"
        metadata={mockMetadata}
        onReset={vi.fn()}
      />
    );
    expect(screen.getAllByText('Commercial Consulting / Services Agreement').length).toBeGreaterThan(0);

    rerender(
      <DocumentOverview
        fileName="Bilateral_NDA.pdf"
        documentId="doc_002"
        metadata={mockMetadata}
        onReset={vi.fn()}
      />
    );
    expect(screen.getAllByText('Mutual Non-Disclosure Agreement (NDA)').length).toBeGreaterThan(0);

    rerender(
      <DocumentOverview
        fileName="SaaS_Software_License.md"
        documentId="doc_003"
        metadata={mockMetadata}
        onReset={vi.fn()}
      />
    );
    expect(screen.getAllByText('Software License & Technology Agreement').length).toBeGreaterThan(0);

    rerender(
      <DocumentOverview
        fileName="Executive_Employment_Offer.txt"
        documentId="doc_004"
        metadata={mockMetadata}
        onReset={vi.fn()}
      />
    );
    expect(screen.getAllByText('Employment / Contractor Agreement').length).toBeGreaterThan(0);

    rerender(
      <DocumentOverview
        fileName="Office_Property_Lease.pdf"
        documentId="doc_005"
        metadata={mockMetadata}
        onReset={vi.fn()}
      />
    );
    expect(screen.getAllByText('Commercial Lease Agreement').length).toBeGreaterThan(0);
  });

  it('renders the immediate 3-question executive answers', () => {
    render(
      <DocumentOverview
        fileName="Master_Services_Agreement.pdf"
        documentId="doc_abc123"
        metadata={mockMetadata}
        onReset={vi.fn()}
      />
    );

    // Q1: Classification
    expect(screen.getByText('1. Document Classification')).toBeDefined();
    expect(screen.getByText(/14 clauses across 3 pages/i)).toBeDefined();

    // Q2: Attention Required
    expect(screen.getByText('2. Attention Required')).toBeDefined();
    expect(screen.getByText('5 Total Observations')).toBeDefined();
    expect(screen.getByText('Grounded commercial issue-spotting')).toBeDefined();

    // Q3: Grounded Verification
    expect(screen.getByText('3. Grounded Verification')).toBeDefined();
    expect(screen.getByText('5 of 5 Quotes Verified')).toBeDefined();
    expect(screen.getByText('Checked against source text')).toBeDefined();
  });

  it('renders metadata metrics bar (clauses, duration, inference evaluator)', () => {
    render(
      <DocumentOverview
        fileName="Master_Services_Agreement.pdf"
        documentId="doc_abc123"
        metadata={mockMetadata}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('14 Segmented')).toBeDefined();
    expect(screen.getByText(/2.45s/i)).toBeDefined();
    expect(screen.getByText('gemini-2.5-flash')).toBeDefined();
  });

  it('fires onReset callback when clicking Upload Another Contract button', () => {
    const onReset = vi.fn();
    render(
      <DocumentOverview
        fileName="Master_Services_Agreement.pdf"
        documentId="doc_abc123"
        metadata={mockMetadata}
        onReset={onReset}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Upload Another Contract/i });
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
