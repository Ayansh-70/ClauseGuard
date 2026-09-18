# ClauseGuard

> **Deterministic Contract Intelligence & Grounded AI Audit Workstation**

ClauseGuard is an engineered legal-document understanding workstation for commercial operators, founders, and teams. It deterministically parses legal agreements, detects asymmetric liabilities and one-sided clauses, mathematically verifies every cited quote against original contract text, and provides an interactive findings workspace with targeted questions for legal counsel.

---

## Important Notice (Anti-UPL Regulatory Boundary)

**INFORMATIONAL ONLY:** ClauseGuard assists users in understanding contract provisions and organizing questions for legal counsel. It does **not** provide legal advice, legal opinions, statutory determinations, or attorney representation. No attorney-client relationship is formed. Always consult a qualified legal professional licensed in your jurisdiction for binding legal decisions.

---

## Product Architecture & Workstation Flow

```text
                             CLAUSEGUARD WORKSTATION
                                        │
                                        ▼
                           Document Upload / Ingestion
                   (.pdf, .txt, .md <= 500 KB or direct paste)
                                        │
                                        ▼
                        Deterministic Parsing & Indexing
                   • Heuristic Prompt-Injection Sanitization
                   • Canonical Text Normalization
                   • Structural Heading & Section Detection
                   • Stable Clause Segmentation (clause_001...)
                   • Deterministic Chunking with Traceability
                                        │
                                        ▼
                         Grounded Gemini AI Legal Audit
                   • Strict Structured JSON Output Schema
                   • Anti-UPL System Guardrails (8th-grade plain language)
                   • Commercial Impact & Questions for Counsel
                                        │
                                        ▼
                   Independent Server-Side Quote Verification
                   • Tier 1: Exact Verbatim Substring Matching
                   • Tier 2: Normalized Levenshtein Match (>=95%)
                   • Quarantine: Unverified Observations Rejected
                                        │
                                        ▼
                         Interactive Findings Workspace
                   ┌────────────────────┴────────────────────┐
                   ▼                                         ▼
            Findings Dashboard                      Source Evidence View
     • Attention Tiers (High/Med/Notices)     • Verbatim Excerpt in Quotes
     • Category & Attention Filters           • Clause ID & Page Coordinates
     • Questions for Counsel (1-click copy)   • Server Verification Badge
```

---

## Key Product Features

### 1. Workstation Landing & Navigation (`/`)
* Concise overview of product capabilities: plain-English simplification, attention tiers, verifiable source evidence, and questions for counsel.
* Prominent ethical anti-UPL disclaimer and instant entry button into the workstation.

### 2. Document Upload & Ingestion (`/workspace`)
* Drag-and-drop file upload supporting `.pdf`, `.txt`, and `.md` agreements up to $500\text{ KB}$.
* Direct text paste mode with live character and word counters.
* 1-Click **"Load Sample Contract"** selector featuring realistic commercial agreements (Master Consulting Agreement with unilateral indemnity, Mutual NDA).
* Client-side validation for instant feedback, backed by authoritative server-side validation.

### 3. Stage-Based Audit Progress
* Transparent, honest stage indicators:
  1. File Ingestion & Format Validation
  2. Canonical Text Extraction & Normalization
  3. Clause Segmentation & Indexing
  4. Grounded AI Audit Inference
  5. Server-Side Quote Verification

### 4. Findings Dashboard & Metrics
* **Document Overview:** Filename, document ID, page count, clauses analyzed, audit duration, and model used.
* **Executive Summary:** Plain-English contract overview and bulleted primary commercial risk areas.
* **Summary Metrics:** Total findings, High Attention count, Medium Attention count, Standard Notices count, and Grounded Source Status.
* **Source Integrity Shield:** Automatic transparency alert if any unverified findings were quarantined.

### 5. Attention Tiers & Filtering
* **Attention Tiers:**
  * `HIGH_ATTENTION`: Material commercial exposure, uncapped indemnities, IP assignments.
  * `MEDIUM_ATTENTION`: Payment terms, short termination windows, operational covenants.
  * `STANDARD_NOTICE`: Governing law, standard boilerplate notices.
* **Filter Toolbar:** Filter by attention level tabs, dropdown filter by contract category, and sort by highest attention or document clause order.

### 6. Source Evidence Inspector (Modal / Detail View)
* **Plain-English Explanation:** 8th-grade reading level summary of the clause's effect.
* **Commercial Implication ("Why It Matters"):** Practical commercial hazard and business impact.
* **Questions for Counsel:** Pre-drafted, pragmatic questions with a 1-click copy button.
* **Original Document Evidence:** Visually distinguished box containing verbatim contract quotes, clause IDs, page numbers, character offset spans, and green `VERIFIED_EXACT` badges.

