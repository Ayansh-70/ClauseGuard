import { describe, it, expect } from 'vitest';
import { ingestRawText, ingestFileBuffer } from '@/lib/domain/ingestion-pipeline';

describe('Ingestion Pipeline & Source Traceability', () => {
  const sampleContract = [
    'INDEPENDENT CONTRACTOR AGREEMENT',
    '',
    'ARTICLE 1: ENGAGEMENT & SCOPE',
    '1.1 Services. Contractor shall provide consulting services as requested by Client.',
    '',
    '1.2 Standard of Care. Contractor agrees to perform services in a workmanlike manner.',
    '',
    'ARTICLE 2: COMPENSATION & PAYMENT',
    '2.1 Fees. Client shall pay Contractor $150.00 per hour, payable Net-30.',
    '',
    'ARTICLE 3: INDEMNIFICATION',
    '3.1 Contractor Indemnity. Contractor agrees to defend and indemnify Client against third-party claims.',
  ].join('\n');

  it('ingests raw text and produces a fully populated StructuredDocument', async () => {
    const doc = await ingestRawText(sampleContract, 'sample_contract.txt');

    expect(doc.metadata.document_id).toBeDefined();
    expect(doc.metadata.file_name).toBe('sample_contract.txt');
    expect(doc.metadata.format).toBe('text/plain');
    expect(doc.pages).toHaveLength(1);
    expect(doc.sections.length).toBeGreaterThanOrEqual(3);
    expect(doc.clauses.length).toBeGreaterThanOrEqual(4);
    expect(doc.chunks.length).toBeGreaterThanOrEqual(4);
    expect(doc.security_status.passed).toBe(true);

    // Source Traceability Assertion: Every clause can be traced directly to canonical text
    for (const clause of doc.clauses) {
      const sliced = doc.canonical_text.slice(clause.start_offset, clause.end_offset);
      expect(sliced).toBe(clause.text);
      expect(clause.clause_id).toMatch(/^clause_\d+$/);
    }

    // Every chunk links to an existing clause
    for (const chunk of doc.chunks) {
      expect(doc.clauses.some((c) => c.clause_id === chunk.clause_id)).toBe(true);
      expect(chunk.chunk_id).toMatch(/^chunk_\d+$/);
    }
  });

  it('ingests file buffer with deterministic hashing', async () => {
    const buffer = Buffer.from(sampleContract, 'utf-8');
    const doc = await ingestFileBuffer('contract.txt', buffer);

    expect(doc.metadata.sha256_hash).toBeDefined();
    expect(doc.metadata.sha256_hash.length).toBe(64);
    expect(doc.metadata.file_size_bytes).toBe(buffer.length);
  });
});
