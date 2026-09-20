import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowRight,
  FileSearch,
  AlertTriangle,
  Scale,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';
import { GLOBAL_LEGAL_DISCLAIMER } from '@/lib/constants/disclaimers';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Product Top Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">ClauseGuard</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
              Contract Intelligence
            </span>
          </div>

          <Link
            href="/workspace"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <span>Open Workstation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-14 pb-16 sm:pb-20 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Deterministic Grounding & Independent Source Verification</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Review Commercial Contracts with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-700">
              Verifiable Evidence
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            ClauseGuard parses legal agreements, surfaces critical obligations and asymmetric risks,
            and connects every AI observation directly back to verified document quotes.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/workspace"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <span>Analyze a Document</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <span className="text-xs text-slate-500 font-mono">
              Supports .pdf, .txt, .md (up to 500 KB)
            </span>
          </div>
        </div>
      </section>

      {/* Value Proposition Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            A Serious Workstation for Document Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Designed for commercial operators, founders, and teams to navigate contracts with clarity
            and independent source verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <FileSearch className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Plain-English Simplification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Translates complex, dense legal terminology into clear 8th-grade explanations without
              losing substantive meaning.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Attention Tiers</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Surfaces high-attention liabilities, unilateral indemnifications, IP assignments, and
              unreasonable termination windows.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Verifiable Source Evidence</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every finding is anchored to exact clause IDs, page numbers, and verbatim quotes verified
              independently by the server.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Counsel-Ready Questions</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Generates targeted, pragmatic questions to review with your qualified attorney rather
              than pretending to replace professional counsel.
            </p>
          </div>
        </div>

        {/* Regulatory Boundaries & Trust Commitment */}
        <div className="bg-slate-900 text-slate-200 rounded-2xl p-8 sm:p-10 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-amber-400 font-semibold tracking-wider">
            <FileCheck className="w-4 h-4" />
            <span>Ethical Legal Information Standard</span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-white">
            Informational Document Assistance — Not Legal Advice
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed pt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>What ClauseGuard Does</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Deterministically normalizes and segments contract clauses</li>
                <li>Identifies asymmetric obligations and potential commercial risk areas</li>
                <li>Verifies citations against actual document character spans</li>
                <li>Prepares questions to discuss with qualified legal counsel</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span>What ClauseGuard Does NOT Do</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Does not provide legal representation or legal opinions</li>
                <li>Does not establish an attorney-client relationship</li>
                <li>Does not predict dispute outcomes or guarantee legal enforceability</li>
                <li>Does not replace consultation with licensed legal professionals</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex items-center justify-center gap-2 font-bold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>ClauseGuard Workstation</span>
          </div>
          <p className="max-w-3xl mx-auto text-[11px] leading-relaxed text-slate-400">
            {GLOBAL_LEGAL_DISCLAIMER}
          </p>
          <div className="text-[10px] text-slate-400 pt-2 font-mono">
            Prompt Wars Competition • Phase 4: Core Workstation
          </div>
        </div>
      </footer>
    </div>
  );
}
