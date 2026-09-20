import { describe, it, expect, vi } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContractDropzone } from '@/components/workstation/ContractDropzone';
import { ComparisonInputPanel, ContractInputData } from '@/components/workstation/ComparisonInputPanel';
import { FindingCard } from '@/components/workstation/FindingCard';
import { ComparisonFindingCard } from '@/components/workstation/ComparisonFindingCard';
import { FindingDetailModal } from '@/components/workstation/FindingDetailModal';
import { ComparisonDetailModal } from '@/components/workstation/ComparisonDetailModal';
import { DocumentOverview } from '@/components/workstation/DocumentOverview';
import { ComparisonOverview } from '@/components/workstation/ComparisonOverview';
import { FilterSortToolbar } from '@/components/workstation/FilterSortToolbar';
import { WorkstationHeader } from '@/components/workstation/WorkstationHeader';
import { ErrorAlert } from '@/components/workstation/ErrorAlert';
import { Finding, ComparisonFinding, AuditMetadata, ComparisonMetadata } from '@/types/domain';

describe('Workstation Phase 12 Accessibility & Interaction Polish', () => {
  const mockFinding: Finding = {
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
  };

  const mockComparisonFinding: ComparisonFinding = {
    id: 'comp_001',
    status: 'changed',
    category: 'indemnity',
    title: 'Indemnity Shift to Unilateral',
    plain_english_summary: 'Contract B removed mutual defense obligations.',
    practical_implication: 'Increased direct litigation liability.',
    attention_level: 'HIGH_ATTENTION',
    confidence: 0.95,
    verification_status: 'VERIFIED_EXACT',
    contract_a_source: {
      document_id: 'doc_a',
      clause_id: 'clause_a_1',
      exact_quote: 'Each party indemnifies the other.',
    },
    contract_b_source: {
      document_id: 'doc_b',
      clause_id: 'clause_b_1',
      exact_quote: 'Contractor indemnifies Client.',
    },
    suggested_question_for_counsel: 'Why was mutual protection removed?',
  };

  const mockAuditMetadata: AuditMetadata = {
    audited_at: '2026-09-20T10:00:00.000Z',
    model_used: 'gemini-2.5-flash',
    duration_ms: 2200,
    total_clauses_analyzed: 10,
    total_findings_count: 1,
    verified_count: 1,
    unverified_count: 0,
    rejected_count: 0,
    file_name: 'test_contract.pdf',
    character_count: 4500,
  };

  const mockComparisonMetadata: ComparisonMetadata = {
    comparison_id: 'comp_123',
    contract_a_metadata: {
      document_id: 'doc_a',
      file_name: 'Vendor_Agreement_v1.pdf',
      file_size_bytes: 1500,
      format: 'application/pdf',
      extension: 'pdf',
      created_at: new Date().toISOString(),
      sha256_hash: 'a'.repeat(64),
      page_count: 2,
      character_count: 1500,
      word_count: 200,
    },
    contract_b_metadata: {
      document_id: 'doc_b',
      file_name: 'Vendor_Agreement_v2.pdf',
      file_size_bytes: 1600,
      format: 'application/pdf',
      extension: 'pdf',
      created_at: new Date().toISOString(),
      sha256_hash: 'b'.repeat(64),
      page_count: 2,
      character_count: 1600,
      word_count: 210,
    },
    timestamp: '2026-09-20T10:00:00.000Z',
    provider_used: 'gemini',
    model_used: 'gemini-2.5-flash',
    prompt_version: 'v1',
    processing_status: 'completed',
    duration_ms: 3100,
    aligned_pairs_count: 10,
    total_findings_count: 1,
    verified_findings_count: 1,
    unverified_findings_count: 0,
    rejected_findings_count: 0,
    disclaimer: 'Informational analysis only.',
  };

  describe('ContractDropzone Keyboard Navigation', () => {
    it('has role="button", tabIndex=0, and aria-label when empty', () => {
      render(
        <ContractDropzone
          selectedFile={null}
          onFileSelect={vi.fn()}
          onSelectSampleText={vi.fn()}
        />
      );

      const dropzone = screen.getByRole('button', {
        name: /Upload contract file: drag and drop or press Enter to browse/i,
      });
      expect(dropzone).toBeDefined();
      expect(dropzone.getAttribute('tabindex')).toBe('0');
    });

    it('triggers file input click when pressing Enter or Space', () => {
      const { container } = render(
        <ContractDropzone
          selectedFile={null}
          onFileSelect={vi.fn()}
          onSelectSampleText={vi.fn()}
        />
      );

      const input = container.querySelector('#clauseguard-file-upload') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});

      const dropzone = screen.getByRole('button', {
        name: /Upload contract file: drag and drop or press Enter to browse/i,
      });

      fireEvent.keyDown(dropzone, { key: 'Enter' });
      expect(clickSpy).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(dropzone, { key: ' ' });
      expect(clickSpy).toHaveBeenCalledTimes(2);

      clickSpy.mockRestore();
    });

    it('sets tabIndex=-1 when disabled', () => {
      render(
        <ContractDropzone
          selectedFile={null}
          onFileSelect={vi.fn()}
          onSelectSampleText={vi.fn()}
          disabled={true}
        />
      );

      const dropzone = screen.getByRole('button', {
        name: /Upload contract file: drag and drop or press Enter to browse/i,
      });
      expect(dropzone.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('ComparisonInputPanel Keyboard Accessibility', () => {
    it('provides accessible keyboard triggers for both Contract A and Contract B empty dropzones', () => {
      const emptyContractA: ContractInputData = {
        file: null,
        rawText: '',
        fileName: '',
        mode: 'file',
      };
      const emptyContractB: ContractInputData = {
        file: null,
        rawText: '',
        fileName: '',
        mode: 'file',
      };

      const { container } = render(
        <ComparisonInputPanel
          contractA={emptyContractA}
          contractB={emptyContractB}
          onChangeContractA={vi.fn()}
          onChangeContractB={vi.fn()}
          onSelectSamplePair={vi.fn()}
          samplePairs={[]}
          onCompare={vi.fn()}
          isComparing={false}
        />
      );

      const dropzoneA = screen.getByRole('button', {
        name: /Upload baseline contract file: drag and drop or press Enter to browse/i,
      });
      const dropzoneB = screen.getByRole('button', {
        name: /Upload revised contract file: drag and drop or press Enter to browse/i,
      });

      expect(dropzoneA.getAttribute('tabindex')).toBe('0');
      expect(dropzoneB.getAttribute('tabindex')).toBe('0');

      const inputA = container.querySelector('#compare-file-a-upload') as HTMLInputElement;
      const inputB = container.querySelector('#compare-file-b-upload') as HTMLInputElement;
      const clickASpy = vi.spyOn(inputA, 'click').mockImplementation(() => {});
      const clickBSpy = vi.spyOn(inputB, 'click').mockImplementation(() => {});

      fireEvent.keyDown(dropzoneA, { key: 'Enter' });
      expect(clickASpy).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(dropzoneB, { key: ' ' });
      expect(clickBSpy).toHaveBeenCalledTimes(1);

      clickASpy.mockRestore();
      clickBSpy.mockRestore();
    });
  });

  describe('FindingCard & ComparisonFindingCard View Clause Action', () => {
    it('provides semantic button with aria-label and stops event propagation on click', () => {
      const onSelect = vi.fn();
      const onViewEvidence = vi.fn();

      render(
        <FindingCard
          finding={mockFinding}
          onSelect={onSelect}
          onViewEvidence={onViewEvidence}
        />
      );

      const viewClauseBtn = screen.getByRole('button', {
        name: /View source clause for Unilateral Indemnity Exposure/i,
      });
      expect(viewClauseBtn).toBeDefined();

      fireEvent.click(viewClauseBtn);

      expect(onViewEvidence).toHaveBeenCalledTimes(1);
      expect(onViewEvidence).toHaveBeenCalledWith(mockFinding);
      // Clicking the View clause button should NOT trigger card onSelect
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('ComparisonFindingCard provides semantic button with aria-label and stops propagation', () => {
      const onSelect = vi.fn();
      const onViewEvidence = vi.fn();

      render(
        <ComparisonFindingCard
          finding={mockComparisonFinding}
          onSelect={onSelect}
          onViewEvidence={onViewEvidence}
        />
      );

      const viewClausesBtn = screen.getByRole('button', {
        name: /View comparison evidence for Indemnity Shift to Unilateral/i,
      });
      expect(viewClausesBtn).toBeDefined();

      fireEvent.click(viewClausesBtn);

      expect(onViewEvidence).toHaveBeenCalledTimes(1);
      expect(onViewEvidence).toHaveBeenCalledWith(mockComparisonFinding);
      // Outer card click handler should NOT be fired
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Export Dropdown Keyboard Dismissal & ARIA Roles', () => {
    it('DocumentOverview export menu has role="menu", role="menuitem", and closes on Escape', () => {
      render(
        <DocumentOverview
          fileName="test_contract.pdf"
          documentId="doc_123"
          metadata={mockAuditMetadata}
          onReset={vi.fn()}
        />
      );

      const exportBtn = screen.getByRole('button', { name: /Export Report/i });
      fireEvent.click(exportBtn);

      const menu = screen.getByRole('menu');
      expect(menu).toBeDefined();
      expect(menu.getAttribute('id')).toBe('export-report-menu');

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBe(2);

      // Press Escape on document to dismiss
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('ComparisonOverview export menu has role="menu", role="menuitem", and closes on Escape', () => {
      render(
        <ComparisonOverview
          summary="Test comparison summary"
          metadata={mockComparisonMetadata}
          onReset={vi.fn()}
        />
      );

      const exportBtn = screen.getByRole('button', { name: /Export Comparison/i });
      fireEvent.click(exportBtn);

      const menu = screen.getByRole('menu');
      expect(menu).toBeDefined();
      expect(menu.getAttribute('id')).toBe('export-comparison-menu');

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBe(2);

      // Press Escape on document to dismiss
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).toBeNull();
    });
  });

  describe('FilterSortToolbar Tablist Accessibility', () => {
    it('renders attention filter bar with role="tablist" and active aria-selected', () => {
      const onFilterChange = vi.fn();
      const onSortChange = vi.fn();

      const { rerender } = render(
        <FilterSortToolbar
          findings={[mockFinding]}
          activeFilter="ALL"
          onFilterChange={onFilterChange}
          selectedCategory=""
          onCategoryChange={vi.fn()}
          activeSort="ATTENTION_DESC"
          onSortChange={onSortChange}
        />
      );

      const tablist = screen.getByRole('tablist', { name: /Filter findings by attention level/i });
      expect(tablist).toBeDefined();

      const allTab = screen.getByRole('tab', { name: /All/i });
      const highTab = screen.getByRole('tab', { name: /High Attention/i });

      expect(allTab.getAttribute('aria-selected')).toBe('true');
      expect(highTab.getAttribute('aria-selected')).toBe('false');

      fireEvent.click(highTab);
      expect(onFilterChange).toHaveBeenCalledWith('HIGH');

      rerender(
        <FilterSortToolbar
          findings={[mockFinding]}
          activeFilter="HIGH"
          onFilterChange={onFilterChange}
          selectedCategory=""
          onCategoryChange={vi.fn()}
          activeSort="ATTENTION_DESC"
          onSortChange={onSortChange}
        />
      );

      expect(allTab.getAttribute('aria-selected')).toBe('false');
      expect(highTab.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('WorkstationHeader View Mode Selector', () => {
    it('provides role="group" and aria-pressed attributes', () => {
      const onModeChange = vi.fn();
      render(
        <WorkstationHeader
          activeMode="audit"
          onModeChange={onModeChange}
        />
      );

      const group = screen.getByRole('group', { name: /Workstation view mode/i });
      expect(group).toBeDefined();

      const reviewBtn = screen.getByRole('button', { name: /Review Document/i });
      const compareBtn = screen.getByRole('button', { name: /Compare Documents/i });

      expect(reviewBtn.getAttribute('aria-pressed')).toBe('true');
      expect(compareBtn.getAttribute('aria-pressed')).toBe('false');

      fireEvent.click(compareBtn);
      expect(onModeChange).toHaveBeenCalledWith('compare');
    });
  });

  describe('ErrorAlert Role and Live Region', () => {
    it('renders with role="alert" and aria-live="assertive"', () => {
      render(
        <ErrorAlert
          message="Document processing failed due to invalid format."
          onDismiss={vi.fn()}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeDefined();
      expect(alert.getAttribute('aria-live')).toBe('assertive');
      expect(screen.getByText('Document processing failed due to invalid format.')).toBeDefined();
    });
  });

  describe('Modal Focus Restoration & Body Scroll Lock', () => {
    it('FindingDetailModal locks body scroll on open and restores on close', () => {
      const onClose = vi.fn();
      const { unmount } = render(
        <FindingDetailModal
          finding={mockFinding}
          onClose={onClose}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('unset');
    });

    it('ComparisonDetailModal locks body scroll on open and restores on close', () => {
      const onClose = vi.fn();
      const { unmount } = render(
        <ComparisonDetailModal
          finding={mockComparisonFinding}
          onClose={onClose}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('unset');
    });

    it('Restores focus to previously active element when FindingDetailModal unmounts', () => {
      const TestContainer = () => {
        const [isOpen, setIsOpen] = useState(false);
        return (
          <div>
            <button id="trigger-btn" onClick={() => setIsOpen(true)}>
              Open Modal
            </button>
            {isOpen && (
              <FindingDetailModal
                finding={mockFinding}
                onClose={() => setIsOpen(false)}
              />
            )}
          </div>
        );
      };

      render(<TestContainer />);

      const trigger = screen.getByRole('button', { name: 'Open Modal' });
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      fireEvent.click(trigger);

      // Modal is open
      const closeBtn = screen.getByRole('button', { name: /Close details/i });
      expect(closeBtn).toBeDefined();

      // Click Close
      fireEvent.click(closeBtn);

      // Focus should be restored to the trigger button
      expect(document.activeElement).toBe(trigger);
    });
  });
});
