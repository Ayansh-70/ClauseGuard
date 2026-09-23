import { describe, it } from 'vitest';
import { ingestRawText, ingestFileBuffer } from '@/lib/domain/ingestion-pipeline';
import { alignDocumentClauses } from '@/lib/domain/clause-aligner';
import { verifyFindings, verifyQuoteAgainstClause } from '@/lib/server/ai/quote-verifier';
import { verifyComparisonFindings } from '@/lib/server/ai/comparison-quote-verifier';
import { resolveEvidence } from '@/lib/domain/evidence-resolver';
import { reportStore } from '@/lib/server/report-store';
import { generateAuditHtmlReport, generateAuditMarkdownReport } from '@/lib/server/reports/audit-report-generator';
import { generateComparisonHtmlReport, generateComparisonMarkdownReport } from '@/lib/server/reports/comparison-report-generator';
import { legalAuditService } from '@/lib/server/ai/legal-audit-service';
import { comparisonService } from '@/lib/server/ai/comparison-service';
import {
  SAMPLE_CONSULTING_AGREEMENT,
  SAMPLE_REVISED_CONSULTING_AGREEMENT,
} from '@/lib/constants/sample-contracts';

describe('Efficiency Benchmark Baseline Suite', () => {
  it('measures baseline performance metrics across all core modules', async () => {
    const results: Record<string, { iterations: number; totalMs: number; avgMs: number; opsPerSec: number }> = {};

    function bench(name: string, iterations: number, fn: () => void | Promise<void>) {
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const ret = fn();
        if (ret instanceof Promise) {
          throw new Error('Use benchAsync for promises');
        }
      }
      const totalMs = performance.now() - start;
      const avgMs = totalMs / iterations;
      results[name] = {
        iterations,
        totalMs: Math.round(totalMs * 100) / 100,
        avgMs: Math.round(avgMs * 1000) / 1000,
        opsPerSec: Math.round(iterations / (totalMs / 1000)),
      };
    }

    async function benchAsync(name: string, iterations: number, fn: () => Promise<void>) {
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await fn();
      }
      const totalMs = performance.now() - start;
      const avgMs = totalMs / iterations;
      results[name] = {
        iterations,
        totalMs: Math.round(totalMs * 100) / 100,
        avgMs: Math.round(avgMs * 1000) / 1000,
        opsPerSec: Math.round(iterations / (totalMs / 1000)),
      };
    }

    // 1. Ingestion Pipeline
    await benchAsync('Ingestion Pipeline (Standard Contract)', 20, async () => {
      await ingestRawText(SAMPLE_CONSULTING_AGREEMENT.content, SAMPLE_CONSULTING_AGREEMENT.name);
    });

    // Scaled 4x Contract (approx 32 clauses, 25KB)
    const scaledTextA = Array(4).fill(SAMPLE_CONSULTING_AGREEMENT.content).join('\n\n');
    const scaledTextB = Array(4).fill(SAMPLE_REVISED_CONSULTING_AGREEMENT.content).join('\n\n');

    await benchAsync('Ingestion Pipeline (Scaled 32-Clause Contract)', 20, async () => {
      await ingestRawText(scaledTextA, 'Scaled_Contract_A.txt');
    });

    const docA = await ingestRawText(SAMPLE_CONSULTING_AGREEMENT.content, SAMPLE_CONSULTING_AGREEMENT.name);
    const docB = await ingestRawText(SAMPLE_REVISED_CONSULTING_AGREEMENT.content, SAMPLE_REVISED_CONSULTING_AGREEMENT.name);
    const scaledDocA = await ingestRawText(scaledTextA, 'Scaled_A.txt');
    const scaledDocB = await ingestRawText(scaledTextB, 'Scaled_B.txt');

    // 2. Clause Aligner
    bench('Clause Aligner (8x8 Aligned Clauses)', 50, () => {
      alignDocumentClauses(docA, docB);
    });

    bench('Clause Aligner (Scaled 32x32 Clauses = 1024 Pairs)', 20, () => {
      alignDocumentClauses(scaledDocA, scaledDocB);
    });

    // 3. Full Mock Legal Audit
    await benchAsync('Legal Audit Service (Full Mock Flow)', 20, async () => {
      await legalAuditService.auditDocument(docA);
    });

    const auditResult = await legalAuditService.auditDocument(docA);

    // 4. Full Mock Comparison Service
    await benchAsync('Comparison Service (Full Mock Flow)', 20, async () => {
      await comparisonService.compareDocuments(docA, docB);
    });

    const comparisonResult = await comparisonService.compareDocuments(docA, docB);

    // 5. Quote Verification
    bench('Quote Verifier (Sliding Window & Exact)', 100, () => {
      for (const finding of auditResult.findings) {
        const targetClause = docA.clauses.find((c) => c.clause_id === finding.clause_id);
        if (targetClause) {
          verifyQuoteAgainstClause(targetClause, finding.verbatim_quote);
        }
      }
    });

    // 6. Evidence Resolver (Simulating 500 interactive lookups)
    bench('Evidence Resolver (500 Resolves: Exact, Normalized, Offset)', 500, () => {
      const clause = docA.clauses[2]; // Indemnification clause
      resolveEvidence({
        clauseText: clause.text,
        clauseStartOffset: clause.start_offset,
        quote: 'Consultant agrees to defend, indemnify, and hold harmless Client',
        matchedRange: { start: clause.start_offset, end: clause.start_offset + 64 },
      });
      resolveEvidence({
        clauseText: clause.text,
        clauseStartOffset: clause.start_offset,
        quote: 'Consultant agrees to defend, indemnify, and hold harmless Client',
      });
      resolveEvidence({
        clauseText: clause.text,
        clauseStartOffset: clause.start_offset,
        quote: 'Consultant agrees to  defend,  indemnify -- and hold harmless Client', // normalized
      });
      resolveEvidence({
        clauseText: clause.text,
        clauseStartOffset: clause.start_offset,
        quote: 'nonexistent fictional text string',
      });
    });

    // 7. Report Generation (HTML & Markdown)
    bench('Report Generation: Audit HTML & Markdown', 50, () => {
      generateAuditHtmlReport(auditResult);
      generateAuditMarkdownReport(auditResult);
    });

    bench('Report Generation: Comparison HTML & Markdown', 50, () => {
      generateComparisonHtmlReport(comparisonResult);
      generateComparisonMarkdownReport(comparisonResult);
    });

    // 8. Report Store (Save + Get + Prune)
    bench('Report Store (100 sequential Saves + Gets)', 100, () => {
      reportStore.saveAuditResult(auditResult);
      reportStore.saveDocument(docA);
      reportStore.getAuditResult(docA.metadata.document_id);
      reportStore.getClauseContext(docA.metadata.document_id, docA.clauses[0].clause_id);
    });

    console.log('\n================== EFFICIENCY BASELINE BENCHMARK ==================');
    console.table(results);
    console.log('===================================================================\n');
  });
});
