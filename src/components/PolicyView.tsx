import React, { useRef } from "react";
import { Download, Printer, RotateCcw, Upload } from "lucide-react";
import type { ReconciliationResult, SpendPolicy } from "../types";
import {
  DEFAULT_POLICY,
  formatCurrencyAmount,
  fromMinorUnits,
  VALID_CATEGORIES,
} from "../utils/engine";

interface PolicyViewProps {
  policy: SpendPolicy;
  reconciliation: ReconciliationResult;
  onChangePolicy: (next: SpendPolicy) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportJsonText: (text: string) => void;
  onResetPile: () => void;
}

export const PolicyView: React.FC<PolicyViewProps> = ({
  policy,
  reconciliation,
  onChangePolicy,
  onExportCsv,
  onExportJson,
  onImportJsonText,
  onResetPile,
}) => {
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const budgetUsagePct =
    policy.monthlyBudget > 0
      ? Math.min(100, (reconciliation.mainTotalAmount / policy.monthlyBudget) * 100)
      : 0;
  const isOverBudget =
    policy.monthlyBudget > 0 &&
    reconciliation.mainTotalAmount > policy.monthlyBudget;

  return (
    <section aria-label="Spend Policy and Exports" className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Policy Guardrail Controls */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">
                Spending Rules
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Changes apply immediately across the Treemap, Ledger, and Split &amp; Tax views.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChangePolicy(DEFAULT_POLICY)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset defaults
            </button>
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Monthly / Pile Budget Cap ({reconciliation.mainCurrency})
              </span>
              <input
                type="number"
                min={0}
                step={50}
                value={policy.monthlyBudget}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  onChangePolicy({ ...policy, monthlyBudget: val });
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Single-Receipt Approval Limit ({reconciliation.mainCurrency})
              </span>
              <input
                type="number"
                min={0}
                step={25}
                value={policy.singleReceiptLimit}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  onChangePolicy({ ...policy, singleReceiptLimit: val });
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
              />
              <span className="block text-xs text-slate-500">
                Currently {reconciliation.overPolicyCount}{" "}
                {reconciliation.overPolicyCount === 1 ? "receipt exceeds" : "receipts exceed"}{" "}
                this limit.
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Require Merchant VAT / Tax ID Above ({reconciliation.mainCurrency})
              </span>
              <input
                type="number"
                min={0}
                step={10}
                value={policy.requireTaxIdAbove}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  onChangePolicy({ ...policy, requireTaxIdAbove: val });
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
              />
              <span className="block text-xs text-slate-500">
                Currently {reconciliation.missingTaxInvoiceCount}{" "}
                {reconciliation.missingTaxInvoiceCount === 1 ? "receipt is" : "receipts are"}{" "}
                missing a Tax ID.
              </span>
            </label>
          </div>

          {/* Live Budget Utilization Bar */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Budget Utilization</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  isOverBudget ? "text-red-600" : "text-slate-900"
                }`}
              >
                {formatCurrencyAmount(
                  reconciliation.mainTotalAmount,
                  reconciliation.mainCurrency
                )}{" "}
                /{" "}
                {formatCurrencyAmount(
                  policy.monthlyBudget,
                  reconciliation.mainCurrency
                )}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${budgetUsagePct}%` }}
                className={`h-full transition-all duration-300 ${
                  isOverBudget ? "bg-red-600" : "bg-[#0052FF]"
                }`}
              />
            </div>
            <p className="text-xs text-slate-500">
              {isOverBudget
                ? `Over budget by ${formatCurrencyAmount(
                    reconciliation.mainTotalAmount - policy.monthlyBudget,
                    reconciliation.mainCurrency
                  )}`
                : `${(100 - budgetUsagePct).toFixed(1)}% of monthly budget remaining`}
            </p>
          </div>
        </div>

        {/* Right: Category Breakdown & Portable Exports */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              Category Spend Breakdown
            </h2>
            <div className="space-y-3">
              {VALID_CATEGORIES.map((cat) => {
                const cents = reconciliation.categoryTotalsCents[cat] || 0;
                const amt = fromMinorUnits(cents, reconciliation.mainCurrency);
                const pct =
                  reconciliation.mainTotalCents > 0
                    ? (cents / reconciliation.mainTotalCents) * 100
                    : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{cat}</span>
                      <span className="font-mono tabular-nums text-slate-700">
                        {formatCurrencyAmount(amt, reconciliation.mainCurrency)}{" "}
                        <span className="text-slate-400 text-xs">
                          ({pct.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-[#0052FF]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">
                Export &amp; Backup
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Download a spreadsheet CSV or save a JSON file if you want to resume this pile later.
              </p>
            </div>

            <input
              ref={jsonInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") {
                    onImportJsonText(reader.result);
                  }
                };
                reader.readAsText(file);
                e.target.value = "";
              }}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExportCsv}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0052FF] hover:bg-[#0043D1] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={onExportJson}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Save JSON Backup
              </button>

              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                Restore JSON
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
                Print Audit
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                No database is used — wiping this session clears all in-memory data immediately.
              </span>
              <button
                type="button"
                onClick={onResetPile}
                className="text-xs font-semibold text-red-600 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Clear Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
