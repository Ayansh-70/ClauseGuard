# ClauseGuard — Competition Demo Guide & Evaluator Walkthrough

This guide provides the recommended presentation sequence, live demonstration steps, and evaluator talking points for **ClauseGuard**.

---

## 1. Demo Objective

By the end of the demonstration, an evaluator or judge will clearly understand:
1. **The Problem:** Commercial operators and founders sign complex agreements without understanding high-risk liabilities, or paste sensitive contracts into generic chatbots that hallucinate terms and provide unverified legal claims.
2. **The Product Differentiator:** ClauseGuard is not an open-ended conversational chatbot or an autonomous lawyer; it is an **engineered legal-document intelligence workstation** that deterministically parses agreements and grounds every single observation back to verified document text.
3. **The Core Trust Promise:** **"Don't just trust the AI — verify the finding against the source document."**
4. **The Product Narrative:**
   ```text
   Understand → Identify What Matters → Verify Against the Document → Understand What Changed → Know What to Ask Next
   ```

---

## 2. Opening & Positioning (60 Seconds)

- **Start on the Landing Page (`/`):**
  - Highlight the clean, purposeful positioning: *"Review Commercial Contracts with Verifiable Evidence"*.
  - Point out the ethical anti-UPL disclaimer banner at the top of the workstation: ClauseGuard is informational assistance that empowers founders to ask the right questions to legal counsel, not an attorney replacement.
  - Click **"Analyze a Document"** or **"Open Workstation"** to navigate directly to `/workspace`.

---

## 3. Demo A — Single Document Audit Walkthrough (3 Minutes)

### Step 1: Load Sample Contract
- In the **Document Ingestion** panel, click **"Load Sample Contract"**.
- Select **"Master Consulting Agreement"** (Nexus Corporation vs. Apex Advisory Group).
- Note the file name (`Master Consulting Agreement.txt`) and file size populate cleanly with a "Ready for audit" confirmation.

### Step 2: Run Grounded Audit
- Click the black **"Analyze Agreement"** button.
- Observe the transparent stage tracker:
  1. *File Ingestion & Format Validation*
  2. *Canonical Text Extraction & Normalization*
  3. *Clause Segmentation & Indexing*
  4. *Grounded AI Audit Inference*
  5. *Server-Side Quote Verification*

### Step 3: Immediate 3-Question Executive Overview
- Show the top **Document Overview** card, which answers the operator's first three questions in under 5 seconds:
  1. *What kind of document is this?* → **Commercial Consulting / Services Agreement** (inferred classification).
  2. *How much deserves attention?* → Total findings categorized into **High Attention**, **Medium Attention**, and **Standard Notices**.
  3. *Where should I look first?* → **Grounded Source Status (100% Verified Quotes)**.

### Step 4: Priority Review ("Start Here")
- Direct the judge's eyes to the **Priority Review** section above the full findings list.
- Highlight the top high-attention finding: **"Unilateral Indemnity Exposure"**.
- Explain the business risk: The consultant is required to indemnify the client without any liability cap or reciprocal protection.

### Step 5: The Evidence Grounding Moment
- Click the **"View clause"** button (or click the card to open details and select "View in document").
- The **Interactive Evidence Navigator** modal opens:
  - Show the **verbatim quote** highlighted in a semantic amber `<mark>` tag within the exact source clause.
  - Toggle **"Surrounding context"** to show the preceding and succeeding text in the agreement.
  - Emphasize the core architectural trust guarantee: The reviewer can verify with their own eyes that this clause exists in Section 3 of the actual contract.
  - Show the pre-drafted **"Question for Legal Counsel"**: *"Can this indemnification obligation be made mutual and subject to an aggregate monetary cap?"*
  - Click the **"Copy"** button to show 1-click export to clipboard for sending to an attorney.

### Step 6: Export the Audit Report
- In the Document Overview bar, click **"Export Report"**.
- Click **"Print / Save as PDF"** to open a new tab with the publication-ready HTML executive report, complete with executive summary, attention breakdown, verified quotes, and counsel questions.
- (Optional) Click **"Download Markdown (.md)"** to show clean, portable export for internal documentation.

---

## 4. Demo B — Contract Comparison Walkthrough (3 Minutes)

### Step 1: Switch to Comparison Mode
- In the top header bar, click **"Compare Documents"** (or click "Compare Two Documents" on landing).
- Notice the dual-panel layout for **Contract A (Baseline)** and **Contract B (Revised / Proposed)**.

### Step 2: 1-Click Comparison Sample
- Under the Quick-Start Comparison Samples, click **"Consulting Agreement: Baseline vs. Counterproposal"**.
- Both Contract A and Contract B populate instantly with representative contract files.

