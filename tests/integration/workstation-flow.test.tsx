import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StageProgressBar } from '@/components/workstation/StageProgressBar';
import { ErrorAlert } from '@/components/workstation/ErrorAlert';

describe('Workstation UI Components', () => {
  it('renders StageProgressBar in analyzing state with active stage indicator', () => {
    render(<StageProgressBar currentStage="ANALYZING" />);

    expect(screen.getByText(/Auditing Contract Provisions\.\.\./i)).toBeDefined();
    expect(screen.getByText('Gemini AI Audit')).toBeDefined();
    expect(screen.getByText('In Progress')).toBeDefined();
    expect(screen.getByText('Stage 4 of 5')).toBeDefined();
    expect(screen.getByText('Document Ingestion')).toBeDefined();
  });

  it('renders StageProgressBar in complete state', () => {
    render(<StageProgressBar currentStage="COMPLETE" />);

    const verifiedBadges = screen.getAllByText('✓ Verified');
    expect(verifiedBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders ErrorAlert with title, message, and retry button', () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ErrorAlert
        title="File Too Large"
        message="The selected contract exceeds the 500 KB limit."
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('File Too Large')).toBeDefined();
    expect(
      screen.getByText('The selected contract exceeds the 500 KB limit.')
    ).toBeDefined();

    const retryBtn = screen.getByText('Try Again');
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);

    const dismissBtn = screen.getByLabelText(/Dismiss error/i);
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
