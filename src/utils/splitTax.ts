import type { ComputedRow } from "../types";
import { fromMinorUnits, toMinorUnits } from "./engine";

export interface TaxBreakdownItem {
  label: string;
  currency: string;
  taxCents: number;
  taxAmount: number;
  receiptCount: number;
}

export interface CostCenterSplitItem {
  costCenter: string;
  receiptCount: number;
  totalCents: number;
  totalAmount: number;
  sharePercent: number;
}

export interface EqualSplitResult {
  peopleCount: number;
  perPersonCents: number;
  perPersonAmount: number;
  remainderCents: number;
}

export function computeEqualSplit(
  mainTotalCents: number,
  peopleCount: number,
  mainCurrency: string
): EqualSplitResult {
  const safePeople = Math.max(1, Math.floor(peopleCount) || 1);
  const perPersonCents = Math.floor(mainTotalCents / safePeople);
  const remainderCents = mainTotalCents - perPersonCents * safePeople;
  return {
    peopleCount: safePeople,
    perPersonCents,
    perPersonAmount: fromMinorUnits(perPersonCents, mainCurrency),
    remainderCents,
  };
}

export function computeTaxBreakdown(
  rows: ComputedRow[],
  mainCurrency: string
): {
  totalMainTaxCents: number;
  totalMainTaxAmount: number;
  effectiveTaxRatePct: number;
  taxInvoiceVerifiedCount: number;
  includedCount: number;
  byLabel: TaxBreakdownItem[];
} {
  let totalMainTaxCents = 0;
  let totalMainGrossCents = 0;
  let taxInvoiceVerifiedCount = 0;
  let includedCount = 0;

  const map = new Map<string, TaxBreakdownItem>();

  for (const r of rows) {
    if (r.excluded) continue;
    includedCount++;
    if (r.is_tax_invoice || Boolean(r.tax_id_or_vat?.trim())) {
      taxInvoiceVerifiedCount++;
    }

    const currency = r.effective_currency;
    if (!r.is_foreign) {
      totalMainGrossCents += toMinorUnits(r.code_calculated_total, mainCurrency);
    } else if (r.converted_main_total !== null) {
      totalMainGrossCents += toMinorUnits(r.converted_main_total, mainCurrency);
    }

    if (r.tax !== null && r.tax > 0) {
      const label = r.tax_label?.trim() || "Tax / VAT";
      const key = `${label}__${currency}`;
      const taxCents = toMinorUnits(r.tax, currency);
      if (!r.is_foreign) {
        totalMainTaxCents += taxCents;
      }

      const existing = map.get(key);
      if (existing) {
        existing.taxCents += taxCents;
        existing.taxAmount = fromMinorUnits(existing.taxCents, currency);
        existing.receiptCount += 1;
      } else {
        map.set(key, {
          label,
          currency,
          taxCents,
          taxAmount: fromMinorUnits(taxCents, currency),
          receiptCount: 1,
        });
      }
    }
  }

  const netBeforeTax = Math.max(0, totalMainGrossCents - totalMainTaxCents);
  const effectiveTaxRatePct =
    netBeforeTax > 0 ? (totalMainTaxCents / netBeforeTax) * 100 : 0;

  const byLabel = Array.from(map.values()).sort((a, b) => {
    if (a.currency === mainCurrency && b.currency !== mainCurrency) return -1;
    if (b.currency === mainCurrency && a.currency !== mainCurrency) return 1;
    return b.taxCents - a.taxCents;
  });

  return {
    totalMainTaxCents,
    totalMainTaxAmount: fromMinorUnits(totalMainTaxCents, mainCurrency),
    effectiveTaxRatePct,
    taxInvoiceVerifiedCount,
    includedCount,
    byLabel,
  };
}

export function computeCostCenterBreakdown(
  rows: ComputedRow[],
  mainCurrency: string
): CostCenterSplitItem[] {
  const map = new Map<string, { receiptCount: number; totalCents: number }>();
  let grandTotalCents = 0;

  for (const r of rows) {
    if (r.excluded) continue;
    if (r.is_foreign && r.converted_main_total === null) continue;
    const cc = r.cost_center?.trim() || "Unassigned";
    const amt =
      r.is_foreign && r.converted_main_total !== null
        ? r.converted_main_total
        : r.code_calculated_total;
    const cents = toMinorUnits(amt, mainCurrency);
    grandTotalCents += cents;

    const existing = map.get(cc) || { receiptCount: 0, totalCents: 0 };
    existing.receiptCount += 1;
    existing.totalCents += cents;
    map.set(cc, existing);
  }

  return Array.from(map.entries())
    .map(([costCenter, info]) => ({
      costCenter,
      receiptCount: info.receiptCount,
      totalCents: info.totalCents,
      totalAmount: fromMinorUnits(info.totalCents, mainCurrency),
      sharePercent:
        grandTotalCents > 0 ? (info.totalCents / grandTotalCents) * 100 : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}
