import 'server-only';
import { ComparisonResult, ComparisonFinding } from '@/types/domain';
import { GLOBAL_LEGAL_DISCLAIMER } from '@/lib/constants/disclaimers';

/**
 * Escapes untrusted text for safe HTML injection.
 */
function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface CategoryGroup {
  category: string;
  categoryLabel: string;
  findings: ComparisonFinding[];
  topFinding: ComparisonFinding;
  overallStatus: 'changed' | 'added' | 'removed' | 'ambiguous' | 'same';
  highestAttention: ComparisonFinding['attention_level'];
}

function groupFindingsByCategory(findings: ComparisonFinding[]): CategoryGroup[] {
  const map = new Map<string, ComparisonFinding[]>();

  for (const f of findings) {
    const cat = f.category || 'GENERAL';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(f);
  }

  const groups: CategoryGroup[] = [];
  const statusOrder: Record<string, number> = { changed: 1, added: 2, removed: 3, ambiguous: 4, same: 5 };
  const attentionOrder: Record<string, number> = {
    HIGH_ATTENTION: 1,
    MEDIUM_ATTENTION: 2,
    LOW_ATTENTION: 3,
    INFORMATIONAL: 4,
    STANDARD_NOTICE: 5,
  };

  map.forEach((catFindings, cat) => {
    const sorted = [...catFindings].sort(
      (a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
    );
    const topFinding = sorted[0];

    let overallStatus: CategoryGroup['overallStatus'] = 'same';
    if (catFindings.some((f) => f.status === 'changed')) overallStatus = 'changed';
    else if (catFindings.some((f) => f.status === 'added')) overallStatus = 'added';
    else if (catFindings.some((f) => f.status === 'removed')) overallStatus = 'removed';
    else if (catFindings.some((f) => f.status === 'ambiguous')) overallStatus = 'ambiguous';

    const highestAttention = catFindings.reduce((highest, curr) => {
      const currRank = attentionOrder[curr.attention_level] || 99;
      const highestRank = attentionOrder[highest] || 99;
      return currRank < highestRank ? curr.attention_level : highest;
    }, catFindings[0].attention_level);

    groups.push({
      category: cat,
      categoryLabel: cat.replace(/_/g, ' '),
      findings: catFindings,
      topFinding,
      overallStatus,
      highestAttention,
    });
  });

  groups.sort((a, b) => {
    const diff = (statusOrder[a.overallStatus] || 99) - (statusOrder[b.overallStatus] || 99);
    if (diff !== 0) return diff;
    return a.categoryLabel.localeCompare(b.categoryLabel);
  });

  return groups;
}

/**
 * Generates an executive print-ready HTML comparison memorandum.
 */
export function generateComparisonHtmlReport(comparison: ComparisonResult): string {
  const metaA = comparison.metadata.contract_a_metadata;
  const metaB = comparison.metadata.contract_b_metadata;
  const nameA = metaA?.file_name || 'Contract_A.txt';
  const nameB = metaB?.file_name || 'Contract_B.txt';
  const formattedDate = new Date(comparison.metadata.timestamp || Date.now()).toUTCString();
  const groups = groupFindingsByCategory(comparison.findings);

  const changedCount = comparison.findings.filter((f) => f.status === 'changed').length;
  const addedCount = comparison.findings.filter((f) => f.status === 'added').length;
  const removedCount = comparison.findings.filter((f) => f.status === 'removed').length;
  const sameCount = comparison.findings.filter((f) => f.status === 'same').length;

  const counselQuestions = comparison.findings
    .filter((f) => Boolean(f.suggested_question_for_counsel))
    .map((f) => ({
      category: f.category.replace(/_/g, ' '),
      title: f.title,
      status: f.status,
      clauseA: f.contract_a_source?.clause_id || '—',
      clauseB: f.contract_b_source?.clause_id || '—',
      question: f.suggested_question_for_counsel!,
    }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ClauseGuard Contract Comparison Memorandum — ${escapeHtml(nameA)} vs ${escapeHtml(nameB)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background-color: #f8fafc;
      line-height: 1.5;
      font-size: 14px;
      -webkit-font-smoothing: antialiased;
    }
    .no-print {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .btn {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid transparent;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-primary { background: #d97706; color: #ffffff; }
    .btn-primary:hover { background: #b45309; }
    .btn-secondary { background: #334155; color: #f8fafc; border-color: #475569; }
    .btn-secondary:hover { background: #475569; }
    .report-container {
      max-width: 900px;
      margin: 24px auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 48px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    @media print {
      body { background: #ffffff; color: #000000; font-size: 12px; }
      .no-print { display: none !important; }
      .report-container {
        border: none;
        box-shadow: none;
        padding: 0;
        margin: 0;
        max-width: 100%;
      }
      @page {
        size: letter;
        margin: 16mm 16mm 18mm 16mm;
      }
      .page-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
      .page-break-after-avoid { break-after: avoid; page-break-after: avoid; }
    }
    h1, h2, h3, h4 { color: #0f172a; font-weight: 800; tracking-tight: -0.02em; }
    .header-bar {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }
    .brand-title { font-size: 24px; font-weight: 900; color: #0f172a; }
    .brand-title span { color: #d97706; }
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-changed { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-added { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-removed { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
    .badge-same { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .badge-verified { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .dual-box-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 12px;
    }
    .doc-side-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
    }
    .doc-side-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
    }
    .verbatim-quote {
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
      font-style: italic;
      color: #1e293b;
      font-size: 12px;
      line-height: 1.5;
    }
    .section-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
      break-inside: avoid;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #334155;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      break-after: avoid;
    }
    .finding-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      break-inside: avoid;
    }
    .counsel-box {
      background: #fffbeb;
      border-left: 3px solid #d97706;
      padding: 10px 14px;
      margin-top: 12px;
      border-radius: 0 6px 6px 0;
      font-size: 12px;
      color: #78350f;
    }
    .disclaimer-box {
      border-top: 1px solid #cbd5e1;
      padding-top: 16px;
      margin-top: 36px;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-weight: 700; color: #334155; border: 1px solid #cbd5e1; }
    td { padding: 8px 12px; border: 1px solid #e2e8f0; vertical-align: top; }
  </style>
</head>
<body>

  <!-- Floating Screen Action Toolbar (hidden when printing) -->
  <div class="no-print">
    <div style="font-weight: 800; font-size: 14px; letter-spacing: -0.01em;">
      ClauseGuard <span style="color: #f59e0b;">Comparison Memorandum Export</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button type="button" onclick="window.print()" class="btn btn-primary">
        🖨️ Print / Save as PDF
      </button>
      <a href="?id=${encodeURIComponent(comparison.comparison_id)}&format=markdown&download=true" class="btn btn-secondary">
        ⬇️ Download Markdown (.md)
      </a>
    </div>
  </div>

  <!-- Main Document Container -->
  <div class="report-container">
    <!-- Header -->
    <div class="header-bar page-break-after-avoid">
      <div>
        <div class="brand-title">Clause<span>Guard</span></div>
        <h1 style="font-size: 18px; margin-top: 4px;">Executive Contract Comparison &amp; Redline Memorandum</h1>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
          <strong>Baseline (A):</strong> ${escapeHtml(nameA)} &bull; 
          <strong>Revised (B):</strong> ${escapeHtml(nameB)}
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
          Comparison ID: <code>${escapeHtml(comparison.comparison_id)}</code>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; color: #64748b;">Report Date</div>
        <div style="font-weight: 700; font-size: 12px;">${escapeHtml(formattedDate)}</div>
        <div class="status-badge badge-verified" style="margin-top: 6px;">Dual-Source Verified</div>
      </div>
    </div>

    <!-- Executive Summary -->
    <div class="section-box page-break-inside-avoid">
      <div class="section-title">1. Executive Change Story &amp; Variance Summary</div>
      <p style="font-size: 13px; line-height: 1.6; color: #334155;">
        ${escapeHtml(comparison.summary)}
      </p>

      <!-- Variance Metric Rollups -->
      <div style="display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap;">
        <span class="status-badge badge-changed" style="padding: 6px 12px; font-size: 11px;">
          ${changedCount} Modified Provisions
        </span>
        <span class="status-badge badge-added" style="padding: 6px 12px; font-size: 11px;">
          ${addedCount} Newly Added in B
        </span>
        <span class="status-badge badge-removed" style="padding: 6px 12px; font-size: 11px;">
          ${removedCount} Omitted from B
        </span>
        <span class="status-badge badge-same" style="padding: 6px 12px; font-size: 11px;">
          ${sameCount} Substantially Same
        </span>
      </div>
    </div>

    <!-- Category Breakdown -->
    <div class="section-box page-break-inside-avoid" style="background: #ffffff;">
      <div class="section-title">2. Category-by-Category Shift Breakdown</div>
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Subject Category</th>
            <th style="width: 15%;">Overall Status</th>
            <th style="width: 18%;">Highest Priority</th>
            <th>Primary Substantive Shift</th>
          </tr>
        </thead>
        <tbody>
          ${groups.map((g) => `
            <tr>
              <td><strong>${escapeHtml(g.categoryLabel)}</strong></td>
              <td>
                <span class="status-badge ${g.overallStatus === 'changed' ? 'badge-changed' : g.overallStatus === 'added' ? 'badge-added' : g.overallStatus === 'removed' ? 'badge-removed' : 'badge-same'}">
                  ${escapeHtml(g.overallStatus)}
                </span>
              </td>
              <td>${escapeHtml(g.highestAttention.replace(/_/g, ' '))}</td>
              <td>${escapeHtml(g.topFinding.plain_english_summary)}</td>
            </tr>
          `).join('\n')}
        </tbody>
      </table>
    </div>

    <!-- Dual Verified Evidence & Detailed Observations -->
    <div style="margin-top: 32px;">
      <div class="section-title">3. Detailed Clause Variances &amp; Dual Source Evidence</div>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 16px;">
        Comparing corresponding clauses with independent quote verification against both baseline and revised text:
      </p>

      ${comparison.findings.length === 0 ? `
        <div style="padding: 24px; text-align: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b;">
          <strong>No differences detected between Contract A and Contract B.</strong> Both contracts contain identical provisions across all aligned clauses.
        </div>
      ` : comparison.findings.map((finding, idx) => `
        <div class="finding-card page-break-inside-avoid">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">
                ${escapeHtml(finding.category.replace(/_/g, ' '))}
              </div>
              <h3 style="font-size: 15px; margin-top: 2px;">${idx + 1}. ${escapeHtml(finding.title)}</h3>
            </div>
            <div style="display: flex; gap: 6px;">
              <span class="status-badge ${finding.status === 'changed' ? 'badge-changed' : finding.status === 'added' ? 'badge-added' : finding.status === 'removed' ? 'badge-removed' : 'badge-same'}">
                ${escapeHtml(finding.status)}
              </span>
              <span class="status-badge ${finding.attention_level === 'HIGH_ATTENTION' ? 'badge-high' : 'badge-med'}">
                ${escapeHtml(finding.attention_level.replace(/_/g, ' '))}
              </span>
            </div>
          </div>

          <!-- Plain-English Variance Summary -->
          <div style="margin-top: 8px;">
            <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">What Changed:</div>
            <p style="font-size: 13px; color: #334155; line-height: 1.5; margin-top: 2px;">
              ${escapeHtml(finding.plain_english_summary)}
            </p>
          </div>

          ${finding.practical_implication ? `
            <div style="margin-top: 8px;">
              <div style="font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase;">Commercial Implication:</div>
              <p style="font-size: 12px; color: #78350f; line-height: 1.5; margin-top: 2px;">
                ${escapeHtml(finding.practical_implication)}
              </p>
            </div>
          ` : ''}

          <!-- Side-by-Side Dual Source Evidence -->
          <div class="dual-box-grid">
            <!-- Contract A -->
            <div class="doc-side-box" style="border-left: 3px solid #2563eb;">
              <div class="doc-side-label" style="color: #1d4ed8;">
                <span>Contract A (Baseline)</span>
                ${finding.contract_a_source ? `<span>Clause: ${escapeHtml(finding.contract_a_source.clause_id)}</span>` : ''}
              </div>
              ${finding.contract_a_source?.exact_quote ? `
                <div class="verbatim-quote">&ldquo;${escapeHtml(finding.contract_a_source.exact_quote)}&rdquo;</div>
                <div style="margin-top: 6px;">
                  <span class="status-badge badge-verified">✓ Verified</span>
                  ${finding.contract_a_source.page_number ? `<span style="font-size: 11px; color: #64748b; margin-left: 4px;">Page ${finding.contract_a_source.page_number}</span>` : ''}
                </div>
              ` : `
                <div style="font-size: 11px; color: #94a3b8; font-style: italic;">
                  No corresponding provision found in Contract A.
                </div>
              `}
            </div>

            <!-- Contract B -->
            <div class="doc-side-box" style="border-left: 3px solid #d97706;">
              <div class="doc-side-label" style="color: #b45309;">
                <span>Contract B (Revised)</span>
                ${finding.contract_b_source ? `<span>Clause: ${escapeHtml(finding.contract_b_source.clause_id)}</span>` : ''}
              </div>
              ${finding.contract_b_source?.exact_quote ? `
                <div class="verbatim-quote">&ldquo;${escapeHtml(finding.contract_b_source.exact_quote)}&rdquo;</div>
                <div style="margin-top: 6px;">
                  <span class="status-badge badge-verified">✓ Verified</span>
                  ${finding.contract_b_source.page_number ? `<span style="font-size: 11px; color: #64748b; margin-left: 4px;">Page ${finding.contract_b_source.page_number}</span>` : ''}
                </div>
              ` : `
                <div style="font-size: 11px; color: #94a3b8; font-style: italic;">
                  Provision omitted from Contract B draft.
                </div>
              `}
            </div>
          </div>

          <!-- Question for Counsel -->
          ${finding.suggested_question_for_counsel ? `
            <div class="counsel-box">
              <strong>Negotiation / Counsel Question:</strong> ${escapeHtml(finding.suggested_question_for_counsel)}
            </div>
          ` : ''}
        </div>
      `).join('\n')}
    </div>

    <!-- Questions for Counsel Negotiation Table -->
    ${counselQuestions.length > 0 ? `
      <div class="section-box page-break-inside-avoid" style="margin-top: 32px;">
        <div class="section-title">4. Actionable Negotiation Checklist for Legal Counsel</div>
        <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
          Strategic questions tailored to discuss during contract redline review or counterpart negotiations:
        </p>
        <table>
          <thead>
            <tr>
              <th style="width: 20%;">Category / Topic</th>
              <th style="width: 15%;">Clauses (A ↔ B)</th>
              <th>Targeted Negotiation Question</th>
            </tr>
          </thead>
          <tbody>
            ${counselQuestions.map((q) => `
              <tr>
                <td><strong>${escapeHtml(q.category)}</strong><br /><span style="font-size: 11px; color: #64748b;">${escapeHtml(q.title)}</span></td>
                <td><code>${escapeHtml(q.clauseA)} ↔ ${escapeHtml(q.clauseB)}</code></td>
                <td>${escapeHtml(q.question)}</td>
              </tr>
            `).join('\n')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- Regulatory Boundary Disclaimer -->
    <div class="disclaimer-box page-break-inside-avoid">
      <strong>Statutory Regulatory Notice &amp; Anti-UPL Statement:</strong><br />
      ${escapeHtml(GLOBAL_LEGAL_DISCLAIMER)}
    </div>
  </div>

</body>
</html>`;
}

/**
 * Generates an executive Markdown comparison memorandum (.md).
 */
export function generateComparisonMarkdownReport(comparison: ComparisonResult): string {
  const nameA = comparison.metadata.contract_a_metadata?.file_name || 'Contract_A.txt';
  const nameB = comparison.metadata.contract_b_metadata?.file_name || 'Contract_B.txt';
  const formattedDate = new Date(comparison.metadata.timestamp || Date.now()).toUTCString();
  const groups = groupFindingsByCategory(comparison.findings);

  const lines: string[] = [
    `# ClauseGuard Executive Contract Comparison Memorandum`,
    ``,
    `> **Baseline Contract (A):** ${nameA}  `,
    `> **Revised Contract (B):** ${nameB}  `,
    `> **Comparison ID:** \`${comparison.comparison_id}\`  `,
    `> **Report Date:** ${formattedDate}  `,
    `> **Source Evidence Verification:** Dual-Source Verified against Verbatim Text  `,
    ``,
    `---`,
    ``,
    `## 1. Executive Summary & Change Story`,
    ``,
    comparison.summary,
    ``,
    `### Overview of Revisions`,
    `- **Modified Terms:** ${comparison.findings.filter((f) => f.status === 'changed').length}`,
    `- **Newly Added:** ${comparison.findings.filter((f) => f.status === 'added').length}`,
    `- **Omitted / Removed:** ${comparison.findings.filter((f) => f.status === 'removed').length}`,
    `- **Substantially Same:** ${comparison.findings.filter((f) => f.status === 'same').length}`,
    ``,
    `---`,
    ``,
    `## 2. Category-by-Category Shift Summary`,
    ``,
    `| Category | Status | Highest Priority | Key Shift |`,
    `| :--- | :--- | :--- | :--- |`,
  ];

  for (const g of groups) {
    lines.push(
      `| ${g.categoryLabel} | \`${g.overallStatus}\` | ${g.highestAttention} | ${g.topFinding.plain_english_summary.replace(/\|/g, '-')} |`
    );
  }
  lines.push(``, `---`, ``, `## 3. Detailed Clause Variances & Dual Verified Evidence`, ``);

  if (comparison.findings.length === 0) {
    lines.push(`*No differences detected between Contract A and Contract B.*`, ``);
  } else {
    comparison.findings.forEach((finding, idx) => {
      lines.push(
        `### ${idx + 1}. ${finding.title}`,
        `- **Category:** ${finding.category.replace(/_/g, ' ')}`,
        `- **Status:** \`${finding.status}\``,
        `- **Attention Tier:** \`${finding.attention_level}\``,
        ``,
        `**What Changed:**`,
        `${finding.plain_english_summary}`,
        ``
      );

      if (finding.practical_implication) {
        lines.push(`**Commercial Implication:**`, `${finding.practical_implication}`, ``);
      }

      lines.push(`**Dual Source Evidence:**`, ``);

      if (finding.contract_a_source?.exact_quote) {
        lines.push(
          `- **Contract A Quote (\`${finding.contract_a_source.clause_id}\`):**`,
          `  > "${finding.contract_a_source.exact_quote}"`
        );
      } else {
        lines.push(`- **Contract A:** *No corresponding provision found in baseline agreement.*`);
      }

      if (finding.contract_b_source?.exact_quote) {
        lines.push(
          `- **Contract B Quote (\`${finding.contract_b_source.clause_id}\`):**`,
          `  > "${finding.contract_b_source.exact_quote}"`
        );
      } else {
        lines.push(`- **Contract B:** *Provision omitted from revised draft.*`);
      }

      lines.push(``);

      if (finding.suggested_question_for_counsel) {
        lines.push(`**Negotiation Question:** *${finding.suggested_question_for_counsel}*`, ``);
      }

      lines.push(`---`, ``);
    });
  }

  lines.push(
    `## 4. Statutory Regulatory Notice & Anti-UPL Statement`,
    ``,
    GLOBAL_LEGAL_DISCLAIMER,
    ``
  );

  return lines.join('\n');
}
