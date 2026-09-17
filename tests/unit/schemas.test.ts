import { describe, it, expect } from 'vitest';
import { ClauseSchema, StructuredDocumentSchema } from '@/lib/schemas/document.schema';
import { FindingSchema, AttentionLevelSchema, VerificationStatusSchema } from '@/lib/schemas/finding.schema';

describe('Shared Zod Schemas', () => {
  it('accepts a valid Clause object', () => {
    const validClause = {
      clause_id: 'clause_001',
      document_id: 'doc_123',
      text: 'Contractor shall deliver the software within 30 days.',
      start_offset: 0,
      end_offset: 52,
      line_number: 1,
      subclause_ids: [],
    };

    const result = ClauseSchema.safeParse(validClause);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid clause_id format', () => {
    const invalidClause = {
      clause_id: 'invalid-id-format',
      document_id: 'doc_123',
      text: 'Some clause text',
      start_offset: 0,
      end_offset: 16,
      line_number: 1,
      subclause_ids: [],
    };

    const result = ClauseSchema.safeParse(invalidClause);
    expect(result.success).toBe(false);
  });

  it('validates attention levels and rejects invalid ones', () => {
    expect(AttentionLevelSchema.safeParse('HIGH_ATTENTION').success).toBe(true);
    expect(AttentionLevelSchema.safeParse('MEDIUM_ATTENTION').success).toBe(true);
    expect(AttentionLevelSchema.safeParse('LOW_ATTENTION').success).toBe(true);
    expect(AttentionLevelSchema.safeParse('INFORMATIONAL').success).toBe(true);
    expect(AttentionLevelSchema.safeParse('EXTREME_DANGER').success).toBe(false);
  });

  it('validates verification statuses and rejects invalid ones', () => {
    expect(VerificationStatusSchema.safeParse('VERIFIED_EXACT').success).toBe(true);
    expect(VerificationStatusSchema.safeParse('VERIFIED_NORMALIZED').success).toBe(true);
    expect(VerificationStatusSchema.safeParse('UNVERIFIED_SOURCE_MISMATCH').success).toBe(true);
    expect(VerificationStatusSchema.safeParse('NO_QUOTE_PROVIDED').success).toBe(true);
    expect(VerificationStatusSchema.safeParse('HALF_VERIFIED').success).toBe(false);
  });

  it('rejects a malformed Finding object', () => {
    const malformedFinding = {
      finding_id: 'bad_id', // Must be find_\d+
      clause_id: 'clause_001',
      category: 'INVALID_CATEGORY',
      attention_level: 'HIGH_ATTENTION',
      title: 'Title',
    };

    const result = FindingSchema.safeParse(malformedFinding);
    expect(result.success).toBe(false);
  });
});
