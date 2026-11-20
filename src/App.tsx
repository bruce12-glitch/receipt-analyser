import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, Search, X } from "lucide-react";
import {
  AddReceiptModal,
  type AddModalTab,
  type ManualReceiptInput,
} from "./components/AddReceiptModal";
import { LandingView } from "./components/LandingView";
import { LedgerView } from "./components/LedgerView";
import { PolicyView } from "./components/PolicyView";
import { ProofDrawer } from "./components/ProofDrawer";
import { SplitTaxView } from "./components/SplitTaxView";
import { TreemapView } from "./components/TreemapView";
import type {
  RawReceiptFromModel,
  ReceiptCategory,
  ReceiptRow,
  SpendPolicy,
  UploadedPhoto,
  WorkspaceTab,
} from "./types";
import {
  applyCodeVerifiedDuplicates,
  computeShoeboxEngine,
  DEFAULT_POLICY,
  formatCurrencyAmount,
  generateReceiptsCsv,
  VALID_CATEGORIES,
} from "./utils/engine";
import {
  isSupportedUploadFile,
  isTextOrJsonFile,
  processPhotoInBrowser,
  renderTextReceiptCanvas,
} from "./utils/imageProcessor";
import {
  buildClientImagePlaceholderReceipt,
  parseImportedJsonReceipts,
  parseReceiptBatch,
} from "./utils/receiptParser";
import { createSamplePile } from "./utils/sampleReceipts";

function convertRawToRow(
  raw: RawReceiptFromModel,
  rowNumber: number,
  sourcePhotoId: string,
  sourceType: NonNullable<ReceiptRow["source_meta"]>["sourceType"],
  originLabel: string,
  rawText?: string
): ReceiptRow {
  const category: ReceiptCategory = VALID_CATEGORIES.includes(
    raw.category as ReceiptCategory
  )
    ? (raw.category as ReceiptCategory)
    : "Other";

  const box: [number, number, number, number] =
    Array.isArray(raw.box_2d) && raw.box_2d.length === 4
      ? [
          Number(raw.box_2d[0]) || 50,
          Number(raw.box_2d[1]) || 80,
          Number(raw.box_2d[2]) || 940,
          Number(raw.box_2d[3]) || 920,
        ]
      : [50, 80, 940, 920];

  return {
    id: `receipt-${sourcePhotoId}-${rowNumber}-${Date.now()}`,
    row: rowNumber,
    photo_index: raw.photo_index || rowNumber,
    box_2d: box,
    merchant: raw.merchant ?? null,
    date: raw.date ?? null,
    time: raw.time ?? null,
    item_count: raw.item_count ?? null,
    printed_total: raw.printed_total ?? null,
    handwritten_tip: raw.handwritten_tip ?? null,
    final_total: raw.final_total ?? null,
    currency: raw.currency ? raw.currency.toUpperCase().trim() : "USD",
    tax: raw.tax ?? null,
    tax_label: raw.tax_label ?? null,
    tax_id_or_vat: raw.tax_id_or_vat ?? null,
    is_tax_invoice: raw.is_tax_invoice ?? null,
    category,
    card_last4: raw.card_last4 ?? null,
    confidence: raw.confidence || {
      merchant: 0.92,
      date: 0.92,
      printed_total: 0.92,
      handwritten_tip: 1,
      currency: 0.95,
      tax: 0.9,
    },
    flags: Array.isArray(raw.flags) ? raw.flags : [],
    excluded: false,
    checked: false,
    cost_center: "Operations",
    source_photo_id: sourcePhotoId,
    raw_text: rawText,
    source_meta: {
      sourceType,
      originLabel,
    },
  };
}

function renumberAndDedupe(rows: ReceiptRow[]): ReceiptRow[] {
  const renumbered = rows.map((r, idx) => ({ ...r, row: idx + 1 }));
  return applyCodeVerifiedDuplicates(renumbered, []);
}

