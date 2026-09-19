import 'server-only';
import { AuditResult, Finding } from '@/types/domain';
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

/**
 * Deterministically infers document classification from filename.
 */
function inferDocumentType(fileName: string): string {
  const lower = (fileName || '').toLowerCase();
  if (lower.includes('consulting') || lower.includes('contractor') || lower.includes('services') || lower.includes('msa')) {
    return 'Commercial Consulting / Services Agreement';
  }
  if (lower.includes('nda') || lower.includes('confidential') || lower.includes('disclosure')) {
    return 'Mutual Non-Disclosure Agreement (NDA)';
  }
  if (lower.includes('license') || lower.includes('eula') || lower.includes('saas') || lower.includes('software')) {
    return 'Software License & Technology Agreement';
  }
  if (lower.includes('employment') || lower.includes('offer') || lower.includes('severance')) {
    return 'Employment / Contractor Agreement';
  }
  if (lower.includes('lease') || lower.includes('tenancy') || lower.includes('property')) {
    return 'Commercial Lease Agreement';
  }
  return 'Commercial Agreement';
}

const ATTENTION_ORDER: Record<string, number> = {
  HIGH_ATTENTION: 1,
  MEDIUM_ATTENTION: 2,
  LOW_ATTENTION: 3,
  INFORMATIONAL: 4,
  STANDARD_NOTICE: 5,
};

/**
 * Deterministically extracts the top 3 priority review findings.
 */
function getPriorityFindings(findings: Finding[]): Finding[] {
  return [...findings]
    .sort((a, b) => {
      const rankA = ATTENTION_ORDER[a.attention_level] || 99;
      const rankB = ATTENTION_ORDER[b.attention_level] || 99;
      if (rankA !== rankB) return rankA - rankB;

      const confA = a.confidence ?? 0.8;
      const confB = b.confidence ?? 0.8;
      if (confB !== confA) return confB - confA;

      return a.clause_id.localeCompare(b.clause_id);
    })
    .slice(0, 3);
}

/**
 * Generates an executive print-ready HTML audit memorandum.
 */
