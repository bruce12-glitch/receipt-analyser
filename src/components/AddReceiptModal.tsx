import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileText, PenLine, Upload, X } from "lucide-react";
import type { ReceiptCategory } from "../types";
import { formatCurrencyAmount, VALID_CATEGORIES } from "../utils/engine";
import { parseReceiptBatch } from "../utils/receiptParser";
import { SAMPLE_PASTE_TEXT } from "../utils/sampleReceipts";

const QUICK_LIST_SAMPLE = `Blue Bottle Coffee $14.50 2026-11-12
Uber to Airport $38.20 2026-11-12
Staples Printer Paper $62.00 2026-11-13`;

export type AddModalTab = "upload" | "paste" | "manual";

export interface ManualReceiptInput {
  merchant: string;
  date: string;
  printed_total: number;
  handwritten_tip: number | null;
  tax: number | null;
  currency: string;
  category: ReceiptCategory;
  cost_center: string;
  tax_id_or_vat: string;
}

interface AddReceiptModalProps {
  initialTab: AddModalTab;
  onClose: () => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onAddParsedText: (rawText: string) => void;
  onAddManual: (entry: ManualReceiptInput) => void;
}

export const AddReceiptModal: React.FC<AddReceiptModalProps> = ({
  initialTab,
  onClose,
  onUploadFiles,
  onAddParsedText,
  onAddManual,
}) => {
  const [tab, setTab] = useState<AddModalTab>(initialTab);
  const [rawText, setRawText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [tip, setTip] = useState("");
  const [tax, setTax] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState<ReceiptCategory>("Meals");
  const [costCenter, setCostCenter] = useState("Operations");
  const [taxId, setTaxId] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const liveBatch = useMemo(() => {
    if (!rawText.trim()) return [];
    return parseReceiptBatch(rawText, 1);
  }, [rawText]);

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setPasteError("Paste receipt text or click an example above first.");
      return;
    }
    setPasteError(null);
    onAddParsedText(rawText);
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!merchant.trim()) {
      setManualError("Merchant name is required.");
      return;
    }
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setManualError("Enter a valid positive total amount.");
      return;
    }
    setManualError(null);
    const numericTip = tip.trim() ? parseFloat(tip) : null;
    const numericTax = tax.trim() ? parseFloat(tax) : null;

    onAddManual({
      merchant: merchant.trim(),
      date: date.trim() || new Date().toISOString().slice(0, 10),
      printed_total: numericAmount,
      handwritten_tip:
        numericTip !== null && !Number.isNaN(numericTip) ? numericTip : null,
      tax: numericTax !== null && !Number.isNaN(numericTax) ? numericTax : null,
      currency: currency.trim().toUpperCase() || "USD",
      category,
      cost_center: costCenter.trim() || "Operations",
      tax_id_or_vat: taxId.trim(),
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add Receipts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Add Receipts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Add Receipts modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-4">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === "upload"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              Upload Files
            </button>
            <button
              type="button"
              onClick={() => setTab("paste")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === "paste"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              Paste Text
            </button>
            <button
              type="button"
              onClick={() => setTab("manual")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === "manual"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
              Manual Entry
            </button>
          </div>
        </div>

        <div className="p-6">
          {tab === "upload" && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,text/plain,application/json,.jpg,.jpeg,.png,.webp,.heic,.pdf,.txt,.json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onUploadFiles(e.target.files);
                    onClose();
                  }
                }}
              />
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3">
                <p className="text-sm font-medium text-slate-800">
                  Pick receipt photos, PDFs, text slips (.txt), or JSON backups
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Photos are resized and stripped of EXIF tags locally. If a reader
                  endpoint is available, fields pre-fill automatically; otherwise the
                  receipt opens right away in the side-by-side editor.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0052FF] hover:bg-[#0043D1] rounded-lg transition-colors cursor-pointer"
                >
                  Browse Files
                </button>
              </div>
            </div>
          )}

          {tab === "paste" && (
            <form onSubmit={handlePasteSubmit} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="paste-receipt-textarea"
                  className="text-sm font-medium text-slate-700"
                >
                  Paste one receipt, multiple blocks (---), or a quick list
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRawText(SAMPLE_PASTE_TEXT);
                      setPasteError(null);
                    }}
                    className="text-xs font-semibold text-[#0052FF] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    1 Receipt Example
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRawText(QUICK_LIST_SAMPLE);
                      setPasteError(null);
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    3-Line Quick List
                  </button>
                </div>
              </div>

              <textarea
                id="paste-receipt-textarea"
                rows={7}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setPasteError(null);
                }}
                placeholder={"WHOLE FOODS MARKET\nDate: 2026-11-14\nSubtotal: $42.50\nTax: $3.40\nTotal: $45.90\n\nOr paste one expense per line:\nBlue Bottle Coffee $14.50\nUber to Airport $38.20"}
                className="w-full px-3 py-2.5 text-xs font-mono border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
              />

              {liveBatch.length === 1 && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Ready:{" "}
                    <strong className="text-slate-900">
                      {liveBatch[0].receipt.merchant || "Unknown merchant"}
                    </strong>{" "}
                    · {liveBatch[0].receipt.category} · {liveBatch[0].receipt.date}
                  </span>
                  <span className="font-mono font-semibold text-[#0052FF] tabular-nums">
                    {formatCurrencyAmount(
                      liveBatch[0].receipt.final_total ??
                        liveBatch[0].receipt.printed_total,
                      liveBatch[0].receipt.currency || "USD"
                    )}
                  </span>
                </div>
              )}

              {liveBatch.length > 1 && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Ready to add{" "}
                    <strong className="text-slate-900">
                      {liveBatch.length} receipts
                    </strong>{" "}
                    (
                    {liveBatch
                      .slice(0, 2)
                      .map((item) => item.receipt.merchant)
                      .join(", ")}
                    {liveBatch.length > 2 ? ` +${liveBatch.length - 2} more` : ""})
                  </span>
                  <span className="font-mono font-semibold text-[#0052FF] tabular-nums">
                    Instant local parse
                  </span>
                </div>
              )}

              {pasteError && (
                <p role="alert" className="text-xs text-red-600 font-medium">
                  {pasteError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0052FF] hover:bg-[#0043D1] rounded-lg cursor-pointer"
                >
                  {liveBatch.length > 1
                    ? `Add ${liveBatch.length} Receipts`
                    : "Add Receipt"}
                </button>
              </div>
            </form>
          )}

          {tab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-xs font-medium text-slate-700">
                    Merchant Name *
                  </span>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="e.g. Blue Bottle Coffee"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Printed Total *
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="45.90"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Currency
                  </span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg bg-white focus:border-[#0052FF] outline-none"
                  >
                    {["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "NZD", "INR"].map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Category
                  </span>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as ReceiptCategory)
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-[#0052FF] outline-none"
                  >
                    {VALID_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Handwritten Tip (optional)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={tip}
                    onChange={(e) => setTip(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Tax (optional)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Cost Center
                  </span>
                  <input
                    type="text"
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Tax / VAT ID (optional)
                  </span>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g. EIN 94-1234567"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:border-[#0052FF] outline-none"
                  />
                </label>
              </div>

              {manualError && (
                <p role="alert" className="text-xs text-red-600 font-medium">
                  {manualError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0052FF] hover:bg-[#0043D1] rounded-lg cursor-pointer"
                >
                  Add Receipt
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
