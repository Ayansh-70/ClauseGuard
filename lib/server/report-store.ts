import 'server-only';
import { AuditResult, ComparisonResult } from '@/types/domain';

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
 * Server-side in-memory bounded store for grounded audit and comparison results.
 * Allows retrieving verified server-side findings by ID without trusting client payloads.
 */
class ReportStore {
  private auditStore = new Map<string, CachedEntry<AuditResult>>();
  private comparisonStore = new Map<string, CachedEntry<ComparisonResult>>();

  /**
   * Saves an AuditResult indexed by document_id
   */
  public saveAuditResult(result: AuditResult): void {
    if (!result?.document_id || !isValidReportId(result.document_id)) {
      return;
    }

    this.pruneExpired();

    if (this.auditStore.size >= MAX_STORE_ENTRIES) {
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

    if (this.comparisonStore.size >= MAX_STORE_ENTRIES) {
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

    return entry.data;
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
  }

  /**
   * Clears all stores (primarily for testing)
   */
  public clear(): void {
    this.auditStore.clear();
    this.comparisonStore.clear();
  }
}

export const reportStore = new ReportStore();
