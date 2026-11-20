import React from "react";
import { AlertTriangle, Check, CheckCircle2, Eye, Trash2 } from "lucide-react";
import type { ComputedRow, ReceiptCategory, ReceiptRow } from "../types";
import {
  formatCurrencyAmount,
  formatDisplayDate,
  formatSourceShort,
  VALID_CATEGORIES,
} from "../utils/engine";

interface LedgerViewProps {
  rows: ComputedRow[];
  onInspectRow: (rowNum: number) => void;
  onUpdateRow: (rowNum: number, updater: (prev: ReceiptRow) => ReceiptRow) => void;
  onDeleteRow: (rowNum: number) => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  rows,
  onInspectRow,
  onUpdateRow,
  onDeleteRow,
}) => {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <h2 className="font-display text-xl font-semibold text-slate-900">
          No receipts match your filters
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Try clearing your search query or switching back to All Categories.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Audited Receipt Ledger"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4 w-12">#</th>
              <th className="py-3 px-4">Merchant &amp; Source</th>
              <th className="py-3 px-4 whitespace-nowrap">Date</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">
                Verified Total
              </th>
              <th className="py-3 px-4">Audit Status</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`transition-colors hover:bg-slate-50/80 ${
                  row.excluded ? "opacity-55 bg-slate-50/50" : ""
                }`}
              >
                <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                  {row.row}
                </td>
                <td className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => onInspectRow(row.row)}
                    className="text-left group cursor-pointer"
                  >
                    <p
                      className={`font-medium text-slate-900 group-hover:text-[#0052FF] transition-colors ${
                        row.excluded ? "line-through" : ""
                      }`}
                    >
                      {row.merchant || "Unreadable merchant"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatSourceShort(row)}
                      {row.cost_center ? ` · ${row.cost_center}` : ""}
                      {row.card_last4 ? ` · •••• ${row.card_last4}` : ""}
                    </p>
                  </button>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                  {formatDisplayDate(row.date)}
                </td>
                <td className="py-3 px-4">
                  <select
                    aria-label={`Category for ${row.merchant || `row ${row.row}`}`}
                    value={row.category}
                    onChange={(e) => {
                      const nextCat = e.target.value as ReceiptCategory;
                      onUpdateRow(row.row, (prev) => ({
                        ...prev,
                        category: nextCat,
                      }));
                    }}
                    className="text-xs bg-transparent border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:border-[#0052FF] outline-none cursor-pointer"
                  >
                    {VALID_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                  {formatCurrencyAmount(
                    row.code_calculated_total,
                    row.effective_currency
                  )}
                  {row.handwritten_tip ? (
                    <span className="block text-[11px] font-normal text-slate-500">
                      incl. tip{" "}
                      {formatCurrencyAmount(
                        row.handwritten_tip,
                        row.effective_currency
                      )}
                    </span>
                  ) : null}
                </td>
                <td className="py-3 px-4">
                  {row.excluded ? (
                    <span className="text-xs text-slate-500 font-medium">
                      Excluded
                    </span>
                  ) : row.checked ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      Checked
                    </span>
                  ) : row.primary_flag_label ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      {row.primary_flag_label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      Verified
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onInspectRow(row.row)}
                      aria-label={`Inspect proof for ${row.merchant || `row ${row.row}`}`}
                      className="px-2.5 py-1 text-xs font-medium text-[#0052FF] hover:bg-blue-50 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Proof</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRow(row.row, (prev) => ({
                          ...prev,
                          checked: !prev.checked,
                        }))
                      }
                      aria-label={
                        row.checked
                          ? `Uncheck ${row.merchant || `row ${row.row}`}`
                          : `Mark ${row.merchant || `row ${row.row}`} as checked`
                      }
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    >
                      {row.checked ? "Uncheck" : "Check"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRow(row.row)}
                      aria-label={`Delete ${row.merchant || `row ${row.row}`}`}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
