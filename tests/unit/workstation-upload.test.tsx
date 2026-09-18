import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContractDropzone } from '@/components/workstation/ContractDropzone';
import { SAMPLE_CONSULTING_AGREEMENT } from '@/lib/constants/sample-contracts';

describe('ContractDropzone Component', () => {
  it('displays empty state and browse prompt when no file is selected', () => {
    const onFileSelect = vi.fn();
    const onSelectSampleText = vi.fn();

    render(
      <ContractDropzone
        selectedFile={null}
        onFileSelect={onFileSelect}
        onSelectSampleText={onSelectSampleText}
      />
    );

    expect(screen.getByText(/Drop your contract here/i)).toBeDefined();
    expect(screen.getByText(/Supports/i)).toBeDefined();
    expect(screen.getByText(/500 KB/i)).toBeDefined();
  });

  it('displays selected file details when a valid file is provided', () => {
    const file = new File(['Contract content here'], 'Master_Services_Agreement.pdf', {
      type: 'application/pdf',
    });
    const onFileSelect = vi.fn();
    const onSelectSampleText = vi.fn();

    render(
      <ContractDropzone
        selectedFile={file}
        onFileSelect={onFileSelect}
        onSelectSampleText={onSelectSampleText}
      />
    );

    expect(screen.getByText('Master_Services_Agreement.pdf')).toBeDefined();
    expect(screen.getByText(/Ready for audit/i)).toBeDefined();
    expect(screen.getByTitle(/Remove selected file/i)).toBeDefined();
  });

  it('rejects unsupported file extension with user-friendly error message', () => {
    const onFileSelect = vi.fn();
    const onSelectSampleText = vi.fn();

    const { container } = render(
      <ContractDropzone
        selectedFile={null}
        onFileSelect={onFileSelect}
        onSelectSampleText={onSelectSampleText}
      />
    );

    const input = container.querySelector('#clauseguard-file-upload') as HTMLInputElement;
    const invalidFile = new File(['executable binary'], 'malicious.exe', {
      type: 'application/x-msdownload',
    });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Unsupported file type "\.exe"/i)
    ).toBeDefined();
  });

  it('rejects oversized file exceeding 500 KB limit', () => {
    const onFileSelect = vi.fn();
    const onSelectSampleText = vi.fn();

    const { container } = render(
      <ContractDropzone
        selectedFile={null}
        onFileSelect={onFileSelect}
        onSelectSampleText={onSelectSampleText}
      />
    );

    const input = container.querySelector('#clauseguard-file-upload') as HTMLInputElement;
    // 600 KB file
    const oversizedContent = new Uint8Array(600 * 1024);
    const oversizedFile = new File([oversizedContent], 'large_contract.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(input, { target: { files: [oversizedFile] } });

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/exceeds the 500 KB maximum limit/i)).toBeDefined();
  });

  it('allows 1-click loading of sample contracts', () => {
    const onFileSelect = vi.fn();
    const onSelectSampleText = vi.fn();

    render(
      <ContractDropzone
        selectedFile={null}
        onFileSelect={onFileSelect}
        onSelectSampleText={onSelectSampleText}
      />
    );

    const sampleButton = screen.getByText('Master Consulting Agreement');
    fireEvent.click(sampleButton);

    expect(onSelectSampleText).toHaveBeenCalledWith(SAMPLE_CONSULTING_AGREEMENT);
  });
});
