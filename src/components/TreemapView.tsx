import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Globe } from "lucide-react";
import type {
  MerchantTileData,
  PositionedTile,
  ReconciliationResult,
  TileColorToken,
} from "../types";
import { computeTreemapLayout, formatCurrencyAmount } from "../utils/engine";

interface TreemapViewProps {
  merchantTiles: MerchantTileData[];
  reconciliation: ReconciliationResult;
  onSelectTile: (tileId: string) => void;
  onOpenFlagged: () => void;
}

function getTileStyle(token: TileColorToken): {
  bg: string;
  hover: string;
  text: string;
  muted: string;
  hatch: string;
} {
  switch (token) {
    case "blue-900":
      return {
        bg: "bg-[#0052FF]",
        hover: "hover:bg-[#0046DB]",
        text: "text-white",
        muted: "text-blue-100",
        hatch: "hatch-light",
      };
    case "blue-700":
      return {
        bg: "bg-[#1D4ED8]",
        hover: "hover:bg-[#1E40AF]",
        text: "text-white",
        muted: "text-blue-100",
        hatch: "hatch-light",
      };
    case "blue-500":
      return {
        bg: "bg-[#DBEAFE]",
        hover: "hover:bg-[#BFDBFE]",
        text: "text-slate-900",
        muted: "text-slate-600",
        hatch: "hatch-cobalt",
      };
    case "white":
    default:
      return {
        bg: "bg-white",
        hover: "hover:bg-slate-50",
        text: "text-slate-900",
        muted: "text-slate-500",
        hatch: "hatch-cobalt",
      };
  }
}

export const TreemapView: React.FC<TreemapViewProps> = ({
  merchantTiles,
  reconciliation,
  onSelectTile,
  onOpenFlagged,
}) => {
  const positionedTiles: PositionedTile[] = useMemo(
    () => computeTreemapLayout(merchantTiles, false),
    [merchantTiles]
  );

  if (merchantTiles.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <h2 className="font-display text-xl font-semibold text-slate-900">
          No included receipts match the current filter
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Clear your search filter or include excluded receipts to populate the spend treemap.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Merchant Spend Treemap" className="space-y-4">
      {/* Desktop Proportional Treemap */}
      <div className="hidden md:block relative w-full h-[520px] border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
        {positionedTiles.map((tile) => {
          const style = getTileStyle(tile.colorToken);
          const isLarge = tile.w * tile.h >= 0.16;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelectTile(tile.id)}
              aria-label={`Inspect ${tile.name}, ${formatCurrencyAmount(
                tile.totalAmount,
                tile.currency
              )}, ${tile.receipts.length} ${
                tile.receipts.length === 1 ? "receipt" : "receipts"
              }`}
              style={{
                left: `${tile.x * 100}%`,
                top: `${tile.y * 100}%`,
                width: `${tile.w * 100}%`,
                height: `${tile.h * 100}%`,
              }}
              className={`absolute text-left border border-slate-200/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900 flex flex-col justify-between p-5 overflow-hidden ${
                style.bg
              } ${style.hover} ${style.text} ${tile.isForeign ? style.hatch : ""}`}
            >
              <div className="min-w-0 space-y-1">
                <p
                  className={`font-display font-semibold tracking-tight leading-tight line-clamp-2 ${
                    isLarge ? "text-2xl lg:text-3xl" : "text-lg lg:text-xl"
                  }`}
                >
                  {tile.name}
                </p>
                <p className={`font-mono font-semibold tabular-nums ${
                  isLarge ? "text-xl" : "text-base"
                }`}>
                  {formatCurrencyAmount(tile.totalAmount, tile.currency)}
                </p>
              </div>

              <div className={`text-xs sm:text-sm tabular-nums space-y-1 ${style.muted}`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>
                    {tile.receipts.length}{" "}
                    {tile.receipts.length === 1 ? "receipt" : "receipts"}
                  </span>
                  <span aria-hidden="true">·</span>
                  {tile.isForeign ? (
                    <span className="inline-flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                      Kept in {tile.currency}
                    </span>
                  ) : (
                    <span>
                      {tile.sharePercent >= 10
                        ? `${Math.round(tile.sharePercent)}%`
                        : `${tile.sharePercent.toFixed(1)}%`}{" "}
                      of spend
                    </span>
                  )}
                </div>

                {tile.flaggedCount > 0 ? (
                  <p className="inline-flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{tile.flaggedCount} to check</span>
                  </p>
                ) : (
                  <p className="inline-flex items-center gap-1.5 opacity-80">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Verified</span>
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile Clean Stacked Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {positionedTiles.map((tile) => {
          const style = getTileStyle(tile.colorToken);
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelectTile(tile.id)}
              className={`w-full text-left rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-4 cursor-pointer transition-colors ${style.bg} ${style.hover} ${style.text}`}
            >
              <div>
                <p className="font-display text-lg font-semibold truncate">{tile.name}</p>
                <p className="font-mono text-base font-semibold tabular-nums mt-0.5">
                  {formatCurrencyAmount(tile.totalAmount, tile.currency)}
                </p>
              </div>
              <div className={`text-xs flex items-center justify-between ${style.muted}`}>
                <span>
                  {tile.receipts.length}{" "}
                  {tile.receipts.length === 1 ? "receipt" : "receipts"} ·{" "}
                  {tile.isForeign
                    ? `Kept in ${tile.currency}`
                    : `${tile.sharePercent.toFixed(1)}%`}
                </span>
                {tile.flaggedCount > 0 && (
                  <span className="font-medium">{tile.flaggedCount} to check</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Reconciliation Verification Footer Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
          <span className="font-medium text-slate-700">
            {reconciliation.reconciles
              ? "Reconciled in integer minor units"
              : reconciliation.failureReason}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {reconciliation.includedCount} included / {reconciliation.excludedCount} excluded
          </span>
          {reconciliation.foreignTotals.map((ft) => (
            <React.Fragment key={ft.currency}>
              <span aria-hidden="true">·</span>
              <span>
                {formatCurrencyAmount(ft.totalAmount, ft.currency)} isolated in {ft.currency}
              </span>
            </React.Fragment>
          ))}
        </div>

        {reconciliation.toCheckCount > 0 && (
          <button
            type="button"
            onClick={onOpenFlagged}
            className="font-medium text-[#0052FF] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Review {reconciliation.toCheckCount} flagged{" "}
            {reconciliation.toCheckCount === 1 ? "receipt" : "receipts"}
          </button>
        )}
      </div>
    </section>
  );
};
