# ClauseGuard (JuriLens — ClauseRadar)

> **Deterministic Contract Intelligence & Negotiation Workspace**

ClauseGuard is an engineered, GenAI-powered legal document understanding workstation for non-lawyers. It deterministically parses commercial agreements, detects asymmetric liabilities and one-sided clauses, mathematically verifies every quote against the original text, and generates balanced, illustrative negotiation alternatives.

---

## Important Notice

**INFORMATIONAL ONLY:** ClauseGuard assists in understanding contract provisions. It does not provide legal advice, legal opinion, or attorney representation. Consult qualified legal counsel for binding legal decisions.

---

## Current Status: Phase 3 Complete (Grounded Gemini Legal Audit Engine)

Phase 3 establishes the server-side, grounded legal document audit engine built on top of the deterministic Phase 2 ingestion foundation.

### Complete System Pipeline

```text
Uploaded Legal Document (.txt, .md, .pdf)
      ↓
Deterministic Ingestion Pipeline (Phase 2)
      ↓
Structured Clauses + Source References (NDDR)
      ↓
AI Audit Context Builder (lib/server/ai/context-builder.ts)
      ↓
Gemini Provider (lib/server/ai/gemini-provider.ts)
      ↓
Strict Structured Output (JSON Schema Mode)
      ↓
Level 1 Validation (Zod Schema Validation)
      ↓
Level 2 Verification (lib/server/ai/quote-verifier.ts)
  • Check 1: Referenced clause_id exists in document
  • Check 2: Verbatim quote verified (Tier 1: Exact Substring, Tier 2: Normalized Levenshtein)
  • Check 3: Page & location metadata matches
  • Filter: Unverified findings rejected from trusted output
      ↓
Validated AuditResult (Document ID, Summary, Findings, Metadata)
      ↓
Application & API Layer (POST /api/v1/audit)
```

---

## Core Architectural Invariants

1. **Deterministic Software Controls Source Truth:** File validation, text normalization, clause segmentation, stable IDs, and source offsets are 100% deterministic. The AI does not chunk the document or invent line positions.
2. **AI Reasoning Constrained to Document Content:** Gemini is strictly instructed to evaluate only the text within `<untrusted_contract_text>` boundaries, never inventing clauses, external laws, or court cases.
3. **Dual-Level Verification:**
   - **Level 1 (Schema):** Ensures output conforms strictly to typed Zod contracts.
   - **Level 2 (Source):** Mathematical verification ensures every cited clause exists and every quote exists verbatim in that clause.
4. **Zero Untrusted AI Output:** Substantive findings whose quotes cannot be verified are rejected from trusted application state.
5. **Security Isolation & Privacy:** Ingestion and audit execute in-memory. Sensitive document text, full clauses, and server API keys are never written to server logs.
6. **Mockable AI Layer:** Unit and CI tests utilize `MockGeminiProvider`, requiring zero live API keys or network calls. Live testing is strictly opt-in via `LIVE_GEMINI_TEST=true`.

---

## Supported Formats

| Format | Extension | Extractor | Page Tracking |
| :--- | :--- | :--- | :--- |
| **Plain Text** | `.txt` | `PlainTextExtractor` | Single page |
| **Markdown** | `.md` | `PlainTextExtractor` | Single page |
| **PDF** | `.pdf` | `PdfExtractor` (`pdf-parse`) | Multi-page preservation |

- **Maximum File Size:** $500\text{ KB}$
- **Maximum Text Length:** $100,000\text{ characters}$ (~25 standard contract pages)

---

## Environment Configuration

Copy `.env.example` to `.env.local` for local execution:

```bash
# Server-only environment variables
GEMINI_API_KEY="your-api-key-here"
GEMINI_MODEL="gemini-2.5-flash"
GEMINI_TIMEOUT_MS=30000

# Optional: Enable live Gemini API integration test
LIVE_GEMINI_TEST=false
```

---

## API Endpoints

### `POST /api/v1/audit`
Accepts either an already parsed `StructuredDocument` or a raw contract text payload:

```json
// Request Body (Raw Text Option)
{
  "raw_text": "ARTICLE 1: SERVICES...\n\nARTICLE 2: INDEMNITY...",
  "file_name": "Consulting_Agreement.txt",
  "reject_unverified": true
}
```

```json
// Response Body (AuditResult)
{
  "document_id": "doc_a1b2c3d4e5f6",
  "summary": "High-level summary of contractual obligations and commercial risks.",
  "findings": [
    {
      "finding_id": "find_001",
      "clause_id": "clause_002",
      "category": "INDEMNIFICATION",
      "attention_level": "HIGH_ATTENTION",
      "title": "Unilateral Indemnification Obligation",
      "verbatim_quote": "Contractor agrees to defend and indemnify Client against third-party claims.",
      "plain_language_explanation": "Contractor must pay Client's legal defense costs if sued by a third party.",
      "why_it_matters": "Severe uncapped financial exposure exceeding contract fees.",
      "evidence": "Clause 2 mandates defense without reciprocal obligations.",
      "suggested_question_for_counsel": "Can we make this indemnity mutual and capped at 1x fees?",
      "verification_status": "VERIFIED_EXACT",
      "matched_range": { "start": 120, "end": 196 },
      "confidence": 0.95
    }
  ],
  "primary_concerns": ["Unilateral indemnification liability"],
  "metadata": {
    "audited_at": "2026-09-17T18:00:00.000Z",
    "model_used": "gemini-2.5-flash",
    "duration_ms": 1420,
    "total_clauses_analyzed": 8,
    "total_findings_count": 1,
    "verified_count": 1,
    "unverified_count": 0,
    "rejected_count": 0
  }
}
```

---

## Running Validation & Tests

```bash
# Run unit, schema, verification, and integration tests with Vitest
npm run test

# Type-check TypeScript strictly
npm run typecheck

# Lint codebase
npm run lint

# Build production application
npm run build

# Optional: Run live Gemini integration test (requires GEMINI_API_KEY)
LIVE_GEMINI_TEST=true npm run test
```
