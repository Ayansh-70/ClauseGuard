import { Chunk, Clause } from '@/types/domain';

/**
 * Maximum target character length per chunk (~400-500 tokens)
 */
const TARGET_CHUNK_CHARS = 1600;

/**
 * Creates deterministic, bounded text chunks from segmented clauses.
 * Each chunk maintains strict traceability back to its source clause, section, and page.
 */
export function createDeterministicChunks(documentId: string, clauses: Clause[]): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 1;

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const clauseText = clause.text;

    // If clause is smaller than target length, it forms a discrete atomic chunk
    if (clauseText.length <= TARGET_CHUNK_CHARS) {
      chunks.push({
        chunk_id: `chunk_${String(chunkIndex).padStart(3, '0')}`,
        document_id: documentId,
        clause_id: clause.clause_id,
        section_id: clause.section_id,
        page_number: clause.page_number,
        text: clauseText,
        start_offset: clause.start_offset,
        end_offset: clause.end_offset,
        token_estimate: Math.ceil(clauseText.length / 4),
        sequence_index: chunkIndex - 1,
      });
      chunkIndex++;
      continue;
    }

    // If clause is long, split on sentence boundaries (. followed by space or newline)
    const sentences = clauseText.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [clauseText];
    let currentChunkText = '';
    let currentChunkStart = clause.start_offset;

    for (let s = 0; s < sentences.length; s++) {
      const sentence = sentences[s];

      if (currentChunkText.length + sentence.length > TARGET_CHUNK_CHARS && currentChunkText.length > 0) {
        // Emit current chunk
        const chunkEnd = currentChunkStart + currentChunkText.length;
        chunks.push({
          chunk_id: `chunk_${String(chunkIndex).padStart(3, '0')}`,
          document_id: documentId,
          clause_id: clause.clause_id,
          section_id: clause.section_id,
          page_number: clause.page_number,
          text: currentChunkText.trim(),
          start_offset: currentChunkStart,
          end_offset: chunkEnd,
          token_estimate: Math.ceil(currentChunkText.length / 4),
          sequence_index: chunkIndex - 1,
        });
        chunkIndex++;

        // Advance start offset to next sentence
        currentChunkStart = chunkEnd;
        currentChunkText = sentence;
      } else {
        currentChunkText += sentence;
      }
    }

    // Emit remainder
    if (currentChunkText.trim().length > 0) {
      chunks.push({
        chunk_id: `chunk_${String(chunkIndex).padStart(3, '0')}`,
        document_id: documentId,
        clause_id: clause.clause_id,
        section_id: clause.section_id,
        page_number: clause.page_number,
        text: currentChunkText.trim(),
        start_offset: currentChunkStart,
        end_offset: currentChunkStart + currentChunkText.length,
        token_estimate: Math.ceil(currentChunkText.length / 4),
        sequence_index: chunkIndex - 1,
      });
      chunkIndex++;
    }
  }

  return chunks;
}
