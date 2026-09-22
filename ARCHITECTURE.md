# ClauseGuard Architecture & System Design

ClauseGuard is an engineered, document-grounded legal intelligence workstation. It deterministically digests complex commercial agreements, identifies high-attention obligations and liabilities, independently verifies cited quotes against source contract text, and provides an interactive workstation for single-document audits and dual-document contract comparisons.

---

## 1. High-Level System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT WORKSTATION                               │
│                         (Next.js 15 / React 19)                             │
│                                                                             │
│   Landing Page (/) ──► Workstation (/workspace)                             │
│                         ├── Mode A: Single Document Audit                   │
│                         │    ├── Dropzone / Paste Text                      │
│                         │    ├── Document Overview & Classification         │
│                         │    ├── Priority Review ("Start Here")             │
│                         │    ├── Filterable Findings Grid                   │
│                         │    └── Finding Detail Modal                       │
│                         ├── Mode B: Dual Contract Comparison                │
│                         │    ├── Side-by-Side Ingestion Slots               │
│                         │    ├── Executive Change Story by Category         │
│                         │    ├── Comparison Metrics & Status Tabs           │
│                         │    └── Comparison Detail Modal                    │
│                         └── Shared: Interactive Evidence Navigator          │
│                              ├── Highlighted Verbatim Quotes (<mark>)       │
│                              ├── Surrounding Context Inspection             │
│                              └── 1-Click Counsel Questions                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP JSON / Multipart FormData
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NEXT.JS SERVER RUNTIME                           │
│                                (Node.js 20+)                                │
│                                                                             │
│   API Route Handlers:                                                       │
│   • POST /api/v1/audit                 • GET /api/v1/evidence               │
│   • POST /api/v1/compare               • GET /api/v1/export/report          │
│                                        • GET /api/v1/export/comparison-report│
│                                                                             │
│   ┌───────────────────────────┐         ┌───────────────────────────────┐   │
│   │   Ingestion & Extraction  │         │   Deterministic Alignment     │   │
│   │   • PDF / TXT / MD parser │         │   • Section heading matching  │   │
│   │   • Text Normalizer       │         │   • Outline coordinate map    │   │
│   │   • Clause Segmenter      │         │   • Bounded stem similarity   │   │
│   │   • Deterministic Chunker │         │   • Asymmetric classification │   │
│   └─────────────┬─────────────┘         └───────────────┬───────────────┘   │
│                 │                                       │                   │
│                 ▼                                       ▼                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     Bounded AI Inference Layer                      │   │
│   │   • XML Boundary Enclosure (<untrusted_contract_text>)              │   │
│   │   • Google Gemini 2.5 Flash API (@google/genai SDK)                 │   │
│   │   • Fallback: Deterministic MockGeminiProvider (100% Offline)       │   │
│   │   • Rigid Zod Output Schema Validation                              │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │               Independent Source Quote Verification                 │   │
│   │   • Tier 1: Exact Verbatim Substring Matching (O(N))                │   │
│   │   • Tier 2: Normalized Dash/Unicode/Whitespace Levenshtein          │   │
│   │   • Quarantine: Unverified AI observations stripped from verified   │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │             In-Memory Report Store (True LRU, 2h TTL)               │   │
│   │   • Bounded memory capacity (MAX 100 documents)                     │   │
│   │   • Zero filesystem writes; zero persistent database                │   │
│   │   • Authoritative server-side ID retrieval for evidence & exports   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Processing Pipelines

### Pipeline 1: Single Document Audit (`/api/v1/audit`)
1. **File Ingestion & Format Validation (`lib/domain/file-validator.ts`):**
   - Inspects file extension (`.pdf`, `.txt`, `.md`) and MIME types.
   - Enforces strict size bounding: $\le 500\text{ KB}$ and $\le 180,000$ characters.
2. **Deterministic Extraction & Normalization (`lib/domain/text-extractor.ts`, `text-normalizer.ts`):**
   - Extracts page-delimited text via serverless-native `unpdf` or plain UTF-8 decoding.
   - Normalizes line breaks (`\r\n` $\to$ `\n`), strips null bytes and zero-width artifacts, while strictly preserving punctuation, numerical coordinates, and legal terms.
   - Generates deterministic document SHA-256 hash and stable ID: `doc_<sha256[:12]>`.
3. **Structural Heading & Section Detection (`lib/domain/structure-detector.ts`):**
   - Identifies structural headings, numbering schemas (`1.`, `Section 2`, `Article III`), and hierarchical boundaries.
4. **Clause Segmentation & Indexing (`lib/domain/clause-segmenter.ts`):**
   - Segments canonical text into discrete, addressable clauses with stable IDs (`clause_001`, `clause_002`, ...).
   - Records page numbers, character offsets (`start`, `end`), and outline labels.
5. **Grounded AI Audit Inference (`lib/server/ai/legal-audit-service.ts`):**
   - Encloses canonical text in `<untrusted_contract_text>` XML boundaries.
   - Dispatches structured audit prompt to Google Gemini 2.5 Flash (or deterministic `MockGeminiProvider`).
   - Validates response strictly against `RawAuditOutputSchema` using Zod.
6. **Independent Source Verification (`lib/server/ai/quote-verifier.ts`):**
   - Iterates through every AI-produced finding.
   - Verifies verbatim quotes against the canonical text using exact substring offsets and bounded Levenshtein matching.
   - Rejects or quarantines ungrounded claims (`VERIFIED_EXACT`, `VERIFIED_NORMALIZED`, or `UNVERIFIED`).
