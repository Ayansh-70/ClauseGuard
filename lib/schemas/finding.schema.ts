import { z } from 'zod';

export const AttentionLevelSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const upper = val.toUpperCase().trim().replace(/[\s-]+/g, '_');
    if (upper === 'HIGH') return 'HIGH_ATTENTION';
    if (upper === 'MEDIUM') return 'MEDIUM_ATTENTION';
    if (upper === 'LOW') return 'LOW_ATTENTION';
    if (upper === 'NOTICE' || upper === 'STANDARD') return 'STANDARD_NOTICE';
    return upper;
  }
  return val;
}, z.enum([
  'HIGH_ATTENTION',
  'MEDIUM_ATTENTION',
  'LOW_ATTENTION',
  'INFORMATIONAL',
  'STANDARD_NOTICE',
]));

export const SeveritySchema = z.enum(['low', 'medium', 'high', 'informational']);

export const ContractCategorySchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    return val.toUpperCase().trim().replace(/[\s-]+/g, '_');
  }
  return val;
}, z.enum([
  'PAYMENT_TERMS',
  'LIABILITY_LIMITS',
  'INDEMNIFICATION',
  'INTELLECTUAL_PROPERTY',
  'TERMINATION_RIGHTS',
  'CONFIDENTIALITY',
  'RESTRICTIONS_NON_COMPETE',
  'GOVERNING_LAW_DISPUTES',
  'MATERIAL_OBLIGATIONS',
]));

export const VerificationStatusSchema = z.enum([
  'VERIFIED_EXACT',
  'VERIFIED_NORMALIZED',
  'UNVERIFIED_SOURCE_MISMATCH',
  'NO_QUOTE_PROVIDED',
]);

export const SourceReferenceSchema = z.object({
  clause_id: z.string().min(1),
  page_number: z.number().int().positive().optional(),
  excerpt: z.string(),
  matched_range: z
    .object({
      start: z.number().int().nonnegative(),
      end: z.number().int().nonnegative(),
    })
    .optional(),
});

export const FindingSchema = z.object({
  finding_id: z.string().min(1),
  clause_id: z.string().min(1),
  affected_clause_ids: z.array(z.string()).optional(),
  category: ContractCategorySchema,
  attention_level: AttentionLevelSchema,
  severity: z.enum(['low', 'medium', 'high']).optional(),
  title: z.string().min(1),
  verbatim_quote: z.string(),
  source_references: z.array(SourceReferenceSchema).optional(),
  plain_language_explanation: z.string().min(1),
  why_it_matters: z.string().min(1),
  evidence: z.string().min(1),
  uncertainty: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  page_number: z.number().int().positive().optional(),
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

export const AuditMetadataSchema = z.object({
  audited_at: z.string().datetime(),
  model_used: z.string(),
  duration_ms: z.number().int().nonnegative(),
  total_clauses_analyzed: z.number().int().nonnegative(),
  total_findings_count: z.number().int().nonnegative(),
  verified_count: z.number().int().nonnegative(),
  unverified_count: z.number().int().nonnegative(),
  rejected_count: z.number().int().nonnegative(),
  file_name: z.string().optional(),
  page_count: z.number().int().nonnegative().optional(),
  character_count: z.number().int().nonnegative().optional(),
});

export const AuditResultSchema = z.object({
  document_id: z.string().min(1),
  summary: z.string(),
  findings: z.array(FindingSchema),
  rejected_findings: z.array(FindingSchema).optional(),
  primary_concerns: z.array(z.string()),
  metadata: AuditMetadataSchema,
});

/**
 * Raw output schema expected from Gemini model structured response
 */
export const RawGeminiFindingSchema = z.object({
  finding_id: z.string(),
  clause_id: z.string(),
  affected_clause_ids: z.array(z.string()).optional(),
  category: ContractCategorySchema,
  attention_level: AttentionLevelSchema,
  title: z.string().min(1),
  verbatim_quote: z.string(),
  plain_language_explanation: z.string().min(1),
  why_it_matters: z.string().min(1),
  evidence: z.string().min(1),
  uncertainty: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  suggested_question_for_counsel: z.string().min(1),
});

export const RawGeminiAuditOutputSchema = z.object({
  summary: z.string(),
  primary_concerns: z.array(z.string()),
  findings: z.array(RawGeminiFindingSchema),
});

export type RawGeminiFinding = z.infer<typeof RawGeminiFindingSchema>;
export type RawGeminiAuditOutput = z.infer<typeof RawGeminiAuditOutputSchema>;
