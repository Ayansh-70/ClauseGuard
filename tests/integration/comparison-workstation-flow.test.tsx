import { describe, it, expect, vi } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComparisonStageProgress } from '@/components/workstation/ComparisonStageProgress';
import {
  ComparisonInputPanel,
  ContractInputData,
} from '@/components/workstation/ComparisonInputPanel';
import { SAMPLE_COMPARISON_PAIRS } from '@/lib/constants/sample-contracts';

describe('Comparison Workstation Flow Integration', () => {
  describe('ComparisonStageProgress', () => {
    it('renders all 4 stages with honest progress and stage badges', () => {
      const { rerender } = render(<ComparisonStageProgress currentStage="PREPARING" />);

      expect(screen.getByText('Preparing Documents')).toBeDefined();
      expect(screen.getByText('Aligning Clauses')).toBeDefined();
      expect(screen.getByText('Analyzing Differences')).toBeDefined();
      expect(screen.getByText('Verifying Source Evidence')).toBeDefined();

      rerender(<ComparisonStageProgress currentStage="ALIGNING" />);
      expect(screen.getByText('Contract Comparison in Progress')).toBeDefined();

      rerender(<ComparisonStageProgress currentStage="VERIFYING" />);
      expect(
        screen.getByText('Evidence checked against both contracts')
      ).toBeDefined();
    });
  });

  describe('ComparisonInputPanel Flow', () => {
    function TestHarness() {
      const [contractA, setContractA] = useState<ContractInputData>({
        file: null,
        rawText: '',
        fileName: '',
        mode: 'text',
      });
      const [contractB, setContractB] = useState<ContractInputData>({
        file: null,
        rawText: '',
        fileName: '',
        mode: 'text',
      });
      const [compared, setCompared] = useState(false);

      return (
        <div>
          {compared && <div data-testid="compared-indicator">Comparison Initiated</div>}
          <ComparisonInputPanel
            contractA={contractA}
            contractB={contractB}
            onChangeContractA={setContractA}
            onChangeContractB={setContractB}
            onSelectSamplePair={(pair) => {
              setContractA({
                file: null,
                rawText: pair.contractA.content,
                fileName: pair.contractA.name,
                mode: 'text',
              });
              setContractB({
                file: null,
                rawText: pair.contractB.content,
                fileName: pair.contractB.name,
                mode: 'text',
              });
            }}
            samplePairs={SAMPLE_COMPARISON_PAIRS}
            onCompare={() => setCompared(true)}
            isComparing={false}
          />
        </div>
      );
    }

    it('disables Compare button when contracts are empty', () => {
      render(<TestHarness />);
      const compareBtn = screen.getByRole('button', { name: /Compare Contracts/i });
      expect((compareBtn as HTMLButtonElement).disabled).toBe(true);
      expect(
        screen.getByText(/Upload or paste both Contract A \(Baseline\) and Contract B \(Revised\) to begin\./i)
      ).toBeDefined();
    });

    it('enables Compare button and fires onCompare when sample pair is loaded', () => {
      render(<TestHarness />);

      // Find first sample pair button
      const samplePair = SAMPLE_COMPARISON_PAIRS[0];
      const sampleBtn = screen.getByRole('button', { name: new RegExp(samplePair.name, 'i') });
      fireEvent.click(sampleBtn);

      const compareBtn = screen.getByRole('button', { name: /Compare Contracts/i });
      expect((compareBtn as HTMLButtonElement).disabled).toBe(false);

      fireEvent.click(compareBtn);
      expect(screen.getByTestId('compared-indicator')).toBeDefined();
    });

    it('allows typing raw text in both contracts to enable comparison', () => {
      render(<TestHarness />);

      const textareas = screen.getAllByRole('textbox');
      expect(textareas).toHaveLength(2);

      // Type into Contract A
      fireEvent.change(textareas[0], { target: { value: 'Contract A baseline text here.' } });
      expect(
        screen.getByText(/Contract A ready\. Please upload or paste Contract B to enable comparison\./i)
      ).toBeDefined();

      // Type into Contract B
      fireEvent.change(textareas[1], { target: { value: 'Contract B revision text here.' } });

      const compareBtn = screen.getByRole('button', { name: /Compare Contracts/i });
      expect((compareBtn as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
