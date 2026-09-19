import 'server-only';
import { AuditResult, ComparisonResult, StructuredDocument } from '@/types/domain';

const MAX_STORE_ENTRIES = 100;
const STORE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

interface CachedEntry<T> {
  data: T;
  timestamp: number;
}

const ID_REGEX = /^[a-zA-Z0-9_\-.]{3,100}$/;

/**
 * Validates a document or comparison report ID.
 * Rejects path traversal, special characters, and null bytes.
 */
export function isValidReportId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (id.includes('..') || id.includes('/') || id.includes('\\')) return false;
  return ID_REGEX.test(id.trim());
}

/**
 * Server-side in-memory bounded store for grounded audit, comparison results, and structured documents.
 * Allows retrieving verified server-side findings and evidence by ID without trusting client payloads.
 */
class ReportStore {
  private auditStore = new Map<string, CachedEntry<AuditResult>>();
  private comparisonStore = new Map<string, CachedEntry<ComparisonResult>>();
  private documentStore = new Map<string, CachedEntry<StructuredDocument>>();

  /**
   * Saves an AuditResult indexed by document_id
   */
  public saveAuditResult(result: AuditResult): void {
    if (!result?.document_id || !isValidReportId(result.document_id)) {
      return;
    }

    this.pruneExpired();

    if (this.auditStore.has(result.document_id)) {
      this.auditStore.delete(result.document_id);
    } else if (this.auditStore.size >= MAX_STORE_ENTRIES) {
      const oldestKey = this.auditStore.keys().next().value;
      if (oldestKey) this.auditStore.delete(oldestKey);
    }

    this.auditStore.set(result.document_id, {
      data: result,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieves an AuditResult by document_id
   */
  public getAuditResult(documentId: string): AuditResult | null {
    if (!isValidReportId(documentId)) return null;

    const entry = this.auditStore.get(documentId);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > STORE_TTL_MS) {
      this.auditStore.delete(documentId);
      return null;
    }

    // Refresh LRU recency on access
    this.auditStore.delete(documentId);
    this.auditStore.set(documentId, entry);

    return entry.data;
  }

  /**
   * Saves a ComparisonResult indexed by comparison_id
   */
  public saveComparisonResult(result: ComparisonResult): void {
    if (!result?.comparison_id || !isValidReportId(result.comparison_id)) {
      return;
    }

    this.pruneExpired();

    if (this.comparisonStore.has(result.comparison_id)) {
      this.comparisonStore.delete(result.comparison_id);
    } else if (this.comparisonStore.size >= MAX_STORE_ENTRIES) {
      const oldestKey = this.comparisonStore.keys().next().value;
      if (oldestKey) this.comparisonStore.delete(oldestKey);
    }

    this.comparisonStore.set(result.comparison_id, {
      data: result,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieves a ComparisonResult by comparison_id
   */
  public getComparisonResult(comparisonId: string): ComparisonResult | null {
    if (!isValidReportId(comparisonId)) return null;

    const entry = this.comparisonStore.get(comparisonId);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > STORE_TTL_MS) {
      this.comparisonStore.delete(comparisonId);
      return null;
    }

    // Refresh LRU recency on access
    this.comparisonStore.delete(comparisonId);
    this.comparisonStore.set(comparisonId, entry);

    return entry.data;
  }

  /**
   * Saves a StructuredDocument indexed by document_id
   */
  public saveDocument(doc: StructuredDocument): void {
    if (!doc?.metadata?.document_id || !isValidReportId(doc.metadata.document_id)) {
      return;
    }

    this.pruneExpired();

    if (this.documentStore.has(doc.metadata.document_id)) {
      this.documentStore.delete(doc.metadata.document_id);
    } else if (this.documentStore.size >= MAX_STORE_ENTRIES) {
      const oldestKey = this.documentStore.keys().next().value;
      if (oldestKey) this.documentStore.delete(oldestKey);
    }

    this.documentStore.set(doc.metadata.document_id, {
      data: doc,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieves a StructuredDocument by document_id
   */
  public getDocument(documentId: string): StructuredDocument | null {
    if (!isValidReportId(documentId)) return null;

    const entry = this.documentStore.get(documentId);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > STORE_TTL_MS) {
      this.documentStore.delete(documentId);
      return null;
    }

    // Refresh LRU recency on access
    this.documentStore.delete(documentId);
    this.documentStore.set(documentId, entry);

    return entry.data;
  }

  /**
   * Retrieves clause context and surrounding document text for grounded evidence viewing
   */
  public getClauseContext(
    documentId: string,
    clauseId: string,
    radius = 400
  ): {
    document_id: string;
    file_name: string;
    clause: {
      clause_id: string;
      number_label?: string;
      title?: string;
      text: string;
      start_offset: number;
      end_offset: number;
      page_number?: number;
      line_number: number;
    };
    section?: {
      section_id: string;
      title: string;
    };
    surrounding_context: {
      before_text: string;
      after_text: string;
    };
    canonical_document_length: number;
  } | null {
    const doc = this.getDocument(documentId);
    if (!doc) return null;

    const clause = doc.clauses.find(
      (c) => c.clause_id === clauseId || (c.number_label && c.number_label === clauseId)
    );
    if (!clause) return null;

    const safeRadius = Math.max(0, Math.min(2000, radius));

    const beforeText = doc.canonical_text.slice(
      Math.max(0, clause.start_offset - safeRadius),
      clause.start_offset
    );

    const afterText = doc.canonical_text.slice(
      clause.end_offset,
      Math.min(doc.canonical_text.length, clause.end_offset + safeRadius)
    );

    const section = clause.section_id
      ? doc.sections.find((s) => s.section_id === clause.section_id)
      : undefined;

    return {
      document_id: doc.metadata.document_id,
      file_name: doc.metadata.file_name,
      clause: {
        clause_id: clause.clause_id,
        number_label: clause.number_label,
        title: clause.title,
        text: clause.text,
        start_offset: clause.start_offset,
        end_offset: clause.end_offset,
        page_number: clause.page_number,
        line_number: clause.line_number,
      },
      section: section
        ? {
            section_id: section.section_id,
            title: section.title,
          }
        : undefined,
      surrounding_context: {
        before_text: beforeText,
        after_text: afterText,
      },
      canonical_document_length: doc.canonical_text.length,
    };
  }

  /**
   * Cleans up expired cache entries
   */
  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, val] of this.auditStore.entries()) {
      if (now - val.timestamp > STORE_TTL_MS) {
        this.auditStore.delete(key);
      }
    }
    for (const [key, val] of this.comparisonStore.entries()) {
      if (now - val.timestamp > STORE_TTL_MS) {
        this.comparisonStore.delete(key);
      }
    }
    for (const [key, val] of this.documentStore.entries()) {
      if (now - val.timestamp > STORE_TTL_MS) {
        this.documentStore.delete(key);
      }
    }
  }

  /**
   * Clears all stores (primarily for testing)
   */
  public clear(): void {
    this.auditStore.clear();
    this.comparisonStore.clear();
    this.documentStore.clear();
  }
}

export const reportStore = new ReportStore();
