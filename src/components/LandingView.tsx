import React, { useRef, useState } from "react";
import {
  ArrowRight,
  Calculator,
  CopyCheck,
  FileSpreadsheet,
  FileText,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  Users,
} from "lucide-react";
import type { WorkspaceTab } from "../types";

interface LandingViewProps {
  isReading: boolean;
  statusMessage: string | null;
  errorMessage: string | null;
  onCancelUpload: () => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onLoadSamplePile: (initialTab?: WorkspaceTab) => void;
  onOpenAddModal: (tab: "paste" | "manual") => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  isReading,
  statusMessage,
  errorMessage,
  onCancelUpload,
  onUploadFiles,
  onLoadSamplePile,
  onOpenAddModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isReading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <div id="top" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Shoebox
          </a>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            <a
              href="#features"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <button
              type="button"
              onClick={() => onOpenAddModal("paste")}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Paste Text
            </button>
            <button
              type="button"
              onClick={() => onOpenAddModal("manual")}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Add Manually
            </button>
            <button
              type="button"
              onClick={() => onLoadSamplePile("splittax")}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Bill Splitter
            </button>
          </nav>

          <button
            type="button"
            onClick={() => onLoadSamplePile("treemap")}
            disabled={isReading}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#0052FF] hover:bg-[#0043D1] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            Try Sample Receipts
          </button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,text/plain,application/json,.jpg,.jpeg,.png,.webp,.heic,.pdf,.txt,.json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* Hero Section */}
      <main className="flex-1 w-full">
        <section className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Copy */}
            <div className="lg:col-span-6 flex flex-col justify-between gap-8">
              <div className="space-y-5">
                <p className="text-sm font-medium text-slate-500">
                  No account · No database · Runs inside your browser tab
                </p>
                <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.08]">
                  Sort your receipts, check the math, export a clean CSV.
                </h1>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                  Drop receipt photos, paste email confirmations, or type in a quick
                  list of expenses. Shoebox checks tips, spots duplicates, totals your
                  tax, and splits group bills right in memory. Close the tab and nothing
                  is left behind.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => onLoadSamplePile("treemap")}
                  disabled={isReading}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0052FF] hover:bg-[#0043D1] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <span>Open Sample Pile (7 Receipts)</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAddModal("paste")}
                  disabled={isReading}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-4 h-4 text-slate-600" aria-hidden="true" />
                  <span>Paste Receipt Text</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200">
                <div>
                  <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                    0 servers
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    No database or hidden browser storage
                  </p>
                </div>
                <div>
                  <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                    &lt; 10 ms
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Instant local parsing for pasted text &amp; CSV
                  </p>
                </div>
                <div>
                  <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                    Exact cents
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Integer math prevents rounding drift
                  </p>
                </div>
              </div>
            </div>

            {/* Right Upload Box */}
            <div className="lg:col-span-6 flex">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`w-full rounded-xl border-2 border-dashed p-8 sm:p-10 flex flex-col justify-between transition-colors ${
                  isDragging
                    ? "border-[#0052FF] bg-blue-50/70"
                    : "border-slate-300 bg-white"
                }`}
              >
                <div className="space-y-4">
                  <div className="w-11 h-11 rounded-lg bg-slate-100 text-[#0052FF] flex items-center justify-center">
                    <Upload className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-slate-900">
                      Drop receipts or a saved backup
                    </h2>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                      Accepts JPG, PNG, WebP, HEIC, PDF, plain text slips (.txt), and
                      Shoebox JSON backups. Camera EXIF tags are stripped locally in
                      your browser.
                    </p>
                  </div>
                </div>

                {statusMessage && (
                  <div
                    role="status"
                    className="my-6 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-[#0052FF] font-medium flex items-center justify-between gap-3"
                  >
                    <span>{statusMessage}</span>
                    <button
                      type="button"
                      onClick={onCancelUpload}
                      className="text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-2.5 py-1 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Review Now
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <div
                    role="alert"
                    className="my-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
                  >
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-4 pt-6">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReading}
                    className="w-full py-3 px-4 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isReading ? "Reading files..." : "Choose files from computer"}
                  </button>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck
                        className="w-3.5 h-3.5 text-slate-500"
                        aria-hidden="true"
                      />
                      Stays in this tab until you close it
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenAddModal("manual")}
                      className="font-semibold text-[#0052FF] hover:underline cursor-pointer"
                    >
                      Or enter a receipt manually
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Features Section */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="scroll-mt-16 border-t border-slate-200 bg-white"
        >
          <div className="max-w-7xl mx-auto px-6 py-14 lg:py-16 space-y-10">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0052FF]">
                Built for everyday expense cleanup
              </p>
              <h2
                id="features-heading"
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
              >
                Every tool runs locally and gives results right away.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Click any tool below to open it immediately — no waiting, no login wall,
                and no remote server required.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between gap-5">
                <div className="space-y-2.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-[#0052FF] flex items-center justify-center">
                    <FileText className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Fast Text &amp; Batch Paste
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Paste a full email receipt, multiple receipts separated by{" "}
                    <span className="font-mono text-xs text-slate-800">---</span>, or a
                    plain list like{" "}
                    <span className="font-mono text-xs text-slate-800">
                      Coffee $6.50
                    </span>
                    . Merchant, date, tax, and total are extracted immediately in the
                    browser.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAddModal("paste")}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0052FF] hover:underline self-start cursor-pointer"
                >
                  <span>Open paste box</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              {/* Feature 2 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between gap-5">
                <div className="space-y-2.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-[#0052FF] flex items-center justify-center">
                    <Calculator className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Handwritten Tip &amp; Math Check
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Sums every receipt in integer cents so totals never drift, and flags
                    restaurant slips where the handwritten tip plus subtotal does not
                    match the written grand total.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onLoadSamplePile("ledger")}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0052FF] hover:underline self-start cursor-pointer"
                >
                  <span>Inspect sample ledger</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              {/* Feature 3 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between gap-5">
                <div className="space-y-2.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-[#0052FF] flex items-center justify-center">
                    <CopyCheck className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Duplicate &amp; Currency Guard
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Catches the same charge submitted twice across a paper slip and an
                    email receipt. Keeps foreign currencies (like JPY or EUR) separate
                    until you provide an exchange rate.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onLoadSamplePile("treemap")}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0052FF] hover:underline self-start cursor-pointer"
                >
                  <span>See spend map</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              {/* Feature 4 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between gap-5">
                <div className="space-y-2.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-[#0052FF] flex items-center justify-center">
                    <Users className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Group Bill Splitter
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Divide a shared trip or team dinner evenly across 2 to 50 people
                    with exact cent remainder tracking, then copy a plain-text breakdown
                    for Slack or reimbursement emails.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onLoadSamplePile("splittax")}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0052FF] hover:underline self-start cursor-pointer"
                >
                  <span>Open bill splitter</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              {/* Feature 5 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between gap-5">
                <div className="space-y-2.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-[#0052FF] flex items-center justify-center">
                    <Receipt className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Tax, VAT &amp; Team Totals
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Groups Sales Tax, VAT, and Consumption Tax lines automatically,
                    shows your effective tax rate, checks for missing merchant Tax IDs,
                    and totals spend by cost center.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onLoadSamplePile("splittax")}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0052FF] hover:underline self-start cursor-pointer"
                >
                  <span>View tax summary</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              {/* Feature 6 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between gap-5">
                <div className="space-y-2.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-[#0052FF] flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Budget Limits &amp; Clean Exports
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Set your own monthly budget, per-receipt approval cap, and Tax ID
                    threshold. When you are done, download a spreadsheet-ready CSV or a
                    JSON snapshot to resume later.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onLoadSamplePile("policy")}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0052FF] hover:underline self-start cursor-pointer"
                >
                  <span>Configure rules &amp; exports</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Quiet Footer */}
        <footer className="border-t border-slate-200 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
              Shoebox · In-browser receipt utility (zero database)
            </span>
            <span>Reload or close your browser tab anytime to clear your session.</span>
          </div>
        </footer>
      </main>
    </div>
  );
};
