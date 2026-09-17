# JuriLens — ClauseRadar

> **Deterministic Contract Intelligence & Negotiation Workspace**

JuriLens ClauseRadar is an engineered, GenAI-powered legal document understanding workstation for non-lawyers. It deterministically parses commercial agreements, detects asymmetric liabilities and one-sided clauses, mathematically verifies every quote against the original text, and generates balanced, illustrative negotiation alternatives.

---

## Important Notice

**INFORMATIONAL ONLY:** JuriLens assists in understanding contract provisions. It does not provide legal advice, legal opinion, or attorney representation. Consult qualified legal counsel for binding legal decisions.

---

## Current Status: Phase 2 Complete (Document Ingestion & Clause Segmentation Foundation)

Phase 2 establishes the deterministic document ingestion, extraction, normalization, section detection, and clause segmentation foundation that downstream AI analysis depends upon.

### Implemented Pipeline

```text
Document Input (.txt, .md, .pdf)
      ↓
File Validation (MIME, size <= 500KB, magic bytes)
      ↓
Secure Ingestion (Control character scrubbing, injection detection)
      ↓
Text Extraction (PlainTextExtractor / PdfExtractor)
      ↓
Text Normalization (Line wrap hyphen repair, newline standardization)
      ↓
Page / Location Preservation
      ↓
Section Detection (Heuristic heading & article detection)
      ↓
Clause Segmentation (Stable IDs: clause_001, nesting, parent/child)
      ↓
Deterministic Chunking (Traceable chunks referencing source clauses)
      ↓
StructuredDocument (Strict Zod schema validation)
```

---

## Core Architectural Invariants

1. **Deterministic Software Controls Source Truth:** File validation, text normalization, clause segmentation, stable IDs, and source offsets are 100% deterministic. The AI does not chunk the document or invent line positions.
2. **Canonical Normalized Text:** Exactly one canonical text string is produced and referenced across metadata, pages, sections, clauses, chunks, and downstream AI prompts.
3. **Source Traceability:** Every clause retains its exact character span (`start_offset`, `end_offset`), line number, page number, and section ID.
4. **Security Isolation:** Uploaded contract text is treated as untrusted input. Adversarial prompt-injection patterns are detected and flagged without destructively altering legitimate legal terms.
5. **Zero Data Retention in Foundation:** Ingestion executes in-memory with zero persistent database storage.

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

## Running Validation & Tests

```bash
# Run unit & pipeline tests with Vitest
npm run test

# Type-check TypeScript strictly
npm run typecheck

# Lint codebase
npm run lint

# Build production application
npm run build
```

---

## Example Structured Output

```json
{
  "metadata": {
    "document_id": "doc_a1b2c3d4e5f6",
    "file_name": "consulting_agreement.txt",
    "file_size_bytes": 1024,
    "format": "text/plain",
    "extension": "txt",
    "created_at": "2026-09-16T17:00:00.000Z",
    "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "page_count": 1,
    "character_count": 850,
    "word_count": 120
  },
  "canonical_text": "ARTICLE 1: SERVICES\n1.1 Scope...",
  "sections": [
    {
      "section_id": "sec_001",
      "title": "ARTICLE 1: SERVICES",
      "level": 1,
      "start_offset": 0,
      "end_offset": 19
    }
  ],
  "clauses": [
    {
      "clause_id": "clause_001",
      "document_id": "doc_a1b2c3d4e5f6",
      "section_id": "sec_001",
      "number_label": "1.1",
      "title": "1.1 Scope",
      "text": "1.1 Scope. Contractor shall perform...",
      "start_offset": 20,
      "end_offset": 150,
      "line_number": 2,
      "subclause_ids": []
    }
  ]
}
```
