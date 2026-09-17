import { z } from 'zod';

export const AttentionLevelSchema = z.enum([
  'HIGH_ATTENTION',
  'MEDIUM_ATTENTION',
  'LOW_ATTENTION',
  'INFORMATIONAL',
]);

export const ContractCategorySchema = z.enum([
  'PAYMENT_TERMS',
  'LIABILITY_LIMITS',
  'INDEMNIFICATION',
  'INTELLECTUAL_PROPERTY',
  'TERMINATION_RIGHTS',
  'CONFIDENTIALITY',
  'RESTRICTIONS_NON_COMPETE',
  'GOVERNING_LAW_DISPUTES',
  'MATERIAL_OBLIGATIONS',
]);

export const VerificationStatusSchema = z.enum([
  'VERIFIED_EXACT',
  'VERIFIED_NORMALIZED',
  'UNVERIFIED_SOURCE_MISMATCH',
  'NO_QUOTE_PROVIDED',
]);

export const FindingSchema = z.object({
  finding_id: z.string().regex(/^find_\d+$/),
  clause_id: z.string().regex(/^clause_\d+$/),
  category: ContractCategorySchema,
  attention_level: AttentionLevelSchema,
  title: z.string().min(1),
  verbatim_quote: z.string(),
  plain_language_explanation: z.string().min(1),
  why_it_matters: z.string().min(1),
  evidence: z.string().min(1),
  uncertainty: z.string().optional(),
  suggested_question_for_counsel: z.string().min(1),
  verification_status: VerificationStatusSchema,
  matched_range: z
    .object({
      start: z.number().int().nonnegative(),
      end: z.number().int().nonnegative(),
    })
    .optional(),
  suggested_alternative: z.string().optional(),
  alternative_rationale: z.string().optional(),
});

export const FindingListSchema = z.object({
  findings: z.array(FindingSchema),
  primary_concerns: z.array(z.string()),
});
