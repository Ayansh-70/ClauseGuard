import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkspacePage from '@/app/workspace/page';

describe('Browser Storage Privacy Audit (No Sensitive Contract Storage)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('purges any legacy sensitive contract items on initial mount', () => {
    // Seed storage with hypothetical legacy data
    sessionStorage.setItem('clauseguard_active_audit', '{"sensitive":"contract_text"}');
    sessionStorage.setItem('clauseguard_active_filename', 'Confidential_Merger.pdf');
    sessionStorage.setItem('clauseguard_active_compare', '{"sensitive":"comparison_data"}');

    render(<WorkspacePage />);

    // Sensitive items must be purged immediately
    expect(sessionStorage.getItem('clauseguard_active_audit')).toBeNull();
    expect(sessionStorage.getItem('clauseguard_active_filename')).toBeNull();
    expect(sessionStorage.getItem('clauseguard_active_compare')).toBeNull();
  });

  it('persists only harmless UI mode preference and no contract text when switching modes', () => {
    render(<WorkspacePage />);

    // Find and click "Compare Contracts" mode button in header
    const compareModeBtn = screen.getByRole('button', { name: /Compare Contracts/i });
    fireEvent.click(compareModeBtn);

    // Verify mode is stored
    expect(sessionStorage.getItem('clauseguard_active_mode')).toBe('compare');

    // Verify no contract content is stored anywhere in sessionStorage or localStorage
    expect(sessionStorage.getItem('clauseguard_active_audit')).toBeNull();
    expect(sessionStorage.getItem('clauseguard_active_filename')).toBeNull();
    expect(sessionStorage.getItem('clauseguard_active_compare')).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('does not write contract text or quotes to storage when loading sample contracts', () => {
    render(<WorkspacePage />);

    // Click "Audit Document" mode button
    const auditModeBtn = screen.getByRole('button', { name: /Audit Document/i });
    fireEvent.click(auditModeBtn);

    // Look for sample contract button
    const sampleBtn = screen.getByRole('button', { name: /Master Consulting Agreement/i });
    fireEvent.click(sampleBtn);

    // Confirm that contract text is loaded into React memory but NOT sessionStorage
    expect(sessionStorage.getItem('clauseguard_active_audit')).toBeNull();
    expect(sessionStorage.getItem('clauseguard_active_filename')).toBeNull();
    expect(sessionStorage.getItem('clauseguard_active_compare')).toBeNull();

    // Check all sessionStorage keys
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      expect(key).not.toBe('clauseguard_active_audit');
      expect(key).not.toBe('clauseguard_active_filename');
      expect(key).not.toBe('clauseguard_active_compare');
    }
  });

  it('does not persist contract text, findings, or quotes to storage after completed analysis', async () => {
    const mockAuditResult = {
      document_id: 'doc_priv_001',
      summary: 'Confidential executive summary with sensitive trade secret mentions.',
      findings: [
        {
          finding_id: 'find_priv_001',
          clause_id: 'clause_001',
          category: 'CONFIDENTIALITY',
          attention_level: 'HIGH_ATTENTION',
          title: 'Sensitive Proprietary Obligation',
          verbatim_quote: 'All proprietary software source code belongs exclusively to Client.',
          plain_language_explanation: 'IP assignment.',
          why_it_matters: 'Loss of rights.',
          evidence: 'Full code ownership.',
          suggested_question_for_counsel: 'Confirm scope.',
          verification_status: 'VERIFIED_EXACT',
        },
      ],
      rejected_findings: [],
      primary_concerns: ['Proprietary IP assignment.'],
      metadata: {
        audited_at: new Date().toISOString(),
        model_used: 'deterministic-evaluator',
        duration_ms: 450,
        total_clauses_analyzed: 1,
        total_findings_count: 1,
        verified_count: 1,
        unverified_count: 0,
        rejected_count: 0,
        file_name: 'Proprietary_Merger.txt',
        character_count: 500,
      },
    };

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAuditResult,
    } as Response);

    try {
      render(<WorkspacePage />);

      // Load sample contract
      const sampleBtn = screen.getByRole('button', { name: /Master Consulting Agreement/i });
      fireEvent.click(sampleBtn);

      // Click "Run Grounded Legal Audit"
      const runBtn = screen.getByRole('button', { name: /Run Grounded Legal Audit/i });
      fireEvent.click(runBtn);

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Sensitive Proprietary Obligation')).toBeDefined();
      });

      // Verify that NO sensitive fields were stored in sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)!;
        const val = sessionStorage.getItem(key)!;
        expect(val).not.toContain('Confidential executive summary');
        expect(val).not.toContain('proprietary software source code');
        expect(val).not.toContain('Proprietary_Merger.txt');
      }

      // Verify localStorage is completely empty
      expect(localStorage.length).toBe(0);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
