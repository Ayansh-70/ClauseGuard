# ClauseGuard

> **A grounded legal-document intelligence workstation that transforms complex contracts into verifiable findings, visual source evidence, and targeted questions for legal counsel.**

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-green?logo=vitest)](https://vitest.dev/)
[![Tests](https://img.shields.io/badge/Tests-283%20Passing-brightgreen)](https://github.com/Ayansh-70/ClauseGuard)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Important Notice (Regulatory Boundary)

**INFORMATIONAL ONLY:** ClauseGuard assists users in understanding contract provisions and organizing questions for legal counsel. It does **not** provide legal advice, legal opinions, statutory determinations, or attorney representation. No attorney-client relationship is formed. Always consult a qualified legal professional licensed in your jurisdiction for binding legal decisions.

---

## Problem

Commercial contracts are notoriously difficult for non-lawyers to evaluate:
- **Dense Legalese:** Important business liabilities are concealed within multi-clause cross-references, indemnity carve-outs, and obscure legal terminology.
- **Hidden Asymmetry:** Unilateral indemnification, unfair payment terms, and short termination windows expose founders and operators to uncapped commercial risks.
- **The LLM Hallucination Trap:** Pasting sensitive contracts into generic conversational chatbots frequently yields fabricated clause citations, missing nuances, and zero verifiable link back to the actual contract text.

## Solution

ClauseGuard replaces open-ended chatbot conversations with a **deterministic legal-document intelligence workstation**. It deterministically segments agreements into addressable clauses, extracts high-attention commercial liabilities, mathematically verifies every cited quote against original contract text, and provides visual source-clause navigation so the user can verify every AI finding with their own eyes.

---

## Product Workflow

```text
Document (PDF, TXT, MD)
   │
   ▼
Understand (Document Classification & Inferred Scope)
   │
   ▼
Identify What Matters (Priority Review: Top Commercial Hazards)
   │
   ▼
Verify Against the Document (Source Quote ──► Exact Clause ──► Surrounding Context)
   │
   ▼
Understand What Changed (Bipartite Semantic Comparison & Change Story by Category)
   │
   ▼
Know What to Ask Next (1-Click Actionable Questions for Legal Counsel)
```

---

## Core Capabilities

1. **Document Understanding:** Automatically detects document type (Commercial Consulting Agreement, Mutual NDA, Software License), structure, sections, and page coordinates.
2. **Priority Review ("Start Here"):** Immediately isolates the top 2–3 high-attention commercial hazards with plain-English summaries and practical business consequences ("Why it matters").
3. **Grounded Findings & Attention Tiers:** Categorizes findings into `HIGH_ATTENTION`, `MEDIUM_ATTENTION`, and `STANDARD_NOTICE` across key commercial categories (Indemnification, Liability, Payment Terms, Termination, IP Rights).
4. **Interactive Evidence Navigator:** Visual side-by-side modal displaying exact source clauses with verbatim quotes highlighted in semantic `<mark>` tags and expandable surrounding context.
5. **Contract Comparison & Change Story:** Compares baseline vs. revised agreements (Contract A vs. Contract B) using deterministic clause alignment and categorizes revisions into a structured commercial narrative.
6. **Asymmetric Provision Handling:** Intelligently detects terms introduced in Contract B that have no counterpart in Contract A, and provisions removed from Contract A.
7. **Targeted Questions for Counsel:** Equips operators with pragmatic, pre-drafted negotiation questions with 1-click clipboard copy to facilitate productive discussions with legal counsel.
8. **Executive Reports & Export:** Generates publication-ready HTML reports optimized for browser Print / Save as PDF, alongside clean, portable Markdown (`.md`) audit trails.

---

## Why ClauseGuard

| Feature | Generic AI Chatbots (e.g. ChatGPT) | ClauseGuard Workstation |
| :--- | :--- | :--- |
| **Grounding Mechanism** | Open-ended prompt generation (prone to hallucinated quotes) | **Deterministic independent quote verifier (O(N) substring + normalized Levenshtein)** |
| **Evidence Traceability** | None; claims cannot be verified against source coordinates | **Interactive Evidence Navigator highlighting exact clause text and surrounding context** |
| **Document Privacy** | Contracts often retained or logged by chat interfaces | **Transient memory-only processing; zero disk persistence; zero browser storage** |
| **Comparison Method** | Flat text comparison; confuses reordered sections | **Bipartite clause alignment by outline labels and semantic similarity** |
| **Output Format** | Unstructured chat responses | **Executive overview, priority review, attention tiers, and PDF/Markdown exports** |
| **Ethical Posture** | Often mimics legal counsel without clear boundaries | **Strict anti-UPL boundaries, disclaimers, and counsel-oriented negotiation prompts** |

---

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, React Server Components, Route Handlers)
- **UI & State:** [React 19](https://react.dev/), [Tailwind CSS 3](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) icons
- **Type Safety & Validation:** [TypeScript 5](https://www.typescriptlang.org/), [Zod 3](https://zod.dev/)
- **Document Parsing:** [`pdf-parse`](https://www.npmjs.com/package/pdf-parse) for PDF extraction, native UTF-8 streaming for text/markdown
- **AI Inference:** Google Gemini 2.5 Flash via official [`@google/genai`](https://www.npmjs.com/package/@google/genai) SDK
- **Offline & Demo Fallback:** Built-in deterministic `MockGeminiProvider` (100% offline evaluation without API key)
- **Testing:** [Vitest 3](https://vitest.dev/), `@testing-library/react`, `jsdom` (283 passing tests across 47 suites)

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                            │
│  • Workstation Landing (/) & Review/Compare Workstation (/workspace)     │
│  • Focus-managed Modals, WCAG Keyboard Navigation, Mobile Touch Targets  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ JSON / Multipart FormData
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           SERVER (Next.js 15)                            │
│                                                                          │
│  1. Ingestion Pipeline:                                                  │
│     Size bounding (500 KB) ──► Extraction ──► Normalization ──► Clauses  │
│                                                                          │
│  2. Deterministic Alignment (Comparison Mode):                           │
│     Section & outline matching ──► Asymmetric detection (Added/Removed) │
│                                                                          │
│  3. Bounded Gemini AI Inference:                                         │
│     <untrusted_contract_text> XML isolation ──► Gemini 2.5 Flash API     │
│     (or deterministic offline MockGeminiProvider) ──► Zod Schema Gate    │
│                                                                          │
│  4. Independent Quote Verification:                                      │
│     Exact substring match ──► Normalized Levenshtein ──► Quarantine gate │
│                                                                          │
│  5. In-Memory Report Store & Evidence Resolver:                          │
│     LRU Cache (MAX 100 docs, 2h TTL) ──► /api/v1/evidence & Exports      │
└──────────────────────────────────────────────────────────────────────────┘
```

For detailed technical designs, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Running Locally

### Prerequisites
- Node.js 18+ (tested on Node v20, v22, v24)
- npm

### 1. Clone & Install
```bash
git clone https://github.com/Ayansh-70/ClauseGuard.git
cd ClauseGuard
npm install
```

### 2. Environment Setup (Optional)
ClauseGuard is fully functional out-of-the-box **without an API key** using its built-in deterministic offline mock provider.

If you wish to test with live Google Gemini models:
```bash
cp .env.example .env.local
```
Add your API key to `.env.local`:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
GEMINI_MODEL="gemini-2.5-flash"
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the landing page, or [http://localhost:3000/workspace](http://localhost:3000/workspace) to open the workstation.

---

## Testing & Verification

ClauseGuard maintains a comprehensive automated test suite spanning unit tests, component accessibility tests, security red-team scenarios, and integration pipelines:

```bash
# Run complete test suite (283 passed tests across 47 test files)
npm test

# Run strict TypeScript compiler check (0 errors)
npm run typecheck

# Run ESLint validation (0 errors, 0 warnings)
npm run lint

# Compile production Next.js build
npm run build
```

---

## Security & Privacy Architecture

- **Transient Memory-Only Processing:** Uploaded contracts are parsed and held strictly in volatile server RAM (bounded in-memory LRU cache with a 2-hour TTL to serve the Evidence Navigator and report exports). No documents are ever written to disk, SQLite, S3, or external persistent databases.
- **Zero Browser Storage:** Contract text, quotes, and findings are never written to `localStorage` or `sessionStorage`. Active analysis lives solely in volatile React state.
- **Prompt-Injection Defense:** Contracts are enclosed in rigid `<untrusted_contract_text>` XML wrappers. Breakout tokens and override directives (`SYSTEM OVERRIDE:`, `IGNORE ALL INSTRUCTIONS`) are sanitized and flagged.
- **Independent Quote Verification:** AI citations are verified against source contract text before being presented to users. Fabricated quotes are quarantined and marked unverified.
- **Input Sanitization & XSS Defense:** All report exports and dynamic UI elements strictly escape untrusted characters. Zero use of `dangerouslySetInnerHTML`.

---

## Project Structure

```text
ClauseGuard/
├── app/
│   ├── layout.tsx                    # Root layout with persistent anti-UPL notice
│   ├── page.tsx                      # Landing page with product positioning
│   ├── workspace/page.tsx            # Main legal intelligence workstation
│   ├── api/v1/
│   │   ├── audit/route.ts            # Single document audit endpoint
│   │   ├── compare/route.ts          # Contract comparison endpoint
│   │   ├── evidence/route.ts         # Grounded evidence & context retrieval
│   │   └── export/
│   │       ├── report/route.ts       # Single audit HTML/Markdown export
│   │       └── comparison-report/route.ts # Comparison HTML/Markdown export
├── components/workstation/           # Workstation React components
│   ├── ContractDropzone.tsx          # Accessible file upload with keyboard support
│   ├── DocumentOverview.tsx          # 3-question executive summary & export menu
│   ├── PriorityReviewSection.tsx     # "Start Here" top risk cards
│   ├── FindingCard.tsx               # Finding card with direct "View clause" action
│   ├── EvidenceNavigator.tsx         # Highlighted clause evidence & context modal
│   ├── ComparisonInputPanel.tsx      # Dual contract input panel
│   ├── ComparisonChangeStory.tsx     # Categorized change narrative
│   └── ComparisonFindingCard.tsx     # Comparison findings with dual verification
├── lib/
│   ├── constants/                    # Sample contracts & legal disclaimers
│   ├── domain/                       # Deterministic parser, aligner & normalizer
│   ├── errors/                       # Standardized application errors
│   ├── schemas/                      # Rigid Zod runtime schemas
│   └── server/                       # AI services, report store & export generators
├── tests/                            # 47 automated test suites (unit & integration)
├── ARCHITECTURE.md                   # In-depth architectural documentation
├── DEMO.md                           # Step-by-step competition demo guide
└── package.json                      # Scripts and dependencies
```

---

## Competition Demo Guide

For evaluators and judges seeking to test the full end-to-end user journey, refer to our comprehensive step-by-step demo guide:

📖 **[Read the Competition Demo Guide (DEMO.md)](./DEMO.md)**

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