export function generateAuditHtmlReport(audit: AuditResult): string {
  const fileName = audit.metadata?.file_name || 'Commercial_Agreement.txt';
  const docType = inferDocumentType(fileName);
  const priorityFindings = getPriorityFindings(audit.findings);
  const formattedDate = new Date(audit.metadata?.audited_at || Date.now()).toUTCString();
  const verifiedRate =
    audit.metadata?.total_findings_count && audit.metadata.total_findings_count > 0
      ? Math.round((audit.metadata.verified_count / audit.metadata.total_findings_count) * 100)
      : 100;

  const counselQuestions = audit.findings
    .filter((f) => Boolean(f.suggested_question_for_counsel))
    .map((f) => ({
      category: f.category.replace(/_/g, ' '),
      clause: f.clause_id,
      attention: f.attention_level.replace(/_/g, ' '),
      question: f.suggested_question_for_counsel!,
    }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ClauseGuard Legal Audit Memorandum — ${escapeHtml(fileName)}</title>
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
      max-width: 850px;
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
    .doc-meta { font-size: 12px; color: #64748b; margin-top: 4px; }
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-high { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
    .badge-med { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-notice { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .badge-verified { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
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
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .summary-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
    }
    .summary-card-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .summary-card-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .finding-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      break-inside: avoid;
    }
    .evidence-box {
      background: #f8fafc;
      border-left: 3px solid #059669;
      padding: 12px 16px;
      margin: 12px 0;
      border-radius: 0 6px 6px 0;
    }
    .evidence-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #065f46;
      margin-bottom: 4px;
    }
    .verbatim-quote {
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
      font-style: italic;
      color: #1e293b;
      font-size: 13px;
      line-height: 1.6;
    }
    .meta-coords {
      font-size: 11px;
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      margin-top: 6px;
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
      ClauseGuard <span style="color: #f59e0b;">Memorandum Export</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button type="button" onclick="window.print()" class="btn btn-primary">
        🖨️ Print / Save as PDF
      </button>
      <a href="?id=${encodeURIComponent(audit.document_id)}&format=markdown&download=true" class="btn btn-secondary">
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
        <h1 style="font-size: 18px; margin-top: 4px;">Grounded Legal Audit &amp; Risk Assessment Memorandum</h1>
        <div class="doc-meta">
          <strong>Document:</strong> ${escapeHtml(fileName)} &bull; 
          <strong>Document ID:</strong> <code>${escapeHtml(audit.document_id)}</code>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; color: #64748b;">Report Date</div>
        <div style="font-weight: 700; font-size: 12px;">${escapeHtml(formattedDate)}</div>
        <div class="status-badge badge-verified" style="margin-top: 6px;">${verifiedRate}% Grounded Match</div>
      </div>
    </div>

    <!-- Executive Summary -->
    <div class="section-box page-break-inside-avoid">
      <div class="section-title">1. Executive Summary &amp; Assessment Overview</div>
      <p style="font-size: 13px; line-height: 1.6; color: #334155;">
        ${escapeHtml(audit.summary)}
      </p>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-card-label">Classification</div>
          <div class="summary-card-val">${escapeHtml(docType)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Scope Analyzed</div>
          <div class="summary-card-val">${audit.metadata?.total_clauses_analyzed || 0} Clauses ${audit.metadata?.page_count ? `(${audit.metadata.page_count} Pages)` : ''}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Grounded Verification</div>
          <div class="summary-card-val" style="color: #059669;">${audit.metadata?.verified_count || 0} of ${audit.metadata?.total_findings_count || 0} Quotes Verified</div>
        </div>
      </div>

      ${audit.primary_concerns && audit.primary_concerns.length > 0 ? `
        <div style="margin-top: 16px;">
          <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px;">Primary Commercial Risk Areas:</div>
          <ul style="padding-left: 18px; font-size: 12px; color: #334155; line-height: 1.6;">
            ${audit.primary_concerns.map((c) => `<li>${escapeHtml(c)}</li>`).join('\n')}
          </ul>
        </div>
      ` : ''}
    </div>

    <!-- Priority Review: Start Here -->
    <div class="section-box page-break-inside-avoid" style="background: #fffbeb; border-color: #fde68a;">
      <div class="section-title" style="color: #92400e;">
        2. Priority Review — Provisions Deserving Immediate Attention
      </div>
      <p style="font-size: 12px; color: #78350f; margin-bottom: 12px;">
        The top ${priorityFindings.length} contractual obligations and exposures identified by deterministic attention hierarchy:
      </p>

      ${priorityFindings.map((p, idx) => `
        <div style="background: #ffffff; border: 1px solid #fcd34d; border-radius: 6px; padding: 14px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; width: 20px; height: 20px; border-radius: 50%; background: #0f172a; color: #f59e0b; font-size: 11px; font-weight: 800; align-items: center; justify-content: center;">${idx + 1}</span>
              <strong style="font-size: 13px; color: #0f172a;">${escapeHtml(p.title)}</strong>
            </div>
            <div>
              <span class="status-badge ${p.attention_level === 'HIGH_ATTENTION' ? 'badge-high' : 'badge-med'}">${escapeHtml(p.attention_level.replace(/_/g, ' '))}</span>
              <span style="font-size: 11px; color: #64748b; font-family: monospace; margin-left: 6px;">${escapeHtml(p.clause_id)}</span>
            </div>
          </div>
          <p style="font-size: 12px; color: #334155; margin-bottom: 6px;">${escapeHtml(p.plain_language_explanation)}</p>
          ${p.why_it_matters ? `
            <div style="font-size: 11px; color: #92400e; background: #fef3c7; padding: 6px 10px; border-radius: 4px;">
              <strong>Commercial Hazard:</strong> ${escapeHtml(p.why_it_matters)}
            </div>
          ` : ''}
        </div>
      `).join('\n')}
    </div>

    <!-- Complete Verified Findings -->
    <div style="margin-top: 32px;">
      <div class="section-title">3. Comprehensive Document Observations &amp; Verified Source Evidence</div>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 16px;">
        Every observation is mathematically anchored to verbatim contract text through our independent server verification layer.
      </p>

      ${audit.findings.length === 0 ? `
        <div style="padding: 24px; text-align: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b;">
          <strong>No material risk observations detected.</strong> All analyzed clauses adhere to standard balanced commercial conventions.
        </div>
      ` : audit.findings.map((finding) => `
        <div class="finding-card page-break-inside-avoid">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">
                Category: ${escapeHtml(finding.category.replace(/_/g, ' '))}
              </div>
              <h3 style="font-size: 15px; margin-top: 2px;">${escapeHtml(finding.title)}</h3>
            </div>
            <div style="display: flex; gap: 6px;">
              <span class="status-badge ${finding.attention_level === 'HIGH_ATTENTION' ? 'badge-high' : finding.attention_level === 'MEDIUM_ATTENTION' ? 'badge-med' : 'badge-notice'}">
                ${escapeHtml(finding.attention_level.replace(/_/g, ' '))}
              </span>
              <span class="status-badge badge-verified">✓ ${escapeHtml(finding.verification_status.replace(/_/g, ' '))}</span>
            </div>
          </div>

          <!-- Plain-English Observation -->
          <div style="margin-top: 8px;">
            <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">AI Observation:</div>
            <p style="font-size: 13px; color: #334155; line-height: 1.5; margin-top: 2px;">
              ${escapeHtml(finding.plain_language_explanation)}
            </p>
          </div>

          ${finding.why_it_matters ? `
            <div style="margin-top: 8px;">
              <div style="font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase;">Why It Matters:</div>
              <p style="font-size: 12px; color: #78350f; line-height: 1.5; margin-top: 2px;">
                ${escapeHtml(finding.why_it_matters)}
              </p>
            </div>
          ` : ''}

          <!-- Grounded Verbatim Source Evidence -->
          <div class="evidence-box">
            <div class="evidence-label">Verified Original Document Source Evidence:</div>
            <div class="verbatim-quote">&ldquo;${escapeHtml(finding.verbatim_quote)}&rdquo;</div>
            <div class="meta-coords">
              Referenced Clause: <strong>${escapeHtml(finding.clause_id)}</strong>
              ${finding.page_number ? ` &bull; Page: ${finding.page_number}` : ''}
              ${finding.matched_range ? ` &bull; Offsets: [${finding.matched_range.start}..${finding.matched_range.end}]` : ''}
            </div>
          </div>

          <!-- Suggested Counsel Question -->
          ${finding.suggested_question_for_counsel ? `
            <div class="counsel-box">
              <strong>Question for Counsel:</strong> ${escapeHtml(finding.suggested_question_for_counsel)}
            </div>
          ` : ''}
        </div>
      `).join('\n')}
    </div>

    <!-- Questions for Counsel Summary Table -->
    ${counselQuestions.length > 0 ? `
      <div class="section-box page-break-inside-avoid" style="margin-top: 32px;">
        <div class="section-title">4. Actionable Briefing Checklist for Legal Counsel</div>
        <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
          The following targeted questions can be copied and provided directly to qualified legal counsel to streamline the review process:
        </p>
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Category</th>
              <th style="width: 12%;">Clause</th>
              <th style="width: 15%;">Attention</th>
              <th>Targeted Question for Counsel</th>
            </tr>
          </thead>
          <tbody>
            ${counselQuestions.map((q) => `
              <tr>
                <td><strong>${escapeHtml(q.category)}</strong></td>
                <td><code>${escapeHtml(q.clause)}</code></td>
                <td>${escapeHtml(q.attention)}</td>
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
 * Generates an executive Markdown audit memorandum (.md).
 */
export function generateAuditMarkdownReport(audit: AuditResult): string {
  const fileName = audit.metadata?.file_name || 'Commercial_Agreement.txt';
  const docType = inferDocumentType(fileName);
  const priorityFindings = getPriorityFindings(audit.findings);
  const formattedDate = new Date(audit.metadata?.audited_at || Date.now()).toUTCString();

  const lines: string[] = [
    `# ClauseGuard Grounded Legal Audit Memorandum`,
    ``,
    `> **Document:** ${fileName}  `,
    `> **Classification:** ${docType}  `,
    `> **Document ID:** \`${audit.document_id}\`  `,
    `> **Audit Date:** ${formattedDate}  `,
    `> **Verification Status:** ${audit.metadata?.verified_count || 0} of ${audit.metadata?.total_findings_count || 0} Quotes Verified Against Verbatim Contract Text  `,
    ``,
    `---`,
    ``,
    `## 1. Executive Summary`,
    ``,
    audit.summary,
    ``,
    `### Key Document Metrics`,
    `- **Clauses Analyzed:** ${audit.metadata?.total_clauses_analyzed || 0}`,
    `- **Page Count:** ${audit.metadata?.page_count ? `${audit.metadata.page_count} pages` : 'N/A'}`,
    `- **Duration:** ${audit.metadata ? (audit.metadata.duration_ms / 1000).toFixed(2) : '0'}s`,
    `- **Inference Engine:** ${audit.metadata?.model_used || 'deterministic-evaluator'}`,
    ``,
  ];

  if (audit.primary_concerns && audit.primary_concerns.length > 0) {
    lines.push(`### Primary Commercial Concerns`);
    for (const concern of audit.primary_concerns) {
      lines.push(`- ${concern}`);
    }
    lines.push(``);
  }

  lines.push(`---`, ``, `## 2. Priority Review — Start Here`, ``);
  if (priorityFindings.length === 0) {
    lines.push(`*No high-attention findings identified.*`, ``);
  } else {
    priorityFindings.forEach((p, idx) => {
      lines.push(
        `### [${idx + 1}] ${p.title} (${p.category.replace(/_/g, ' ')})`,
        `- **Attention Level:** \`${p.attention_level}\``,
        `- **Clause:** \`${p.clause_id}\``,
        `- **Plain-English Explanation:** ${p.plain_language_explanation}`,
        p.why_it_matters ? `- **Why It Matters:** ${p.why_it_matters}` : '',
        p.suggested_question_for_counsel ? `- **Counsel Question:** *${p.suggested_question_for_counsel}*` : '',
        ``
      );
    });
  }

  lines.push(`---`, ``, `## 3. Comprehensive Document Observations & Verified Evidence`, ``);

  if (audit.findings.length === 0) {
    lines.push(`*No material commercial risk observations detected.*`, ``);
  } else {
    audit.findings.forEach((finding, idx) => {
      lines.push(
        `### ${idx + 1}. ${finding.title}`,
        `- **Category:** ${finding.category.replace(/_/g, ' ')}`,
        `- **Attention Tier:** \`${finding.attention_level}\``,
        `- **Verification Status:** \`${finding.verification_status}\``,
        ``,
        `**AI Observation:**`,
        `${finding.plain_language_explanation}`,
        ``
      );

      if (finding.why_it_matters) {
        lines.push(`**Why It Matters:**`, `${finding.why_it_matters}`, ``);
      }

      lines.push(
        `**Verified Source Evidence:**`,
        `> "${finding.verbatim_quote}"`,
        `> `,
        `> *Clause: \`${finding.clause_id}\`${finding.page_number ? ` | Page ${finding.page_number}` : ''}${finding.matched_range ? ` | Offset [${finding.matched_range.start}..${finding.matched_range.end}]` : ''}*`,
        ``
      );

      if (finding.suggested_question_for_counsel) {
        lines.push(`**Question for Legal Counsel:**`, `*${finding.suggested_question_for_counsel}*`, ``);
      }

      lines.push(`---`, ``);
    });
  }

  lines.push(
    `## 4. Regulatory Notice & Anti-UPL Statement`,
    ``,
    GLOBAL_LEGAL_DISCLAIMER,
    ``
  );

  return lines.join('\n');
}
