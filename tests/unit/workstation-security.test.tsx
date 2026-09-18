import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FindingCard } from '@/components/workstation/FindingCard';
import { FindingDetailModal } from '@/components/workstation/FindingDetailModal';
import { Finding } from '@/types/domain';

describe('Workstation Frontend Security & XSS Mitigation', () => {
  const maliciousFinding: Finding = {
    finding_id: 'find_xss_001',
    clause_id: 'clause_001',
    category: 'LIABILITY_LIMITS',
    attention_level: 'HIGH_ATTENTION',
    title: '<script>alert("XSS in Title")</script>',
    verbatim_quote: '<img src="x" onerror="window.__xss_executed = true;" /> "Limitation of Liability"',
    plain_language_explanation: '<div onclick="alert(1)">Clickable XSS payload in explanation</div>',
    why_it_matters: '<b>Hazard with tags</b> & <iframe src="javascript:alert(2)"></iframe>',
    evidence: '<script>window.secretStolen = true;</script>',
    suggested_question_for_counsel: '<svg/onload=alert(3)> Question for counsel',
    verification_status: 'VERIFIED_EXACT',
  };

  it('safely renders untrusted HTML/script strings in FindingCard as plain text', () => {
    const { container } = render(
      <FindingCard finding={maliciousFinding} onSelect={() => {}} />
    );

    // Ensure no <script> or <img> tags were injected as DOM elements
    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.querySelectorAll('img[onerror]')).toHaveLength(0);

    // Text content contains literal string characters
    expect(
      screen.getByText('<script>alert("XSS in Title")</script>')
    ).toBeDefined();
  });

  it('safely renders untrusted HTML/script strings in FindingDetailModal as plain text', () => {
    const { container } = render(
      <FindingDetailModal finding={maliciousFinding} onClose={() => {}} />
    );

    // No script or iframe DOM elements injected
    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.querySelectorAll('iframe')).toHaveLength(0);
    expect(container.querySelectorAll('img[onerror]')).toHaveLength(0);

    // Text is rendered literally and safely
    expect(
      screen.getByText(/<img src="x" onerror="window\.__xss_executed = true;" \/>/i)
    ).toBeDefined();
  });
});
