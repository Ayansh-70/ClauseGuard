import { describe, it, expect } from 'vitest';
import { createDeterministicChunks } from '@/lib/domain/deterministic-chunker';
import { Clause } from '@/types/domain';

describe('Deterministic Chunker', () => {
  it('creates discrete chunks preserving parent clause references', () => {
    const clauses: Clause[] = [
      {
        clause_id: 'clause_001',
        document_id: 'doc_100',
        section_id: 'sec_001',
        text: 'This is clause one text.',
        start_offset: 0,
        end_offset: 24,
        line_number: 1,
        subclause_ids: [],
      },
      {
        clause_id: 'clause_002',
        document_id: 'doc_100',
        section_id: 'sec_001',
        text: 'This is clause two text.',
        start_offset: 26,
        end_offset: 50,
        line_number: 3,
        subclause_ids: [],
      },
    ];

    const chunks = createDeterministicChunks('doc_100', clauses);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].chunk_id).toBe('chunk_001');
    expect(chunks[0].clause_id).toBe('clause_001');
    expect(chunks[0].sequence_index).toBe(0);

    expect(chunks[1].chunk_id).toBe('chunk_002');
    expect(chunks[1].clause_id).toBe('clause_002');
    expect(chunks[1].sequence_index).toBe(1);
  });

  it('splits long clauses cleanly along sentence boundaries without data loss', () => {
    const longSentence = 'The contractor shall provide dedicated support. '.repeat(60); // ~2880 chars
    const clauses: Clause[] = [
      {
        clause_id: 'clause_001',
        document_id: 'doc_long',
        text: longSentence.trim(),
        start_offset: 0,
        end_offset: longSentence.trim().length,
        line_number: 1,
        subclause_ids: [],
      },
    ];

    const chunks = createDeterministicChunks('doc_long', clauses);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.clause_id).toBe('clause_001');
      expect(chunk.document_id).toBe('doc_long');
      expect(chunk.text.length).toBeGreaterThan(0);
    }
  });
});