7. **Cache & Delivery:**
   - Stores structured document and verified audit in server-side LRU `reportStore`.
   - Emits verified `AuditResult` JSON to the client workstation.

---

### Pipeline 2: Contract Comparison (`/api/v1/compare`)
1. **Dual Ingestion:** Ingests Contract A (Baseline) and Contract B (Revised / Counterproposal) independently through Pipeline 1.
2. **Deterministic Clause Alignment (`lib/domain/clause-aligner.ts`):**
   - Matches clauses across both contracts using a 3-tier bipartite alignment strategy:
     - Tier A: Exact outline label match (`Section 2.1` $\leftrightarrow$ `Section 2.1`).
     - Tier B: Heading similarity match (`Fees and Payment` $\leftrightarrow$ `Fees and Compensation`).
     - Tier C: Textual token overlap & stem similarity.
   - Unmatched clauses are cleanly categorized as asymmetric provisions (`ADDED` in B or `REMOVED` in A).
3. **Bounded Comparison Context:** Formats aligned clause pairs and asymmetric provisions into structured XML blocks (`<untrusted_contract_a>`, `<untrusted_contract_b>`).
4. **AI Semantic Comparison (`lib/server/ai/comparison-service.ts`):**
   - Analyzes substantive legal variances: shifts from mutual to unilateral indemnity, changes in payment terms, shortened termination notice windows, liability cap alterations, and new obligations.
5. **Dual-Source Quote Verification (`lib/server/ai/comparison-quote-verifier.ts`):**
   - Independently verifies Contract A quotes against Document A and Contract B quotes against Document B.
   - Prevents cross-document quote contamination (quotes from Contract B cannot validate Contract A).
6. **Store & Delivery:** Caches `ComparisonResult`, Document A, and Document B in `reportStore` under a secure `comparison_id`.

---

## 3. Evidence Resolver & Grounding Invariants (`lib/domain/evidence-resolver.ts`)

ClauseGuard's core trust promise is: **"Don't just trust the AI — verify the finding against the source document."**

When a user clicks "View clause" or opens the Evidence Navigator, the workstation calls `GET /api/v1/evidence` or resolves client-side against the structured clause context:

```text
Finding Quote
     │
     ▼
[Tier 1: Stored Exact Offset] ──► Valid integer range & text matches quote? ──► Exact Match (Confidence 1.0)
     │ No
     ▼
[Tier 2: Literal Substring Search] ──► Single exact occurrence in clause? ──► Exact Substring Match
     │ No
     ▼
[Tier 3: Normalized Unicode & Dash Match] ──► Matches with normalized quotes/dashes? ──► Normalized Match
     │ No
     ▼
[Tier 4: Honest Unresolved Fallback] ──► Full clause context shown; quote unhighlighted with clear notice
```

### Resolver Hardening Guarantees:
- **Strict Integer Bounds:** Rejects `NaN`, `Infinity`, negative indices, floating-point offsets (`10.5`), and inverted ranges (`start > end`).
- **Ambiguity Detection:** If a short boilerplate quote (e.g. `"terminate for convenience"`) appears multiple times in the same clause, the resolver flags `isAmbiguous: true` with an informative notice.
- **Punctuation & Dash Normalization:** Normalizes em-dashes (`—`), en-dashes (`–`), hyphens (`-`), curly quotes (`“”`, `‘’`), and non-breaking whitespace.
- **ReDoS Guard:** Regex token length is capped at 200 tokens and string input capped at 5,000 characters.

---

## 4. In-Memory Report Store & Export Architecture

### In-Memory LRU Store (`lib/server/report-store.ts`)
- **Lifecycle:** Documents, audits, and comparison results are held in volatile Node.js process memory with a 2-hour TTL.
- **Capacity:** Capped at `MAX_STORE_ENTRIES = 100` with true Least-Recently-Used eviction.
- **Zero Disk Persistence:** No contract bytes, customer files, or findings are written to disk, SQLite, or external databases.

### Export Engine (`lib/server/reports/`)
- **HTML Export (`audit-report-generator.ts`, `comparison-report-generator.ts`):**
  - Self-contained, responsive HTML documents with inline CSS.
  - Formatted for immediate browser **Print / Save as PDF** (`@media print` rules, clean page-break management).
  - Complete security audit: all dynamic data passed through strict `escapeHtml()` to eliminate XSS risks.
- **Markdown Export:** Clean, portable `.md` files formatted with GitHub-flavored markdown tables, callout blocks, and structured question lists.

---

## 5. Security, Privacy & Regulatory Compliance

1. **Transient Memory-Only Architecture:**
   - Raw contracts are parsed in volatile server RAM and discarded after request lifecycle.
   - Zero browser storage: `localStorage` and `sessionStorage` are audited never to store contract text, quotes, or findings (only harmless UI preferences such as `active_mode = 'audit' | 'compare'` are retained).
2. **Adversarial Prompt-Injection Sanitization:**
   - Input contracts are bounded in rigid `<untrusted_contract_text>` XML wrappers.
   - Breakout tags (`</untrusted_contract_text>`, `<system>`) are sanitized prior to prompt concatenation.
   - Embedded prompt-override tokens (`IGNORE ALL PREVIOUS INSTRUCTIONS`) are detected by heuristic scanners and flagged in metadata.
3. **Anti-UPL (Unauthorized Practice of Law) Boundaries:**
   - Universal prominent disclaimers in header, landing page, workspace, report preambles, and exports.
   - 8th-grade plain-language explanations focusing on commercial implications rather than legal conclusions.
   - Structured questions for counsel empower the user to consult their licensed attorney effectively.