### Step 3: Run Comparison
- Click the black **"Compare Contracts"** button.
- Follow the 4-stage tracker: *Ingesting Documents* → *Aligning Clauses* → *Analyzing Semantic Variance* → *Verifying Quotes*.

### Step 4: Executive Change Story by Category
- Point out the **Executive Change Story**: Rather than showing an undifferentiated list of 15 raw diffs, ClauseGuard groups changes into human-readable commercial categories:
  - **Payment Terms:** Shift from Net-90 days to Net-30 days.
  - **Indemnification:** Shift from unilateral uncapped liability to a mutual $50,000 cap.
  - **Termination:** Change from 5-day client notice to mutual 30-day notice.
  - **Security & Audit Rights:** A newly introduced provision in Contract B that had no counterpart in Contract A.

### Step 5: Side-by-Side Dual-Source Evidence Navigation
- In the findings grid, open the **"Security Audit Rights Added"** card.
- In the Evidence Navigator modal, demonstrate asymmetric provision handling:
  - Contract A displays: *"No corresponding provision found in Contract A (New provision introduced in Contract B)"*.
  - Contract B displays: Exact Clause 8 highlighted with verified source text.
- Show the counsel question: *"Are the audit frequency and notice periods reasonable for our operational team?"*

---

## 5. Recovery, Fallbacks & Offline Demo Guarantee

- **Zero External Network Dependency (100% Reliable Offline Demo):**
  - If no `GEMINI_API_KEY` is provided in `.env.local`, or if the network is disconnected, ClauseGuard automatically falls back to its built-in `MockGeminiProvider`.
  - The mock provider deterministically parses the uploaded document, performs structural clause segmentation, extracts realistic high-attention findings, and mathematically verifies quotes against the provided text.
  - **Judges will never experience an API rate limit, API timeout, or blank error screen during a live evaluation.**

---

## 6. Judge-Facing Technical FAQ

### Q1: Why not just use ChatGPT or an open-ended conversational legal chatbot?
> **Answer:** General-purpose chatbots suffer from three critical flaws in legal workflows:
> 1. **No Grounded Traceability:** They summarize text freely, making it impossible to know whether a claim corresponds to an actual clause, an altered sentence, or a hallucination.
> 2. **Context Window Drift & Privacy:** Chatbots encourage pasting confidential contracts into chat windows with unknown retention policies. ClauseGuard runs in volatile server memory with zero disk or browser storage.
> 3. **Unstructured Output:** Legal workflows require structured outputs: attention rankings, exact clause coordinates, plain-English translations, and concrete questions for legal counsel.

### Q2: How do you reduce hallucination risk?
> **Answer:** We use a two-step defense-in-depth architecture:
> 1. **Structured Extraction First:** We parse and segment the contract into canonical clauses *before* AI inference. The model is constrained to cite exact verbatim quotes.
> 2. **Independent Verification Second:** The AI's output is not trusted blindly. An independent TypeScript verifier searches the canonical document text for the cited quote using exact substring and normalized matching. Any quote that cannot be found is quarantined as unverified.

### Q3: How does the Evidence Resolver work?
> **Answer:** When viewing evidence, the resolver uses a 4-tier fallback:
> - **Tier 1:** Stored exact character range offsets.
> - **Tier 2:** Literal verbatim substring search.
> - **Tier 3:** Normalized search accounting for smart quotes, em-dashes, and irregular spacing.
> - **Tier 4 (Honest Fallback):** If a quote cannot be mapped, the surrounding clause is still displayed, but the quote is left unhighlighted with a clear "Unmapped Quote" indicator. **We never fabricate a match.**

### Q4: How does contract comparison work?
> **Answer:** Unlike simple line-by-line `diff` tools (which break when sections are reordered or renumbered), ClauseGuard performs **bipartite semantic clause alignment**:
> 1. Clauses are aligned by outline numbering (`1.1` $\leftrightarrow$ `1.1`) and section titles.
> 2. Unmatched clauses are categorized as asymmetric provisions (`Added in B` or `Removed from A`).
> 3. Aligned pairs are passed to the model to assess substantive commercial changes.
> 4. Quotes from both contracts are verified independently against their respective source documents.

### Q5: What happens to uploaded customer documents?
> **Answer:** Complete privacy by design:
> - Documents are parsed in volatile server RAM and discarded after the request completes.
> - Zero filesystem persistence: no files or buffers are ever written to disk or S3.
> - Zero client browser persistence: contract text and quotes are never written to `localStorage` or `sessionStorage`. Active analysis lives only in volatile React component state.

### Q6: Does ClauseGuard provide legal advice?
> **Answer:** No. ClauseGuard is strictly an informational document intelligence workstation. It translates dense contract language into plain English and equips commercial operators with targeted questions for licensed legal counsel. Prominent anti-UPL notices are embedded throughout the application, report preambles, and exports.
