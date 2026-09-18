import { z } from 'zod';
import { AttentionLevelSchema, VerificationStatusSchema } from './finding.schema';
import { DocumentMetadataSchema } from './document.schema';

/**
 * Standard contract comparison statuses
 * Accepts case-insensitive input (e.g. 'SAME' or 'same') and normalizes to lowercase.
 */
export const ComparisonStatusSchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.toLowerCase() : val),
  z.enum(['same', 'changed', 'added', 'removed', 'ambiguous'])
);

/**
 * Standard contract comparison categories (extensible string)
 */
export const ComparisonCategorySchema = z.string().min(1);

/**
 * Verified independent source reference for a single contract
 */
export const ComparisonSourceReferenceSchema = z.object({
  document_id: z.string().min(1),
  clause_id: z.string().min(1),
  section_id: z.string().optional(),
  page_number: z.number().int().positive().optional(),
  exact_quote: z.string(),
  matched_range: z
    .object({
      start: z.number().int().nonnegative(),
      end: z.number().int().nonnegative(),
    })
    .optional(),
  number_label: z.string().optional(),
});

/**
 * Raw finding returned directly by the Gemini comparison provider
 */
export const RawGeminiComparisonFindingSchema = z
  .object({
    id: z.string().min(1),
    status: ComparisonStatusSchema,
    category: ComparisonCategorySchema,
    title: z.string().min(1),
    plain_english_summary: z.string().min(1),
    practical_implication: z.string().min(1),
    attention_level: AttentionLevelSchema,
    contract_a_clause_id: z.string().optional(),
    contract_a_quote: z.string().optional(),
    contract_b_clause_id: z.string().optional(),
    contract_b_quote: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    suggested_question_for_counsel: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === 'removed' && !val.contract_a_clause_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Findings with status "removed" must specify contract_a_clause_id',
        path: ['contract_a_clause_id'],
      });
    }
    if (val.status === 'added' && !val.contract_b_clause_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Findings with status "added" must specify contract_b_clause_id',
        path: ['contract_b_clause_id'],
      });
    }
    if ((val.status === 'same' || val.status === 'changed') && (!val.contract_a_clause_id || !val.contract_b_clause_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Findings with status "${val.status}" must specify both contract_a_clause_id and contract_b_clause_id`,
        path: [val.contract_a_clause_id ? 'contract_b_clause_id' : 'contract_a_clause_id'],
      });
    }
  });

/**
 * Raw structured JSON output from Gemini comparison
 */
export const RawGeminiComparisonOutputSchema = z.object({
  summary: z.string().min(1),
  findings: z.array(RawGeminiComparisonFindingSchema),
});

/**
 * Domain-validated and verified comparison finding
 */
export const ComparisonFindingSchema = z.object({
  id: z.string().min(1),
  status: ComparisonStatusSchema,
  category: z.string().min(1),
  title: z.string().min(1),
  plain_english_summary: z.string().min(1),
  practical_implication: z.string().min(1),
  attention_level: AttentionLevelSchema,
  contract_a_source: ComparisonSourceReferenceSchema.optional(),
  contract_b_source: ComparisonSourceReferenceSchema.optional(),
  confidence: z.number().min(0).max(1),
  verification_status: VerificationStatusSchema,
  suggested_question_for_counsel: z.string().optional(),
});

/**
 * Execution metadata for contract comparison
 */
export const ComparisonMetadataSchema = z.object({
  comparison_id: z.string().min(1),
  contract_a_metadata: DocumentMetadataSchema,
  contract_b_metadata: DocumentMetadataSchema,
  timestamp: z.string().datetime(),
  provider_used: z.string(),
  model_used: z.string(),
  prompt_version: z.string(),
  processing_status: z.enum(['completed', 'failed', 'partial']),
  duration_ms: z.number().int().nonnegative(),
  aligned_pairs_count: z.number().int().nonnegative(),
  total_findings_count: z.number().int().nonnegative(),
  verified_findings_count: z.number().int().nonnegative(),
  unverified_findings_count: z.number().int().nonnegative(),
  rejected_findings_count: z.number().int().nonnegative(),
  disclaimer: z.string().min(1),
});

/**
 * Complete verified comparison result
 */
export const ComparisonResultSchema = z.object({
  comparison_id: z.string().min(1),
  summary: z.string().min(1),
  findings: z.array(ComparisonFindingSchema),
  rejected_findings: z.array(ComparisonFindingSchema).optional(),
  metadata: ComparisonMetadataSchema,
  disclaimer: z.string().min(1),
});

export type RawGeminiComparisonFinding = z.infer<typeof RawGeminiComparisonFindingSchema>;
export type RawGeminiComparisonOutput = z.infer<typeof RawGeminiComparisonOutputSchema>;
