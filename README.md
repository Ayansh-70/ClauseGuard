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

---

## Verification & Testing Suite

```bash
# Run Vitest test suite (77 unit and integration tests)
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