export default function App() {
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [policy, setPolicy] = useState<SpendPolicy>(DEFAULT_POLICY);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("treemap");

  const [isReading, setIsReading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ReceiptCategory | "All">(
    "All"
  );
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const [addModalTab, setAddModalTab] = useState<AddModalTab | null>(null);
  const [proofSelection, setProofSelection] = useState<{
    title: string;
    rowNumbers: number[];
    activeIndex: number;
  } | null>(null);

  const uploadAbortRef = useRef<AbortController | null>(null);

  const handleCancelUpload = useCallback(() => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
      uploadAbortRef.current = null;
    }
  }, []);

  const handleLoadSamplePile = useCallback((initialTab: WorkspaceTab = "treemap") => {
    const sample = createSamplePile();
    const deduped = renumberAndDedupe(sample.rows);
    setPhotos(sample.photos);
    setRows(deduped);
    setErrorMessage(null);
    setStatusMessage(null);
    setActiveTab(initialTab);
  }, []);

  // Support ?autostart=1 for quick demo entry (strictly in-memory; no database or storage)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autostart") === "1") {
      handleLoadSamplePile();
    }
  }, [handleLoadSamplePile]);

  // Engine computation on full dataset
  const fullEngine = useMemo(
    () => computeShoeboxEngine(rows, photos.length, policy),
    [rows, photos.length, policy]
  );

  // Filtered view for Search + Category + Flagged Only
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return fullEngine.computedRows.filter((r) => {
      if (categoryFilter !== "All" && r.category !== categoryFilter) return false;
      if (flaggedOnly && !r.needs_check) return false;
      if (q) {
        const hay = `${r.merchant || ""} ${r.date || ""} ${r.category} ${
          r.cost_center || ""
        } ${r.tax_id_or_vat || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [fullEngine.computedRows, searchQuery, categoryFilter, flaggedOnly]);

  const filteredEngine = useMemo(() => {
    const isFiltered =
      searchQuery.trim().length > 0 || categoryFilter !== "All" || flaggedOnly;
    if (!isFiltered) return fullEngine;
    return computeShoeboxEngine(filteredRows, photos.length, policy);
  }, [
    fullEngine,
    filteredRows,
    photos.length,
    policy,
    searchQuery,
    categoryFilter,
    flaggedOnly,
  ]);

  const handleUpdateRow = useCallback(
    (rowNum: number, updater: (prev: ReceiptRow) => ReceiptRow) => {
      setRows((prev) =>
        renumberAndDedupe(prev.map((r) => (r.row === rowNum ? updater(r) : r)))
      );
    },
    []
  );

  const handleDeleteRow = useCallback((rowNum: number) => {
    setRows((prev) => renumberAndDedupe(prev.filter((r) => r.row !== rowNum)));
    setProofSelection(null);
  }, []);

  const handleAddParsedText = useCallback(
    (rawText: string) => {
      const batch = parseReceiptBatch(rawText, rows.length + 1);
      if (batch.length === 0) return;

      const stamp = Date.now();
      const newPhotos: UploadedPhoto[] = [];
      const newRows: ReceiptRow[] = [];

      batch.forEach((item, idx) => {
        const photoId = `text-${stamp}-${idx}`;
        const nextIndex = rows.length + idx + 1;
        const canvasUrl = renderTextReceiptCanvas(
          item.receipt.merchant || "Pasted Receipt",
          item.rawText
        );
        newPhotos.push({
          id: photoId,
          name: `${(item.receipt.merchant || "receipt")
            .toLowerCase()
            .replace(/\s+/g, "_")}.txt`,
          displayName: item.receipt.merchant || "Pasted Receipt",
          objectUrl: canvasUrl,
          globalIndex: nextIndex,
          status: "done",
          receiptsCount: 1,
          sourceMeta: {
            sourceType: "pasted_text",
            originLabel: "Pasted Text",
          },
        });

        newRows.push(
          convertRawToRow(
            item.receipt,
            nextIndex,
            photoId,
            "pasted_text",
            "Pasted Text",
            item.rawText
          )
        );
      });

      setPhotos((prev) => [...prev, ...newPhotos]);
      setRows((prev) => renumberAndDedupe([...prev, ...newRows]));
      setErrorMessage(null);
    },
    [rows.length]
  );

  const handleAddManual = useCallback(
    (entry: ManualReceiptInput) => {
      const photoId = `manual-${Date.now()}`;
      const nextIndex = rows.length + 1;
      const finalTotal =
        entry.handwritten_tip !== null
          ? Number((entry.printed_total + entry.handwritten_tip).toFixed(2))
          : entry.printed_total;

      const newRow: ReceiptRow = {
        id: `receipt-${photoId}`,
        row: nextIndex,
        photo_index: nextIndex,
        box_2d: [50, 80, 940, 920],
        merchant: entry.merchant,
        date: entry.date,
        time: null,
        item_count: null,
        printed_total: entry.printed_total,
        handwritten_tip: entry.handwritten_tip,
        final_total: finalTotal,
        currency: entry.currency,
        tax: entry.tax,
        tax_label: entry.tax !== null ? "Tax" : null,
        tax_id_or_vat: entry.tax_id_or_vat || null,
        is_tax_invoice: Boolean(entry.tax_id_or_vat),
        category: entry.category,
        card_last4: null,
        confidence: {
          merchant: 1,
          date: 1,
          printed_total: 1,
          handwritten_tip: 1,
          currency: 1,
          tax: 1,
        },
        flags: [],
        excluded: false,
        checked: true,
        cost_center: entry.cost_center,
        source_photo_id: photoId,
        source_meta: {
          sourceType: "manual_entry",
          originLabel: "Manual Entry",
        },
      };

      setRows((prev) => renumberAndDedupe([...prev, newRow]));
      setErrorMessage(null);
    },
    [rows.length]
  );

  const handleImportJsonText = useCallback((jsonText: string) => {
    try {
      const imported = parseImportedJsonReceipts(jsonText);
      if (imported.length === 0) {
        setErrorMessage("The selected JSON file contained no valid receipt rows.");
        return;
      }
      setRows((prev) => renumberAndDedupe([...prev, ...imported]));
      setErrorMessage(null);
    } catch {
      setErrorMessage("Could not parse JSON backup. Check file formatting.");
    }
  }, []);

  const handleUploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter(isSupportedUploadFile);
      if (files.length === 0) {
        setErrorMessage(
          "Unsupported file format. Upload JPG, PNG, WebP, HEIC, PDF, TXT, or JSON."
        );
        return;
      }

      setIsReading(true);
      setErrorMessage(null);
      setStatusMessage(`Preparing ${files.length} file(s)...`);

      try {
        const addedPhotos: UploadedPhoto[] = [];
        const addedRows: ReceiptRow[] = [];
        const imageQueue: UploadedPhoto[] = [];
        const stamp = Date.now();
        let cursor = rows.length + 1;

        const textFiles: File[] = [];
        const mediaFiles: File[] = [];

        for (const file of files) {
          if (isTextOrJsonFile(file)) {
            textFiles.push(file);
          } else {
            mediaFiles.push(file);
          }
        }

        // Parse text and JSON files immediately in parallel
        const textResults = await Promise.all(
          textFiles.map(async (file) => ({
            file,
            kind: isTextOrJsonFile(file),
            text: await file.text(),
          }))
        );

        for (const item of textResults) {
          if (item.kind === "json") {
            const parsedJsonRows = parseImportedJsonReceipts(item.text);
            addedRows.push(...parsedJsonRows);
            cursor += parsedJsonRows.length;
          } else if (item.kind === "txt") {
            const batch = parseReceiptBatch(item.text, cursor);
            for (const entry of batch) {
              const photoId = `txt-${stamp}-${cursor}`;
              addedPhotos.push({
                id: photoId,
                name: item.file.name,
                displayName: entry.receipt.merchant || item.file.name,
                objectUrl: renderTextReceiptCanvas(
                  entry.receipt.merchant || item.file.name,
                  entry.rawText
                ),
                globalIndex: cursor,
                status: "done",
                receiptsCount: 1,
              });
              addedRows.push(
                convertRawToRow(
                  entry.receipt,
                  cursor,
                  photoId,
                  "pasted_text",
                  item.file.name,
                  entry.rawText
                )
              );
              cursor++;
            }
          }
        }

        // Resize / strip EXIF on photos concurrently so large batches don't lag
        if (mediaFiles.length > 0) {
          const drafts = mediaFiles.map((file, idx) => {
            const globalIndex = cursor + idx;
            return {
              id: `upload-${stamp}-${globalIndex}`,
              file,
              name: file.name,
              displayName: file.name.replace(/\.[^.]+$/, ""),
              objectUrl: URL.createObjectURL(file),
              globalIndex,
              status: "reading" as const,
              receiptsCount: 0,
            };
          });
          cursor += mediaFiles.length;

          const processedPhotos = await Promise.all(
            drafts.map((d) => processPhotoInBrowser(d))
          );
          addedPhotos.push(...processedPhotos);
          imageQueue.push(...processedPhotos);
        }

        let usedLocalFallback = false;

        if (imageQueue.length > 0) {
          setStatusMessage(
            `Reading ${imageQueue.length} receipt ${
              imageQueue.length === 1 ? "image" : "images"
            }...`
          );
          let extractedFromServer = false;

          const controller = new AbortController();
          uploadAbortRef.current = controller;
          const timeoutId = window.setTimeout(() => controller.abort(), 8000);

          try {
            const res = await fetch("/api/read-receipts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                photos: imageQueue.map((p) => ({
                  globalIndex: p.globalIndex,
                  totalPhotos: rows.length + imageQueue.length,
                  mimeType: p.mimeType || "image/jpeg",
                  base64Data: p.base64Data || "",
                })),
              }),
            });

            if (res.ok) {
              const contentType = res.headers.get("content-type") || "";
              if (contentType.includes("application/json")) {
                const data = (await res.json()) as {
                  receipts?: RawReceiptFromModel[];
                };
                if (Array.isArray(data.receipts) && data.receipts.length > 0) {
                  extractedFromServer = true;
                  data.receipts.forEach((raw, idx) => {
                    const matchedPhoto =
                      imageQueue.find((p) => p.globalIndex === raw.photo_index) ||
                      imageQueue[0];
                    addedRows.push(
                      convertRawToRow(
                        raw,
                        rows.length + idx + 1,
                        matchedPhoto.id,
                        "manual_upload",
                        matchedPhoto.name
                      )
                    );
                  });
                }
              }
            }
          } catch {
            // Timed out, aborted by user, offline, or static GitHub Pages — open right away for local review
          } finally {
            window.clearTimeout(timeoutId);
            uploadAbortRef.current = null;
          }

          if (!extractedFromServer) {
            usedLocalFallback = true;
            imageQueue.forEach((p, idx) => {
              const fallback = buildClientImagePlaceholderReceipt(
                p.name,
                p.globalIndex
              );
              addedRows.push(
                convertRawToRow(
                  fallback,
                  rows.length + idx + 1,
                  p.id,
                  "manual_upload",
                  p.name
                )
              );
            });
          }
        }

        if (addedPhotos.length > 0) {
          setPhotos((prev) => [...prev, ...addedPhotos]);
        }
        if (addedRows.length > 0) {
          const startingRowNum = rows.length + 1;
          setRows((prev) => renumberAndDedupe([...prev, ...addedRows]));
          if (usedLocalFallback) {
            setProofSelection({
              title: "Review Uploaded Receipt",
              rowNumbers: addedRows.map((_, idx) => startingRowNum + idx),
              activeIndex: 0,
            });
          }
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to process uploaded files."
        );
      } finally {
        setIsReading(false);
        setStatusMessage(null);
      }
    },
    [rows.length]
  );

  const handleExportCsv = useCallback(() => {
    const csv = generateReceiptsCsv(fullEngine.computedRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shoebox-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [fullEngine.computedRows]);

  const handleExportJson = useCallback(() => {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        policy,
        rows,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shoebox-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [policy, rows]);

  const handleResetPile = useCallback(() => {
    setRows([]);
    setPhotos([]);
    setProofSelection(null);
    setSearchQuery("");
    setCategoryFilter("All");
    setFlaggedOnly(false);
  }, []);

  const openProofForTile = useCallback(
    (tileId: string) => {
      const tile =
        filteredEngine.merchantTiles.find((t) => t.id === tileId) ||
        fullEngine.merchantTiles.find((t) => t.id === tileId);
      if (!tile || tile.receipts.length === 0) return;
      setProofSelection({
        title: tile.name,
        rowNumbers: tile.receipts.map((r) => r.row),
        activeIndex: 0,
      });
    },
    [filteredEngine.merchantTiles, fullEngine.merchantTiles]
  );

  const openProofForFlagged = useCallback(() => {
    const flagged = fullEngine.computedRows.filter((r) => r.needs_check);
    if (flagged.length === 0) return;
    setProofSelection({
      title: "Flagged Receipts to Check",
      rowNumbers: flagged.map((r) => r.row),
      activeIndex: 0,
    });
  }, [fullEngine.computedRows]);

  const openProofForRow = useCallback((rowNum: number) => {
    const target = fullEngine.computedRows.find((r) => r.row === rowNum);
    if (!target) return;
    setProofSelection({
      title: target.merchant || `Receipt #${rowNum}`,
      rowNumbers: [rowNum],
      activeIndex: 0,
    });
  }, [fullEngine.computedRows]);

  const activeProofRows = useMemo(() => {
    if (!proofSelection) return [];
    return proofSelection.rowNumbers
      .map((num) => fullEngine.computedRows.find((r) => r.row === num))
      .filter((r): r is NonNullable<typeof r> => Boolean(r));
  }, [proofSelection, fullEngine.computedRows]);

  // Empty Landing State
  if (rows.length === 0) {
    return (
      <>
        <LandingView
          isReading={isReading}
          statusMessage={statusMessage}
          errorMessage={errorMessage}
          onCancelUpload={handleCancelUpload}
          onUploadFiles={handleUploadFiles}
          onLoadSamplePile={handleLoadSamplePile}
          onOpenAddModal={(tab) => setAddModalTab(tab)}
        />
        {addModalTab && (
          <AddReceiptModal
            initialTab={addModalTab}
            onClose={() => setAddModalTab(null)}
            onUploadFiles={handleUploadFiles}
            onAddParsedText={handleAddParsedText}
            onAddManual={handleAddManual}
          />
        )}
      </>
    );
  }

  const { reconciliation } = fullEngine;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6 sm:gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("treemap")}
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Shoebox
          </button>

          <nav
            aria-label="Workspace views"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {(
              [
                ["treemap", "Treemap"],
                ["ledger", "Ledger"],
                ["splittax", "Split & Tax"],
                ["policy", "Policy"],
              ] as const
            ).map(([id, label]) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  aria-current={active ? "page" : undefined}
                  className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? "border-[#0052FF] text-[#0052FF] font-semibold"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setAddModalTab("upload")}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#0052FF] hover:bg-[#0043D1] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Receipts</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Clean Mobile View Switcher (keeps top header single-row and unclipped on 390px) */}
        <nav
          aria-label="Mobile workspace views"
          className="flex md:hidden items-center gap-1 p-1 bg-slate-200/70 rounded-lg no-print"
        >
          {(
            [
              ["treemap", "Treemap"],
              ["ledger", "Ledger"],
              ["splittax", "Split & Tax"],
              ["policy", "Policy"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? "page" : undefined}
              className={`flex-1 py-2 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === id
                  ? "bg-white text-[#0052FF] shadow-xs"
                  : "text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        {statusMessage && (
          <div
            role="status"
            className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-[#0052FF] font-medium flex items-center justify-between gap-4 no-print"
          >
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={handleCancelUpload}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-2.5 py-1 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              Review Now
            </button>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-4"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
              className="text-red-600 hover:text-red-900 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Full-Width 4-Column KPI Strip */}
        <section
          aria-label="Audit Summary"
          className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
        >
            <div className="p-4 sm:p-5">
              <p className="text-xs font-medium text-slate-500">
                Audited Spend ({reconciliation.mainCurrency})
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
                {formatCurrencyAmount(
                  reconciliation.mainTotalAmount,
                  reconciliation.mainCurrency
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1 tabular-nums">
                {reconciliation.foreignTotals.length > 0
                  ? `+ ${reconciliation.foreignTotals
                      .map((f) => formatCurrencyAmount(f.totalAmount, f.currency))
                      .join(", ")} isolated`
                  : `Budget cap ${formatCurrencyAmount(
                      policy.monthlyBudget,
                      reconciliation.mainCurrency
                    )}`}
              </p>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-xs font-medium text-slate-500">
                Receipts Audited
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
                {reconciliation.includedCount}
              </p>
              <p className="text-xs text-slate-500 mt-1 tabular-nums">
                {reconciliation.excludedCount > 0
                  ? `${reconciliation.excludedCount} excluded · ${fullEngine.merchantTiles.length} merchants`
                  : `${fullEngine.merchantTiles.length} distinct merchants`}
              </p>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-xs font-medium text-slate-500">
                Flags to Check
              </p>
              <p
                className={`font-mono text-2xl font-bold tabular-nums mt-1 ${
                  reconciliation.toCheckCount > 0
                    ? "text-amber-600"
                    : "text-emerald-700"
                }`}
              >
                {reconciliation.toCheckCount}
              </p>
              <div className="mt-1">
                {reconciliation.toCheckCount > 0 ? (
                  <button
                    type="button"
                    onClick={openProofForFlagged}
                    className="text-xs font-semibold text-[#0052FF] hover:underline cursor-pointer"
                  >
                    Inspect flagged items
                  </button>
                ) : (
                  <span className="text-xs text-emerald-700">
                    All receipts cleared
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Reconciliation Export
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {reconciliation.crossSourceDuplicatesCount} duplicate ·{" "}
                  {reconciliation.missingTaxInvoiceCount} missing Tax ID
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0052FF] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Download Audited CSV</span>
                </button>
              </div>
            </div>
          </section>

        {/* Workspace Filter Toolbar (for Treemap and Ledger) */}
        {(activeTab === "treemap" || activeTab === "ledger") && (
          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
              <div className="relative flex-1 max-w-xs">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Search receipts by merchant, date, or cost center"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search merchant, date, cost center..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-[#0052FF] outline-none"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg overflow-x-auto">
                {(["All", ...VALID_CATEGORIES] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      categoryFilter === cat
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setFlaggedOnly((v) => !v)}
                aria-pressed={flaggedOnly}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  flaggedOnly
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {flaggedOnly
                  ? `Showing Flagged (${reconciliation.toCheckCount})`
                  : `Flagged Only (${reconciliation.toCheckCount})`}
              </button>
            </div>
          </div>
        )}

        {/* Active Workspace View */}
        {activeTab === "treemap" && (
          <TreemapView
            merchantTiles={filteredEngine.merchantTiles}
            reconciliation={fullEngine.reconciliation}
            onSelectTile={openProofForTile}
            onOpenFlagged={openProofForFlagged}
          />
        )}

        {activeTab === "splittax" && (
          <SplitTaxView
            computedRows={fullEngine.computedRows}
            reconciliation={fullEngine.reconciliation}
          />
        )}

        {activeTab === "ledger" && (
          <LedgerView
            rows={filteredRows}
            onInspectRow={openProofForRow}
            onUpdateRow={handleUpdateRow}
            onDeleteRow={handleDeleteRow}
          />
        )}

        {activeTab === "policy" && (
          <PolicyView
            policy={policy}
            reconciliation={fullEngine.reconciliation}
            onChangePolicy={setPolicy}
            onExportCsv={handleExportCsv}
            onExportJson={handleExportJson}
            onImportJsonText={handleImportJsonText}
            onResetPile={handleResetPile}
          />
        )}
      </main>

      {/* Proof Inspector Drawer */}
      {proofSelection && activeProofRows.length > 0 && (
        <ProofDrawer
          title={proofSelection.title}
          rows={activeProofRows}
          activeIndex={proofSelection.activeIndex}
          photos={photos}
          mainCurrency={reconciliation.mainCurrency}
          onSelectIndex={(idx) =>
            setProofSelection((prev) => (prev ? { ...prev, activeIndex: idx } : null))
          }
          onClose={() => setProofSelection(null)}
          onUpdateRow={handleUpdateRow}
        />
      )}

      {/* Add Receipts Modal */}
      {addModalTab && (
        <AddReceiptModal
          initialTab={addModalTab}
          onClose={() => setAddModalTab(null)}
          onUploadFiles={handleUploadFiles}
          onAddParsedText={handleAddParsedText}
          onAddManual={handleAddManual}
        />
      )}
    </div>
  );
}
