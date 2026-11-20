import React, { useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type {
  ComputedRow,
  ReceiptCategory,
  ReceiptRow,
  UploadedPhoto,
} from "../types";
import {
  clearResolvedModelFlags,
  formatCurrencyAmount,
  formatSourceShort,
  VALID_CATEGORIES,
} from "../utils/engine";

interface ProofDrawerProps {
  title: string;
  rows: ComputedRow[];
  activeIndex: number;
  photos: UploadedPhoto[];
  mainCurrency: string;
  onSelectIndex: (idx: number) => void;
  onClose: () => void;
  onUpdateRow: (rowNum: number, updater: (prev: ReceiptRow) => ReceiptRow) => void;
}

export const ProofDrawer: React.FC<ProofDrawerProps> = ({
  title,
  rows,
  activeIndex,
  photos,
  mainCurrency,
  onSelectIndex,
  onClose,
  onUpdateRow,
}) => {
  const safeIndex = Math.max(0, Math.min(activeIndex, rows.length - 1));
  const row = rows[safeIndex];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!row) return null;

  const photo =
    photos.find((p) => p.id === row.source_photo_id) ||
    photos.find((p) => p.globalIndex === row.photo_index) ||
    null;

  const [ymin, xmin, ymax, xmax] = row.box_2d || [50, 100, 940, 900];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Proof Inspector: ${title}`}
      className="fixed inset-0 z-40 flex justify-end bg-slate-900/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl h-full bg-white border-l border-slate-200 flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              Proof Inspector · {formatSourceShort(row)} · Receipt {safeIndex + 1} of{" "}
              {rows.length}
            </p>
            <h2 className="font-display text-xl font-semibold text-slate-900 truncate">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {rows.length > 1 && (
              <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    onSelectIndex((safeIndex - 1 + rows.length) % rows.length)
                  }
                  aria-label="Previous receipt"
                  className="p-2 hover:bg-slate-100 text-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectIndex((safeIndex + 1) % rows.length)}
                  aria-label="Next receipt"
                  className="p-2 hover:bg-slate-100 text-slate-700 border-l border-slate-200 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Proof Inspector"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Audit Flags */}
          {row.all_flags.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                Audit Flags ({row.all_flags.length})
              </p>
              <ul className="space-y-1 text-sm text-amber-900">
                {row.all_flags.map((f, idx) => (
                  <li key={`${f.type}-${idx}`}>• {f.note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Receipt Visual Proof Image with Bounding Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center p-4 min-h-[260px]">
            {photo?.objectUrl ? (
              <div className="relative inline-block max-h-[340px]">
                <img
                  src={photo.objectUrl}
                  alt={`Receipt scan for ${row.merchant || `row ${row.row}`}`}
                  referrerPolicy="no-referrer"
                  className="max-h-[340px] w-auto object-contain rounded shadow-sm"
                />
                <div
                  aria-hidden="true"
                  style={{
                    top: `${ymin / 10}%`,
                    left: `${xmin / 10}%`,
                    height: `${(ymax - ymin) / 10}%`,
                    width: `${(xmax - xmin) / 10}%`,
                  }}
                  className="absolute border-2 border-[#0052FF]/80 pointer-events-none"
                />
              </div>
            ) : (
              <div className="text-center py-8 px-4 max-w-md">
                <p className="font-mono text-xs text-slate-500">
                  Manual / Text Receipt Entry
                </p>
                {row.raw_text ? (
                  <pre className="mt-3 text-left text-xs font-mono bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto text-slate-700 whitespace-pre-wrap">
                    {row.raw_text}
                  </pre>
                ) : (
                  <p className="text-sm text-slate-600 mt-1">
                    No attached scan image — fields are directly auditable below.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Code-Verified Calculation Summary */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">Verified Total</p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                {formatCurrencyAmount(
                  row.code_calculated_total,
                  row.effective_currency
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!row.excluded && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateRow(row.row, (prev) => ({
                      ...prev,
                      checked: !prev.checked,
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    row.checked
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-[#0052FF] text-white hover:bg-[#0043D1]"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{row.checked ? "Marked Checked" : "Mark Checked"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  onUpdateRow(row.row, (prev) => ({
                    ...prev,
                    excluded: !prev.excluded,
                  }))
                }
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {row.excluded ? "Include in Totals" : "Exclude Duplicate"}
              </button>
            </div>
          </div>

          {/* Inline Editable Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Merchant</span>
              <input
                type="text"
                value={row.merchant || ""}
                onChange={(e) =>
                  onUpdateRow(row.row, (prev) => ({
                    ...prev,
                    merchant: e.target.value,
                    confidence: { ...prev.confidence, merchant: 1 },
                    flags: clearResolvedModelFlags(prev.flags, "merchant"),
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Date</span>
              <input
                type="text"
                value={row.date || ""}
                placeholder="YYYY-MM-DD"
                onChange={(e) =>
                  onUpdateRow(row.row, (prev) => ({
                    ...prev,
                    date: e.target.value || null,
                    confidence: { ...prev.confidence, date: 1 },
                    flags: clearResolvedModelFlags(prev.flags, "date"),
                  }))
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">
                Printed Total ({row.effective_currency})
              </span>
              <input
                type="number"
                step="0.01"
                value={row.printed_total ?? ""}
                onChange={(e) => {
                  const val =
                    e.target.value === "" ? null : parseFloat(e.target.value);
                  onUpdateRow(row.row, (prev) => ({
                    ...prev,
                    printed_total: Number.isNaN(val as number) ? null : val,
                    confidence: { ...prev.confidence, printed_total: 1 },
                    flags: clearResolvedModelFlags(prev.flags, "printed_total"),
                  }));
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">
                Handwritten Tip ({row.effective_currency})
              </span>
              <input
                type="number"
                step="0.01"
                value={row.handwritten_tip ?? ""}
                placeholder="0.00"
                onChange={(e) => {
                  const val =
                    e.target.value === "" ? null : parseFloat(e.target.value);
                  onUpdateRow(row.row, (prev) => ({
                    ...prev,
                    handwritten_tip: Number.isNaN(val as number) ? null : val,
                    confidence: { ...prev.confidence, handwritten_tip: 1 },
                    flags: clearResolvedModelFlags(prev.flags, "handwritten_tip"),
                  }));
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">
                Printed/Written Final Total
              </span>
              <input
                type="number"
                step="0.01"
                value={row.final_total ?? ""}
                onChange={(e) => {
                  const val =
                    e.target.value === "" ? null : parseFloat(e.target.value);
                  onUpdateRow(row.row, (prev) => ({
                    ...prev,
                    final_total: Number.isNaN(val as number) ? null : val,
                    confidence: { ...prev.confidence, printed_total: 1 },
                    flags: clearResolvedModelFlags(prev.flags, "final_total"),
                  }));
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Category</span>
              <select
                value={row.category}
                onChange={(e) =>
                  onUpdateRow(row.row, (prev) => ({
                    ...prev,
                    category: e.target.value as ReceiptCategory,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none bg-white"
              >
                {VALID_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">
                Merchant Tax / VAT ID
              </span>
              <input
                type="text"
                value={row.tax_id_or_vat || ""}
                placeholder="e.g. EIN 91-1325671"
                onChange={(e) =>
                  onUpdateRow(row.row, (prev) => ({
                    ...prev,
                    tax_id_or_vat: e.target.value || null,
                    is_tax_invoice: Boolean(e.target.value.trim()),
                  }))
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">
                Cost Center
              </span>
              <input
                type="text"
                value={row.cost_center || ""}
                placeholder="e.g. Engineering"
                onChange={(e) =>
                  onUpdateRow(row.row, (prev) => ({
                    ...prev,
                    cost_center: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
              />
            </label>
          </div>

          {/* Foreign Currency Conversion Section */}
          {row.is_foreign && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-800">
                Convert {row.effective_currency} to {mainCurrency} (requires rate &amp; date)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs text-slate-600">Exchange Rate</span>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 0.0066"
                    value={row.user_conversion_rate ?? ""}
                    onChange={(e) => {
                      const val =
                        e.target.value === "" ? null : parseFloat(e.target.value);
                      onUpdateRow(row.row, (prev) => ({
                        ...prev,
                        user_conversion_rate: Number.isNaN(val as number)
                          ? null
                          : val,
                      }));
                    }}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-slate-600">Rate Date</span>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={row.user_conversion_date ?? ""}
                    onChange={(e) =>
                      onUpdateRow(row.row, (prev) => ({
                        ...prev,
                        user_conversion_date: e.target.value || null,
                      }))
                    }
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
                  />
                </label>
              </div>
              {row.converted_main_total !== null && (
                <p className="text-xs font-mono text-[#0052FF] font-semibold">
                  Converted total:{" "}
                  {formatCurrencyAmount(row.converted_main_total, mainCurrency)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
