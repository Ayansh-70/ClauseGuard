import { SecurityStatus } from '@/types/domain';

/**
 * Maximum bounds to prevent Denial of Service
 */
export const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500 KB
export const MAX_TEXT_LENGTH_CHARS = 100_000; // 100K characters (~25 standard contract pages)
export const MIN_TEXT_LENGTH_CHARS = 10;

/**
 * Patterns that may indicate adversarial prompt injection or system hijacking attempts.
 * NOTE: Detection does NOT mutate the text; it records security flags for audit visibility.
 */
const SUSPICIOUS_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /system\s*(override|directive|prompt)/i,
  /disregard\s+(all\s+)?(rules|instructions|guidelines)/i,
  /you\s+are\s+now\s+(in\s+)?(developer|jailbreak|unrestricted)\s+mode/i,
  /return\s+(only\s+)?(safe|empty|none)\s+(and|then)\s+ignore/i,
  /administrative\s+override\s*:/i,
];

/**
 * Strip null bytes and harmful control characters while preserving valid text whitespace (\n, \r, \t)
 */
export function sanitizeControlCharacters(input: string): string {
  // Remove null bytes and non-printable ASCII control characters except \t (9), \n (10), and \r (13)
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Inspects document text for suspicious injection patterns without altering the text.
 */
export function scanForSuspiciousContent(text: string): SecurityStatus {
  const flaggedTokens: string[] = [];

  for (const pattern of SUSPICIOUS_INJECTION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      flaggedTokens.push(match[0].trim());
    }
  }

  const passed = flaggedTokens.length === 0;

  return {
    passed,
    injection_patterns_detected: flaggedTokens.length,
    flagged_tokens: flaggedTokens,
    pii_redacted_count: 0,
    sanitized: false, // In Phase 1/2 we do not mutate text
    notes: passed
      ? ['No adversarial prompt-injection patterns detected.']
      : [
          `Detected ${flaggedTokens.length} potential instruction-override pattern(s). Text will be quarantined in untrusted boundary.`,
        ],
  };
}

/**
 * Wraps untrusted contract text in rigid XML delimiters for safe downstream LLM ingestion.
 */
export function wrapUntrustedDocument(normalizedText: string): string {
  return `<untrusted_contract_text>\n${normalizedText}\n</untrusted_contract_text>`;
}
