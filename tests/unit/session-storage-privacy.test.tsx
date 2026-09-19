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
});
