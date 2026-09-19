import { AlignedClausePair, AlignmentResult, Clause, StructuredDocument } from '@/types/domain';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'shall', 'will',
  'any', 'all', 'such', 'other', 'which', 'their', 'under', 'hereunder', 'hereto',
  'thereof', 'party', 'parties', 'agreement', 'section', 'article', 'clause',
  'may', 'must', 'each', 'either', 'both', 'between', 'into', 'been', 'being',
]);

/**
 * Normalizes text for linguistic comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Legal suffix stemmer to unify terms like "indemnification", "indemnity", "indemnify"
 */
function stemWord(word: string): string {
  let w = word.toLowerCase();
  if (w.startsWith('indemn')) return 'indemn';
  if (w.startsWith('terminat')) return 'terminat';
  if (w.startsWith('liab')) return 'liab';
  if (w.startsWith('confiden')) return 'confiden';
  if (w.startsWith('govern')) return 'govern';
  if (w.startsWith('arbitrat')) return 'arbitrat';
  if (w.startsWith('warrant')) return 'warrant';
  if (w.startsWith('jurisdict')) return 'jurisdict';
  if (w.startsWith('intellect') || w.startsWith('propriet')) return 'intellect';
  if (w.startsWith('obligat')) return 'obligat';
  if (w.startsWith('restrict') || w.startsWith('compet')) return 'compet';
  if (w.startsWith('remunerat') || w.startsWith('compensat') || w.startsWith('pay') || w.startsWith('invoic') || w.startsWith('fee')) return 'pay';

  // Standard suffix stripping
  w = w.replace(/(?:ational|ation|tion|sion|ities|ity|ments|ment|ings|ing|ences|ence|ances|ance|ies|ed|es|s)$/, '');
  return w;
}

/**
 * Strips outline numbers and prefixes from headings for semantic comparison (e.g. "SECTION 2. PAYMENT" -> "PAYMENT")
 */
function cleanHeadingTitle(title: string): string {
  return title
    .replace(/^(?:section|article|clause|schedule|exhibit)\s+[0-9a-zIVXLCDM\.\-\:\(\)]+\s*[\.\:\-]*\s*/i, '')
    .trim();
}

/**
 * Extracts non-trivial stemmed words into a set of tokens
 */
function extractTokenSet(text: string): Set<string> {
  const norm = normalizeString(text);
  const words = norm.split(' ');
  const tokens = new Set<string>();
  for (const w of words) {
    if (w.length >= 3 && !STOP_WORDS.has(w)) {
      tokens.add(stemWord(w));
    }
  }
  return tokens;
}

/**
 * Computes Jaccard similarity between two token sets
 */
function computeJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Bigram Dice coefficient for short string similarity (e.g. titles and headings)
 */
function computeDiceSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1).replace(/\s/g, '');
  const s2 = normalizeString(str2).replace(/\s/g, '');
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < s1.length - 1; i++) {
    const bi = s1.substring(i, i + 2);
    bigrams1.set(bi, (bigrams1.get(bi) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bi = s2.substring(i, i + 2);
    const count = bigrams1.get(bi) || 0;
    if (count > 0) {
      bigrams1.set(bi, count - 1);
      intersection++;
    }
  }

  return (2.0 * intersection) / (s1.length - 1 + (s2.length - 1));
}

interface CandidatePair {
  clauseA: Clause;
  clauseB: Clause;
  score: number;
  rationale: string;
}

export interface AlignmentOptions {
  minScoreThreshold?: number; // Minimum similarity score to consider aligned (default 0.25)
}

/**
 * Deterministically aligns clauses between two structured contracts.
 * Utilizes numbering labels, section headings, clause titles, and stemmed token overlap.
 */
export function alignDocumentClauses(
  docA: StructuredDocument,
  docB: StructuredDocument,
  options: AlignmentOptions = {}
): AlignmentResult {
  const threshold = options.minScoreThreshold ?? 0.25;

  interface HeadingMeta {
    cleanTitle: string;
    tokens: Set<string>;
  }

  const sectionMetaA = new Map<string, HeadingMeta>();
  for (const sec of docA.sections) {
    const clean = cleanHeadingTitle(sec.title);
    sectionMetaA.set(sec.section_id, { cleanTitle: clean, tokens: extractTokenSet(clean) });
  }

  const sectionMetaB = new Map<string, HeadingMeta>();
  for (const sec of docB.sections) {
    const clean = cleanHeadingTitle(sec.title);
    sectionMetaB.set(sec.section_id, { cleanTitle: clean, tokens: extractTokenSet(clean) });
  }

  const titleMetaA = new Map<string, HeadingMeta>();
  for (const c of docA.clauses) {
    if (c.title) {
      const clean = cleanHeadingTitle(c.title);
      titleMetaA.set(c.clause_id, { cleanTitle: clean, tokens: extractTokenSet(clean) });
    }
  }

  const titleMetaB = new Map<string, HeadingMeta>();
  for (const c of docB.clauses) {
    if (c.title) {
      const clean = cleanHeadingTitle(c.title);
      titleMetaB.set(c.clause_id, { cleanTitle: clean, tokens: extractTokenSet(clean) });
    }
  }

  const tokensA = new Map<string, Set<string>>();
  for (const c of docA.clauses) {
    tokensA.set(c.clause_id, extractTokenSet(c.text));
  }

  const tokensB = new Map<string, Set<string>>();
  for (const c of docB.clauses) {
    tokensB.set(c.clause_id, extractTokenSet(c.text));
  }

  const candidates: CandidatePair[] = [];

  // Compute pairwise scoring across all clauses
  for (const cA of docA.clauses) {
    const secA = cA.section_id ? sectionMetaA.get(cA.section_id) : undefined;
    const titleA = titleMetaA.get(cA.clause_id);
    const tokA = tokensA.get(cA.clause_id)!;

    for (const cB of docB.clauses) {
      const secB = cB.section_id ? sectionMetaB.get(cB.section_id) : undefined;
      const titleB = titleMetaB.get(cB.clause_id);
      const tokB = tokensB.get(cB.clause_id)!;

      let score = 0;
      const rationaleParts: string[] = [];

      // 1. Text token similarity with stemming (weight up to 0.50)
      const jaccard = computeJaccardSimilarity(tokA, tokB);
      if (jaccard > 0) {
        score += jaccard * 0.50;
        if (jaccard >= 0.4) {
          rationaleParts.push(`Content similarity (${Math.round(jaccard * 100)}%)`);
        }
      }

      // 2. Section heading similarity (Dice + stem check on precomputed clean headings)
      let secSimilarity = 0;
      if (secA && secB) {
        secSimilarity = computeDiceSimilarity(secA.cleanTitle, secB.cleanTitle);
        const secJaccard = computeJaccardSimilarity(secA.tokens, secB.tokens);
        const bestSecSim = Math.max(secSimilarity, secJaccard);

        if (bestSecSim >= 0.4) {
          score += bestSecSim * 0.25;
          rationaleParts.push(`Matching section "${secA.cleanTitle}"`);
        }
      }

      // 3. Clause title similarity
      if (titleA && titleB) {
        const titleSimilarity = computeDiceSimilarity(titleA.cleanTitle, titleB.cleanTitle);
        const titleJaccard = computeJaccardSimilarity(titleA.tokens, titleB.tokens);
        const bestTitleSim = Math.max(titleSimilarity, titleJaccard);

        if (bestTitleSim >= 0.4) {
          score += bestTitleSim * 0.25;
          rationaleParts.push(`Matching title "${titleA.cleanTitle}"`);
        }
      }

      // 4. Exact clause number label match (e.g. "4.1" vs "4.1")
      // Only award number label bonus if clauses belong to matching sections or share meaningful content overlap
      if (cA.number_label && cB.number_label && cA.number_label === cB.number_label) {
        if (secSimilarity >= 0.4 || jaccard >= 0.20) {
          score += 0.30;
          rationaleParts.push(`Identical clause label "${cA.number_label}"`);
        }
      }

      // Clamp score
      const finalScore = Math.min(1.0, Math.round(score * 1000) / 1000);

      if (finalScore >= threshold) {
        candidates.push({
          clauseA: cA,
          clauseB: cB,
          score: finalScore,
          rationale: rationaleParts.join('; ') || `Similarity score ${finalScore}`,
        });
      }
    }
  }

  // Deterministic greedy bipartite matching: primary by score desc, secondary by clause IDs asc
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const cmpA = a.clauseA.clause_id.localeCompare(b.clauseA.clause_id);
    if (cmpA !== 0) return cmpA;
    return a.clauseB.clause_id.localeCompare(b.clauseB.clause_id);
  });

  const matchedA = new Set<string>();
  const matchedB = new Set<string>();
  const alignedPairs: AlignedClausePair[] = [];
  let pairIndex = 1;

  for (const cand of candidates) {
    if (!matchedA.has(cand.clauseA.clause_id) && !matchedB.has(cand.clauseB.clause_id)) {
      matchedA.add(cand.clauseA.clause_id);
      matchedB.add(cand.clauseB.clause_id);

      alignedPairs.push({
        pair_id: `pair_${String(pairIndex++).padStart(3, '0')}`,
        alignment_type: 'ALIGNED',
        clause_a: cand.clauseA,
        clause_b: cand.clauseB,
        similarity_score: cand.score,
        match_rationale: cand.rationale,
      });
    }
  }

  // Add unmatched clauses from Contract A (CONTRACT_A_ONLY)
  let aOnlyCount = 0;
  for (const cA of docA.clauses) {
    if (!matchedA.has(cA.clause_id)) {
      alignedPairs.push({
        pair_id: `pair_${String(pairIndex++).padStart(3, '0')}`,
        alignment_type: 'CONTRACT_A_ONLY',
        clause_a: cA,
        similarity_score: 0,
        match_rationale: 'Unique provision present only in Contract A',
      });
      aOnlyCount++;
    }
  }

  // Add unmatched clauses from Contract B (CONTRACT_B_ONLY)
  let bOnlyCount = 0;
  for (const cB of docB.clauses) {
    if (!matchedB.has(cB.clause_id)) {
      alignedPairs.push({
        pair_id: `pair_${String(pairIndex++).padStart(3, '0')}`,
        alignment_type: 'CONTRACT_B_ONLY',
        clause_b: cB,
        similarity_score: 0,
        match_rationale: 'Unique provision present only in Contract B',
      });
      bOnlyCount++;
    }
  }

  return {
    pairs: alignedPairs,
    aligned_count: alignedPairs.length - aOnlyCount - bOnlyCount,
    a_only_count: aOnlyCount,
    b_only_count: bOnlyCount,
  };
}
