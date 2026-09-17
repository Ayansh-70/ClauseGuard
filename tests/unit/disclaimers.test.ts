import { describe, it, expect } from 'vitest';
import {
  GLOBAL_LEGAL_DISCLAIMER,
  ALTERNATIVE_CLAUSE_DISCLAIMER,
  EXPORT_PREAMBLE_DISCLAIMER,
} from '@/lib/constants/disclaimers';

describe('Centralized Legal Disclaimers', () => {
  it('ensures the global disclaimer is present, non-empty, and explicitly disclaims legal advice', () => {
    expect(GLOBAL_LEGAL_DISCLAIMER).toBeDefined();
    expect(GLOBAL_LEGAL_DISCLAIMER.length).toBeGreaterThan(20);
    expect(GLOBAL_LEGAL_DISCLAIMER).toContain('INFORMATIONAL ONLY');
    expect(GLOBAL_LEGAL_DISCLAIMER).toContain('not provide legal advice');
  });

  it('ensures alternative clause disclaimer clearly labels drafting suggestions', () => {
    expect(ALTERNATIVE_CLAUSE_DISCLAIMER).toBeDefined();
    expect(ALTERNATIVE_CLAUSE_DISCLAIMER).toContain('Illustrative Drafting Suggestion');
    expect(ALTERNATIVE_CLAUSE_DISCLAIMER).toContain('Not Formal Counsel');
  });

  it('ensures export preamble contains full disclaimer notice', () => {
    expect(EXPORT_PREAMBLE_DISCLAIMER).toBeDefined();
    expect(EXPORT_PREAMBLE_DISCLAIMER).toContain('does not constitute legal representation');
  });
});
