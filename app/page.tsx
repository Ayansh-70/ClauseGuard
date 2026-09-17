import { SHORT_DISCLAIMER } from '@/lib/constants/disclaimers';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-mono uppercase tracking-wider mb-6">
        <span>Phase 2: Ingestion & Segmentation Foundation</span>
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
        JuriLens <span className="text-slate-500 font-light">/ ClauseRadar</span>
      </h1>
      <p className="text-lg text-slate-600 mb-6">
        Deterministic contract intelligence with grounded GenAI assistance.
      </p>
      <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm text-sm text-slate-500 text-left w-full space-y-2">
        <div className="font-semibold text-slate-700 mb-2">Deterministic Foundation Active:</div>
        <ul className="list-disc list-inside space-y-1 text-xs font-mono">
          <li>✓ Strict File Validation (.txt, .md, .pdf &le; 500KB)</li>
          <li>✓ Security Shield: Heuristic Prompt-Injection Detection</li>
          <li>✓ Deterministic Text Normalizer & Offset Indexer</li>
          <li>✓ Structural Section & Heading Detector</li>
          <li>✓ Clause & Subclause Segmenter with Stable IDs (clause_001...)</li>
          <li>✓ Deterministic Chunking Layer with Traceability</li>
        </ul>
      </div>
      <p className="text-xs text-slate-400 mt-6">{SHORT_DISCLAIMER}</p>
    </div>
  );
}
