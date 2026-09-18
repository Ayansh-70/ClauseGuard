import { describe, it, expect } from 'vitest';
import {
  RawGeminiComparisonOutputSchema,
  RawGeminiComparisonFindingSchema,
  ComparisonStatusSchema,
  ComparisonResultSchema,
} from '@/lib/schemas/comparison.schema';

describe('Contract Comparison Zod Schemas', () => {
  it('normalizes status case-insensitively to lowercase', () => {
    expect(ComparisonStatusSchema.parse('SAME')).toBe('same');
    expect(ComparisonStatusSchema.parse('Changed')).toBe('changed');
    expect(ComparisonStatusSchema.parse('ADDED')).toBe('added');
    expect(ComparisonStatusSchema.parse('REMOVED')).toBe('removed');
    expect(ComparisonStatusSchema.parse('Ambiguous')).toBe('ambiguous');

    expect(() => ComparisonStatusSchema.parse('invalid_status')).toThrow();
  });

  it('validates compliant raw AI output', () => {
    const raw = {
      summary: 'Comparison summary between baseline and amended version.',
      findings: [
        {
          id: 'comp_001',
          status: 'CHANGED',
          category: 'payment',
          title: 'Payment Terms Modified',
          plain_english_summary: 'Net-30 changed to Net-60.',
          practical_implication: 'Cash flow impact.',
          attention_level: 'MEDIUM_ATTENTION',
          contract_a_clause_id: 'clause_001',
          contract_a_quote: 'Payment within 30 days.',
          contract_b_clause_id: 'clause_002',
          contract_b_quote: 'Payment within 60 days.',
          confidence: 0.95,
          suggested_question_for_counsel: 'Can we keep Net-30?',
        },
      ],
    };

    const parsed = RawGeminiComparisonOutputSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.findings[0].status).toBe('changed');
    }
  });

  it('requires contract_a_clause_id for "removed" findings', () => {
    const missingA = {
      id: 'comp_rem',
      status: 'removed',
      category: 'confidentiality',
      title: 'Omitted Term',
      plain_english_summary: 'Clause was removed.',
      practical_implication: 'Loss of protection.',
      attention_level: 'HIGH_ATTENTION',
      // Missing contract_a_clause_id
    };

    const parsed = RawGeminiComparisonFindingSchema.safeParse(missingA);
    expect(parsed.success).toBe(false);
  });

  it('requires contract_b_clause_id for "added" findings', () => {
    const missingB = {
      id: 'comp_add',
      status: 'added',
      category: 'obligations',
      title: 'New Term Added',
      plain_english_summary: 'New clause was added in revision.',
      practical_implication: 'New duty.',
      attention_level: 'HIGH_ATTENTION',
      // Missing contract_b_clause_id
    };

    const parsed = RawGeminiComparisonFindingSchema.safeParse(missingB);
    expect(parsed.success).toBe(false);
  });

  it('requires both clause IDs for "changed" and "same" findings', () => {
    const onlyA = {
      id: 'comp_change',
      status: 'changed',
      category: 'liability',
      title: 'Liability Shift',
      plain_english_summary: 'Liability terms modified.',
      practical_implication: 'Greater exposure.',
      attention_level: 'HIGH_ATTENTION',
      contract_a_clause_id: 'clause_001',
      // Missing contract_b_clause_id
    };

    const parsed = RawGeminiComparisonFindingSchema.safeParse(onlyA);
    expect(parsed.success).toBe(false);
  });

  it('enforces confidence bounds between 0.0 and 1.0', () => {
    const invalidConfidence = {
      id: 'comp_conf',
      status: 'same',
      category: 'governing_law',
      title: 'Identical Law',
      plain_english_summary: 'Both specify California.',
      practical_implication: 'No change.',
      attention_level: 'INFORMATIONAL',
      contract_a_clause_id: 'clause_001',
      contract_b_clause_id: 'clause_001',
      confidence: 1.5, // Out of bounds
    };

    const parsed = RawGeminiComparisonFindingSchema.safeParse(invalidConfidence);
    expect(parsed.success).toBe(false);
  });

  it('validates complete ComparisonResultSchema', () => {
    const fullResult = {
      comparison_id: 'comp_12345',
      summary: 'High level comparison summary.',
      findings: [
        {
          id: 'comp_001',
          status: 'same',
          category: 'governing_law',
          title: 'Governing Law Identical',
          plain_english_summary: 'Both contracts designate California.',
          practical_implication: 'No commercial impact.',
          attention_level: 'INFORMATIONAL',
          confidence: 0.95,
          verification_status: 'VERIFIED_EXACT',
        },
      ],
      rejected_findings: [],
      metadata: {
        comparison_id: 'comp_12345',
        contract_a_metadata: {
          document_id: 'doc_a',
          file_name: 'A.txt',
          file_size_bytes: 100,
          format: 'text/plain',
          extension: 'txt',
          created_at: new Date().toISOString(),
          sha256_hash: 'a'.repeat(64),
          page_count: 1,
          character_count: 100,
          word_count: 15,
        },
        contract_b_metadata: {
          document_id: 'doc_b',
          file_name: 'B.txt',
          file_size_bytes: 100,
          format: 'text/plain',
          extension: 'txt',
          created_at: new Date().toISOString(),
          sha256_hash: 'b'.repeat(64),
          page_count: 1,
          character_count: 100,
          word_count: 15,
        },
        timestamp: new Date().toISOString(),
        provider_used: 'mock',
        model_used: 'deterministic-evaluator',
        prompt_version: 'v1.0-grounded-compare',
        processing_status: 'completed',
        duration_ms: 120,
        aligned_pairs_count: 1,
        total_findings_count: 1,
        verified_findings_count: 1,
        unverified_findings_count: 0,
        rejected_findings_count: 0,
        disclaimer: 'Informational only.',
      },
      disclaimer: 'Informational only.',
    };

    const parsed = ComparisonResultSchema.safeParse(fullResult);
    expect(parsed.success).toBe(true);
  });
});