### 7. Contract Comparison Workstation UI (Phase 6)
* **Workstation Mode Switcher:** Seamless header toggle between **Audit Document** and **Compare Contracts** with persistent session state.
* **Dual Contract Upload Panel:** Side-by-side input slots for **Contract A (Baseline)** and **Contract B (Revised / Proposed)** supporting file picker (`.pdf`, `.txt`, `.md` $\le 500\text{ KB}$), drag-and-drop, and direct text paste.
* **1-Click Quick-Start Comparison Samples:** Pre-loaded commercial pairs with real substantive differences (Master Consulting Agreement with payment term changes, indemnity modifications, IP carveouts; Mutual NDA with term extensions and definition shifts).
* **Transparent 4-Stage Progress:** Live tracker showing Document Ingestion $\to$ Structural Clause Alignment $\to$ Gemini Variance Analysis $\to$ Dual-Document Source Verification.
* **Comparison Metrics & Executive Summary:** High-level summary of revisions, total findings, status breakdown (Changed, Added, Removed, Needs Review, Equivalent), and independent dual-document verification status.
* **Interactive Filter Toolbar:** Filter by variance status tabs (`All`, `Changed`, `Added in B`, `Removed`, `Needs Review`), filter by category dropdown, search input, and toggle to hide unchanged equivalent provisions.
* **Side-by-Side Evidence Inspector Modal:**
  * **Dual Verbatim Evidence:** Side-by-side quotation boxes for Contract A and Contract B with independent verification badges.
  * **Asymmetric Provision Handling:** Added provisions cleanly indicate *"No corresponding provision found"* in Contract A; removed provisions indicate omission in Contract B.
  * **Targeted Questions for Counsel:** Tactical questions tailored to negotiate or clarify the revision, with 1-click clipboard copy.

---

## Getting Started

### Prerequisites
* Node.js 18+ (tested on Node v20, v22, v24)
* npm

### Installation
```bash
git clone https://github.com/Ayansh-70/ClauseGuard.git
cd ClauseGuard
npm install
```

### Environment Configuration
Create a `.env.local` file in the project root:
```bash
# Server-only environment variables
GEMINI_API_KEY="your-gemini-api-key-here"  # Optional: defaults to Mock provider if omitted
GEMINI_MODEL="gemini-2.5-flash"
GEMINI_TIMEOUT_MS=30000

# Set to true to force deterministic mock provider during offline development/testing
USE_MOCK_AI=false

# Optional: Run live Gemini API integration test
LIVE_GEMINI_TEST=false
```

> **Development & Demo Fallback:**
> If `GEMINI_API_KEY` is not provided or if `USE_MOCK_AI=true`, ClauseGuard automatically utilizes the built-in `MockGeminiProvider`. The mock provider dynamically parses and grounds findings against whatever document is uploaded, guaranteeing 100% verified source quotes without external API costs or network dependencies.

### Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the landing page, or [http://localhost:3000/workspace](http://localhost:3000/workspace) to use the workstation.

---

## API Endpoints

### `POST /api/v1/audit`
Audits a legal document using grounded inference with independent source verification.

**Supported Content-Types:**
1. `multipart/form-data`:
   - `file`: Document buffer (`.pdf`, `.txt`, or `.md`)
   - `reject_unverified`: optional boolean (default: `true`)
2. `application/json` (Raw Text):
   - `raw_text`: Contract text string
   - `file_name`: optional document title
   - `reject_unverified`: optional boolean (default: `true`)
3. `application/json` (Pre-Structured Document):
   - `document`: Canonical `StructuredDocument` object

### `POST /api/v1/compare` (Phase 5)
Compares two legal contracts (Contract A baseline vs Contract B revised draft) using deterministic clause alignment, Gemini semantic comparison, and independent dual-source quote verification.

```text
Document A + Document B
       │
       ▼
Deterministic Ingestion (Phase 2)
       │
Deterministic Clause Alignment (outline numbers, section headings, stem similarity)
       │
Bounded Comparison Context (<untrusted_contract_a>, <untrusted_contract_b>)
       │
Gemini 2.5 Flash / Mock Provider (structured JSON output)
       │
Strict Zod Schema Validation (Level 1)
       │
Independent Dual Source Quote Verification (Level 2: Doc A + Doc B)
       │
Verified Comparison Result
```

**Supported Content-Types:**
1. `multipart/form-data`:
   - `file_a` & `file_b`: Contract files (`.pdf`, `.txt`, `.md` up to 500 KB each)
   - `reject_unverified`: optional boolean (default: `true`)
2. `application/json` (Nested Objects):
   - `contract_a`: `{ raw_text: string, file_name?: string }` or `{ document: StructuredDocument }`
   - `contract_b`: `{ raw_text: string, file_name?: string }` or `{ document: StructuredDocument }`
   - `reject_unverified`: optional boolean (default: `true`)
3. `application/json` (Flat Structure):
   - `raw_text_a`, `raw_text_b`, `file_name_a?`, `file_name_b?`

**Evidence Verification Note:**
> Displayed source quotes are independently checked against the uploaded documents. Verification means the quoted evidence exists in the source document; it does not mean the AI's legal interpretation is guaranteed to be legally binding or correct. Consult qualified legal counsel.

---

## Verification & Testing Suite

```bash
# Run Vitest test suite (119 unit and integration tests across 30 test files)
npm test

# Type-check TypeScript strictly (0 errors)
npm run typecheck

# Lint codebase (0 errors, 0 warnings)
npm run lint

# Build production application
npm run build
```

---

## Known Scope Limitations & Non-Goals

ClauseGuard is intentionally engineered for grounded contract intelligence:
* **No Vector Databases / No RAG:** Grounding is achieved via deterministic section/clause indexing and full document structuring.
* **No Open-Ended Conversational Chatbot:** Architecture is structured around verifiable findings anchored to source evidence.
* **No Permanent Document Storage:** Ingestion and audit execute request-based in memory to preserve confidentiality.
* **No Legal Advice:** System provides document-grounded observations and questions for legal counsel, not legal representation.
