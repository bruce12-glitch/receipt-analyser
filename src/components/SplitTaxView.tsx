import React, { useMemo, useState } from "react";
import { Check, Copy, Receipt, Users } from "lucide-react";
import type { ComputedRow, ReconciliationResult } from "../types";
import { formatCurrencyAmount, fromMinorUnits } from "../utils/engine";
import {
  computeCostCenterBreakdown,
  computeEqualSplit,
  computeTaxBreakdown,
} from "../utils/splitTax";

interface SplitTaxViewProps {
  computedRows: ComputedRow[];
  reconciliation: ReconciliationResult;
}

export const SplitTaxView: React.FC<SplitTaxViewProps> = ({
  computedRows,
  reconciliation,
}) => {
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [copied, setCopied] = useState(false);

  const equalSplit = useMemo(
    () =>
      computeEqualSplit(
        reconciliation.mainTotalCents,
        peopleCount,
        reconciliation.mainCurrency
      ),
    [reconciliation.mainTotalCents, peopleCount, reconciliation.mainCurrency]
  );

  const taxSummary = useMemo(
    () => computeTaxBreakdown(computedRows, reconciliation.mainCurrency),
    [computedRows, reconciliation.mainCurrency]
  );

  const costCenters = useMemo(
    () => computeCostCenterBreakdown(computedRows, reconciliation.mainCurrency),
    [computedRows, reconciliation.mainCurrency]
  );

  const handleCopySummary = async () => {
    const lines = [
      `Shoebox Spend & Split Summary (${reconciliation.mainCurrency})`,
      `Audited Total: ${formatCurrencyAmount(
        reconciliation.mainTotalAmount,
        reconciliation.mainCurrency
      )} across ${reconciliation.includedCount} receipts`,
      `Equal Split (${equalSplit.peopleCount} ${
        equalSplit.peopleCount === 1 ? "person" : "people"
      }): ${formatCurrencyAmount(
        equalSplit.perPersonAmount,
        reconciliation.mainCurrency
      )} each${
        equalSplit.remainderCents > 0
          ? ` (+${formatCurrencyAmount(
              fromMinorUnits(equalSplit.remainderCents, reconciliation.mainCurrency),
              reconciliation.mainCurrency
            )} rounding remainder)`
          : ""
      }`,
      `Total Tax (${reconciliation.mainCurrency}): ${formatCurrencyAmount(
        taxSummary.totalMainTaxAmount,
        reconciliation.mainCurrency
      )} (${taxSummary.effectiveTaxRatePct.toFixed(1)}% effective rate)`,
    ];
    if (reconciliation.foreignTotals.length > 0) {
      lines.push(
        `Isolated Foreign Spend: ${reconciliation.foreignTotals
          .map((f) => `${formatCurrencyAmount(f.totalAmount, f.currency)} (${f.currency})`)
          .join(", ")}`
      );
    }
    if (costCenters.length > 0) {
      lines.push("", "By Cost Center / Team:");
      costCenters.forEach((cc) => {
        lines.push(
          `- ${cc.costCenter}: ${formatCurrencyAmount(
            cc.totalAmount,
            reconciliation.mainCurrency
          )} (${cc.receiptCount} ${cc.receiptCount === 1 ? "receipt" : "receipts"})`
        );
      });
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section aria-label="Bill Split and Tax Summary" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Instant Bill & Reimbursement Splitter */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">
                Bill &amp; Group Splitter
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Split the reconciled pile evenly across teammates or clients with exact
                cent-level remainder tracking.
              </p>
            </div>
            <Users className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
          </div>

          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Number of People
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={peopleCount}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1));
                    setPeopleCount(val);
                  }}
                  className="w-24 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
                />
                <div className="flex items-center gap-1.5">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPeopleCount(n)}
                      className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-colors cursor-pointer ${
                        peopleCount === n
                          ? "bg-[#0052FF] border-[#0052FF] text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2">
            <p className="text-xs font-medium text-slate-500">
              Each Person Owes ({reconciliation.mainCurrency})
            </p>
            <p className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
              {formatCurrencyAmount(
                equalSplit.perPersonAmount,
                reconciliation.mainCurrency
              )}
            </p>
            <p className="text-xs text-slate-600 tabular-nums">
              Total{" "}
              {formatCurrencyAmount(
                reconciliation.mainTotalAmount,
                reconciliation.mainCurrency
              )}{" "}
              ÷ {equalSplit.peopleCount}{" "}
              {equalSplit.peopleCount === 1 ? "person" : "people"}
              {equalSplit.remainderCents > 0
                ? ` · +${formatCurrencyAmount(
                    fromMinorUnits(
                      equalSplit.remainderCents,
                      reconciliation.mainCurrency
                    ),
                    reconciliation.mainCurrency
                  )} rounding remainder`
                : " · exact split with zero remainder"}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            <span className="text-xs text-slate-500">
              Copy a plain-text breakdown for Slack, email, or reimbursement notes.
            </span>
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0052FF] hover:bg-[#0043D1] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copied Summary</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy Split Summary</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Tax & VAT Deductible Summary */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">
                Tax &amp; VAT Deductible Summary
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Aggregated tax lines and invoice compliance across included receipts.
              </p>
            </div>
            <Receipt className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-1 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs text-slate-500">
                Total Tax ({reconciliation.mainCurrency})
              </p>
              <p className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                {formatCurrencyAmount(
                  taxSummary.totalMainTaxAmount,
                  reconciliation.mainCurrency
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Effective Rate</p>
              <p className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                {taxSummary.effectiveTaxRatePct.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tax ID Verified</p>
              <p className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                {taxSummary.taxInvoiceVerifiedCount}/{taxSummary.includedCount}
              </p>
            </div>
          </div>

          {taxSummary.byLabel.length === 0 ? (
            <p className="text-sm text-slate-500">
              No tax lines recorded on current receipts.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {taxSummary.byLabel.map((item) => (
                <div
                  key={`${item.label}-${item.currency}`}
                  className="py-2.5 flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">
                      {item.receiptCount}{" "}
                      {item.receiptCount === 1 ? "receipt" : "receipts"} ·{" "}
                      {item.currency}
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatCurrencyAmount(item.taxAmount, item.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cost Center / Team Allocation Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">
            Allocation by Cost Center
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Reconciled {reconciliation.mainCurrency} spend grouped by assigned department or project.
          </p>
        </div>

        <div className="space-y-3">
          {costCenters.map((cc) => (
            <div key={cc.costCenter} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">
                  {cc.costCenter}{" "}
                  <span className="text-xs text-slate-500 font-normal">
                    · {cc.receiptCount}{" "}
                    {cc.receiptCount === 1 ? "receipt" : "receipts"}
                  </span>
                </span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrencyAmount(
                    cc.totalAmount,
                    reconciliation.mainCurrency
                  )}{" "}
                  <span className="text-xs text-slate-400 font-normal">
                    ({cc.sharePercent.toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${cc.sharePercent}%` }}
                  className="h-full bg-[#0052FF]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
