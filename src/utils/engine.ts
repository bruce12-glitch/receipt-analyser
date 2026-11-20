import type {
  ComputedRow,
  IngestionSourceType,
  MerchantTileData,
  PositionedTile,
  ReceiptCategory,
  ReceiptFlag,
  ReceiptRow,
  ReconciliationResult,
  SpendPolicy,
  TileColorToken,
} from "../types";

export const VALID_CATEGORIES: ReceiptCategory[] = [
  "Meals",
  "Travel",
  "Lodging",
  "Office",
  "Other",
];

export const DEFAULT_POLICY: SpendPolicy = {
  monthlyBudget: 2500,
  singleReceiptLimit: 600,
  requireTaxIdAbove: 75,
};

const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND", "CLP", "ISK"]);

export function getRowSourceType(row: ReceiptRow): IngestionSourceType {
  return row.source_meta?.sourceType || "manual_upload";
}

export function formatSourceShort(row: ReceiptRow): string {
  const st = getRowSourceType(row);
  if (st === "pasted_text") return "Pasted Receipt";
  if (st === "manual_entry") return "Manual Entry";
  if (st === "json_import") return "JSON Import";
  if (st === "sample_pile") return row.source_meta?.originLabel || "Sample Pile";
  return row.source_meta?.originLabel || "Photo Upload";
}

export function isZeroDecimalCurrency(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
}

export function toMinorUnits(amount: number, currency: string): number {
  if (isZeroDecimalCurrency(currency)) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

export function fromMinorUnits(minor: number, currency: string): number {
  if (isZeroDecimalCurrency(currency)) {
    return minor;
  }
  return minor / 100;
}

export function getCurrencySymbol(currency: string): string {
  const code = (currency || "USD").toUpperCase();
  const map: Record<string, string> = {
    USD: "$",
    NZD: "NZ$",
    AUD: "A$",
    CAD: "C$",
    SGD: "S$",
    HKD: "HK$",
    GBP: "£",
    EUR: "€",
    JPY: "¥",
    CNY: "¥",
    CHF: "CHF ",
    SEK: "kr ",
    NOK: "kr ",
    DKK: "kr ",
    INR: "₹",
    KRW: "₩",
  };
  return map[code] || `${code} `;
}

export function formatCurrencyAmount(
  amount: number | null | undefined,
  currency: string
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "—";
  }
  const code = (currency || "USD").toUpperCase();
  const sym = getCurrencySymbol(code);
  const zeroDec = isZeroDecimalCurrency(code);
  const formattedNumber = amount.toLocaleString("en-US", {
    minimumFractionDigits: zeroDec ? 0 : 2,
    maximumFractionDigits: zeroDec ? 0 : 2,
  });
  return `${sym}${formattedNumber}`;
}

export function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return dateStr;
}

export function normalizeMerchantName(name: string | null): string {
  if (!name || !name.trim()) return "Unreadable merchant";
  let cleaned = name
    .trim()
    .replace(/\s+#\d+.*$/i, "")
    .replace(/\s+\b(pty\s+ltd|ltd\.?|limited|inc\.?|llc|corp\.?)\b$/i, "")
    .trim();
  if (!cleaned) cleaned = name.trim();

  if (
    cleaned.length > 4 &&
    cleaned === cleaned.toUpperCase() &&
    /[A-Z]/.test(cleaned)
  ) {
    cleaned = cleaned
      .toLowerCase()
      .replace(/\b([a-z])([a-z]*)/g, (_m, first: string, rest: string) => {
        const word = (first + rest).toUpperCase();
        if (["ANZ", "AT", "BP", "AA", "ASB", "BNZ", "KFC", "PB", "AWS"].includes(word)) {
          return word;
        }
        return first.toUpperCase() + rest;
      });
  }
  return cleaned;
}

function normalizeForComparison(str: string | null): string {
  if (!str) return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export function areMerchantsSimilar(a: string | null, b: string | null): boolean {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return false;
  const dp: number[][] = Array.from({ length: normA.length + 1 }, () =>
    Array(normB.length + 1).fill(0)
  );
  for (let i = 0; i <= normA.length; i++) dp[i][0] = i;
  for (let j = 0; j <= normB.length; j++) dp[0][j] = j;
  for (let i = 1; i <= normA.length; i++) {
    for (let j = 1; j <= normB.length; j++) {
      const cost = normA[i - 1] === normB[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  const distance = dp[normA.length][normB.length];
  return 1 - distance / maxLen >= 0.75;
}

export function areDatesWithinOneDay(d1: string | null, d2: string | null): boolean {
  if (!d1 || !d2) return true;
  if (d1.trim() === d2.trim()) return true;
  const t1 = Date.parse(d1);
  const t2 = Date.parse(d2);
  if (Number.isNaN(t1) || Number.isNaN(t2)) {
    return d1.trim() === d2.trim();
  }
  const diffDays = Math.abs(t1 - t2) / (1000 * 60 * 60 * 24);
  return diffDays <= 1.1;
}

function isCrossSourceDuplicatePair(earlier: ReceiptRow, later: ReceiptRow): boolean {
  const earlierType = getRowSourceType(earlier);
  const laterType = getRowSourceType(later);
  if (earlierType !== laterType) return true;
  const o1 = earlier.source_meta?.originLabel;
  const o2 = later.source_meta?.originLabel;
  if (o1 && o2 && o1 !== o2) return true;
  return false;
}

/**
 * Verifies model-suggested duplicate pairs in code AND checks all row pairs
 * using deterministic rules: same amount, date within 1 day, similar merchant.
 */
export function applyCodeVerifiedDuplicates(
  rows: ReceiptRow[],
  modelDuplicates: Array<{ row: number; duplicate_of: number; reason: string }> = []
): ReceiptRow[] {
  const byRowNum = new Map<number, ReceiptRow>();
  rows.forEach((r) =>
    byRowNum.set(r.row, {
      ...r,
      flags: (r.flags || []).filter(
        (f) =>
          f.type !== "cross_source_duplicate" &&
          !(f.type === "possible_duplicate" && f.source === "code")
      ),
      duplicate_of: null,
      duplicate_reason: null,
    })
  );

  const getEffectiveTotal = (r: ReceiptRow): number | null => {
    if (
      r.printed_total !== null &&
      r.handwritten_tip !== null &&
      r.handwritten_tip > 0
    ) {
      return Number((r.printed_total + r.handwritten_tip).toFixed(2));
    }
    return r.final_total ?? r.printed_total ?? null;
  };

  const markDuplicatePair = (
    earlier: ReceiptRow,
    later: ReceiptRow,
    fallbackReason: string
  ) => {
    later.duplicate_of = earlier.row;
    if (isCrossSourceDuplicatePair(earlier, later)) {
      const crossNote = `Cross-source duplicate of #${earlier.row} (${formatSourceShort(
        earlier
      )} vs ${formatSourceShort(later)})`;
      later.duplicate_reason = crossNote;
      later.flags = [
        ...(later.flags || []),
        {
          type: "cross_source_duplicate",
          note: crossNote,
          source: "code",
        },
      ];
    } else {
      later.duplicate_reason = fallbackReason;
    }
  };

  for (const cand of modelDuplicates) {
    const laterRowNum = Math.max(cand.row, cand.duplicate_of);
    const earlierRowNum = Math.min(cand.row, cand.duplicate_of);
    if (laterRowNum === earlierRowNum) continue;
    const later = byRowNum.get(laterRowNum);
    const earlier = byRowNum.get(earlierRowNum);
    if (!later || !earlier) continue;

    const amtA = getEffectiveTotal(later);
    const amtB = getEffectiveTotal(earlier);
    const sameAmount =
      amtA !== null && amtB !== null && Math.abs(amtA - amtB) <= 0.01;
    const sameCurrency =
      !earlier.currency ||
      !later.currency ||
      earlier.currency.toUpperCase().trim() ===
        later.currency.toUpperCase().trim();
    const closeDate = areDatesWithinOneDay(later.date, earlier.date);
    const simMerchant = areMerchantsSimilar(later.merchant, earlier.merchant);

    if (sameAmount && sameCurrency && closeDate && simMerchant) {
      markDuplicatePair(
        earlier,
        later,
        cand.reason || `Same merchant, date and total as #${earlier.row}`
      );
    }
  }

  const sortedRows = Array.from(byRowNum.values()).sort((a, b) => a.row - b.row);
  for (let i = 0; i < sortedRows.length; i++) {
    for (let j = i + 1; j < sortedRows.length; j++) {
      const earlier = sortedRows[i];
      const later = sortedRows[j];
      if (later.duplicate_of) continue;

      const amtA = getEffectiveTotal(earlier);
      const amtB = getEffectiveTotal(later);
      if (amtA === null || amtB === null || amtA <= 0) continue;

      const sameAmount = Math.abs(amtA - amtB) <= 0.01;
      const sameCurrency =
        (earlier.currency || "USD").toUpperCase().trim() ===
        (later.currency || "USD").toUpperCase().trim();
      const closeDate =
        earlier.date !== null &&
        later.date !== null &&
        areDatesWithinOneDay(earlier.date, later.date);
      const simMerchant = areMerchantsSimilar(earlier.merchant, later.merchant);

      const conflictingTime =
        Boolean(earlier.time?.trim() && later.time?.trim()) &&
        earlier.time!.trim() !== later.time!.trim();
      const conflictingCard =
        Boolean(earlier.card_last4?.trim() && later.card_last4?.trim()) &&
        earlier.card_last4!.trim() !== later.card_last4!.trim();

      const sameTimeOrDiffPhoto =
        !conflictingTime &&
        !conflictingCard &&
        (earlier.photo_index !== later.photo_index ||
          earlier.id !== later.id);

      if (
        sameAmount &&
        sameCurrency &&
        closeDate &&
        simMerchant &&
        sameTimeOrDiffPhoto
      ) {
        markDuplicatePair(
          earlier,
          later,
          `Same merchant, date, and total as row #${earlier.row}`
        );
      }
    }
  }

  return sortedRows;
}

export function clearResolvedModelFlags(
  flags: ReceiptFlag[] | undefined,
  field:
    | "merchant"
    | "date"
    | "currency"
    | "printed_total"
    | "handwritten_tip"
    | "final_total"
    | "tax"
): ReceiptFlag[] {
  if (!Array.isArray(flags) || flags.length === 0) return [];
  return flags.filter((f) => {
    const note = (f.note || "").toLowerCase();
    if (field === "merchant" && note.includes("merchant")) return false;
    if (field === "date" && note.includes("date")) return false;
    if (field === "currency" && note.includes("currency")) return false;
    if (
      (field === "printed_total" || field === "final_total") &&
      (note.includes("total") || note.includes("sum") || f.type === "tip_changes_total")
    ) {
      return false;
    }
    if (
      field === "handwritten_tip" &&
      (note.includes("tip") || note.includes("handwrit") || f.type === "tip_changes_total")
    ) {
      return false;
    }
    if (
      field === "tax" &&
      (note.includes("tax") || note.includes("vat") || note.includes("gst"))
    ) {
      return false;
    }
    return true;
  });
}

function getPrimaryFlagLabel(flags: ReceiptFlag[]): string | null {
  if (flags.length === 0) return null;
  const priority: Array<[ReceiptFlag["type"], string]> = [
    ["cross_source_duplicate", "Cross-source duplicate"],
    ["possible_duplicate", "Possible duplicate"],
    ["tip_changes_total", "Tip mismatch"],
    ["over_policy_limit", "Over policy cap"],
    ["missing_tax_invoice", "Missing tax ID"],
    ["foreign_currency", "Foreign currency"],
    ["unreadable_field", "Unreadable field"],
    ["low_confidence", "Low confidence"],
    ["not_a_receipt", "Not a receipt"],
  ];
  for (const [t, label] of priority) {
    if (flags.some((f) => f.type === t)) return label;
  }
  return "Needs review";
}

/**
 * Pure reconciliation engine: computes code-verified totals in integer minor units,
 * checks tip math, policy limits, missing tax IDs, duplicates, and foreign currency isolation.
 */
export function computeShoeboxEngine(
  rows: ReceiptRow[],
  totalPhotos: number,
  policy: SpendPolicy = DEFAULT_POLICY
): {
  computedRows: ComputedRow[];
  merchantTiles: MerchantTileData[];
  reconciliation: ReconciliationResult;
} {
  const currencySpend = new Map<string, number>();
  const currencyCount = new Map<string, number>();

  for (const r of rows) {
    if (r.excluded) continue;
    const code = (r.currency || "USD").toUpperCase().trim() || "USD";
    const rawTotal =
      r.printed_total !== null && r.handwritten_tip !== null && r.handwritten_tip > 0
        ? r.printed_total + r.handwritten_tip
        : r.final_total ?? r.printed_total ?? 0;
    currencySpend.set(code, (currencySpend.get(code) || 0) + Math.max(0, rawTotal));
    currencyCount.set(code, (currencyCount.get(code) || 0) + 1);
  }

  let mainCurrency =
    (rows.find((r) => r.currency && r.currency.trim())?.currency || "USD")
      .toUpperCase()
      .trim() || "USD";
  let maxCount = -1;
  let maxSpend = -1;

  for (const [code, count] of currencyCount.entries()) {
    const spend = currencySpend.get(code) || 0;
    if (count > maxCount || (count === maxCount && spend > maxSpend)) {
      maxCount = count;
      maxSpend = spend;
      mainCurrency = code;
    }
  }

  const CONFIDENCE_THRESHOLD = 0.85;

  const computedRows: ComputedRow[] = rows.map((row) => {
    const effectiveCurrency =
      (row.currency || mainCurrency).toUpperCase().trim() || mainCurrency;
    const isForeign = effectiveCurrency !== mainCurrency;
    const conf = row.confidence || {
      merchant: 1,
      date: 1,
      printed_total: 1,
      handwritten_tip: 1,
      currency: 1,
      tax: 1,
    };

    const codeFlags: ReceiptFlag[] = [];
    const modelFlags: ReceiptFlag[] = (row.flags || [])
      .filter((f) => f.source !== "code")
      .map((f) => ({ ...f, source: "model" as const }));

    // 1. Code-verified total + tip arithmetic check
    let codeCalculatedTotal = 0;
    let tipMismatch = false;
    if (
      row.printed_total !== null &&
      row.handwritten_tip !== null &&
      row.handwritten_tip > 0
    ) {
      const printedMinor = toMinorUnits(row.printed_total, effectiveCurrency);
      const tipMinor = toMinorUnits(row.handwritten_tip, effectiveCurrency);
      codeCalculatedTotal = fromMinorUnits(
        printedMinor + tipMinor,
        effectiveCurrency
      );
      if (row.final_total !== null) {
        const finalMinor = toMinorUnits(row.final_total, effectiveCurrency);
        if (Math.abs(printedMinor + tipMinor - finalMinor) > 1) {
          tipMismatch = true;
          codeFlags.push({
            type: "tip_changes_total",
            note: `Printed ${formatCurrencyAmount(
              row.printed_total,
              effectiveCurrency
            )} + tip ${formatCurrencyAmount(
              row.handwritten_tip,
              effectiveCurrency
            )} = ${formatCurrencyAmount(
              codeCalculatedTotal,
              effectiveCurrency
            )} (written total: ${formatCurrencyAmount(
              row.final_total,
              effectiveCurrency
            )})`,
            source: "code",
          });
        }
      }
    } else if (row.final_total !== null) {
      codeCalculatedTotal = fromMinorUnits(
        toMinorUnits(row.final_total, effectiveCurrency),
        effectiveCurrency
      );
    } else if (row.printed_total !== null) {
      codeCalculatedTotal = fromMinorUnits(
        toMinorUnits(row.printed_total, effectiveCurrency),
        effectiveCurrency
      );
    } else {
      codeFlags.push({
        type: "unreadable_field",
        note: "Receipt total is missing or unreadable",
        source: "code",
      });
    }

    // 2. Foreign currency check
    let convertedMainTotal: number | null = null;
    if (isForeign) {
      if (
        row.user_conversion_rate &&
        row.user_conversion_rate > 0 &&
        row.user_conversion_date?.trim()
      ) {
        convertedMainTotal = fromMinorUnits(
          toMinorUnits(codeCalculatedTotal * row.user_conversion_rate, mainCurrency),
          mainCurrency
        );
      } else {
        codeFlags.push({
          type: "foreign_currency",
          note: `Kept in ${effectiveCurrency}; not mixed into ${mainCurrency} total`,
          source: "code",
        });
      }
    }

    // 3. Duplicate checks
    if (row.duplicate_of) {
      const hasCross = (row.flags || []).some(
        (f) => f.type === "cross_source_duplicate"
      );
      if (hasCross) {
        codeFlags.push({
          type: "cross_source_duplicate",
          note: row.duplicate_reason || `Cross-source duplicate of #${row.duplicate_of}`,
          source: "code",
        });
      } else {
        codeFlags.push({
          type: "possible_duplicate",
          note: row.duplicate_reason || `Possible duplicate of row #${row.duplicate_of}`,
          source: "code",
        });
      }
    }

    // 4. Policy guardrail: single receipt cap (in main currency or converted)
    const comparableAmount = isForeign ? convertedMainTotal : codeCalculatedTotal;
    if (
      comparableAmount !== null &&
      policy.singleReceiptLimit > 0 &&
      comparableAmount > policy.singleReceiptLimit
    ) {
      codeFlags.push({
        type: "over_policy_limit",
        note: `Exceeds single-receipt policy cap of ${formatCurrencyAmount(
          policy.singleReceiptLimit,
          mainCurrency
        )}`,
        source: "code",
      });
    }

    // 5. Missing VAT / Tax Invoice ID above threshold
    if (
      comparableAmount !== null &&
      policy.requireTaxIdAbove > 0 &&
      comparableAmount >= policy.requireTaxIdAbove &&
      !row.tax_id_or_vat?.trim() &&
      row.is_tax_invoice !== true
    ) {
      codeFlags.push({
        type: "missing_tax_invoice",
        note: `Receipt ≥ ${formatCurrencyAmount(
          policy.requireTaxIdAbove,
          mainCurrency
        )} missing merchant Tax / VAT ID`,
        source: "code",
      });
    }

    // 6. Low confidence check on core fields
    if (
      conf.merchant < CONFIDENCE_THRESHOLD ||
      conf.printed_total < CONFIDENCE_THRESHOLD
    ) {
      if (!codeFlags.some((f) => f.type === "low_confidence")) {
        codeFlags.push({
          type: "low_confidence",
          note: "Verify merchant name and total against receipt proof",
          source: "code",
        });
      }
    }

    // Deduplicate flags by type
    const seenTypes = new Set<string>();
    const allFlags: ReceiptFlag[] = [];
    for (const f of [...codeFlags, ...modelFlags]) {
      if (!seenTypes.has(f.type)) {
        seenTypes.add(f.type);
        allFlags.push(f);
      }
    }

    const needsCheck = !row.excluded && !row.checked && allFlags.length > 0;

    return {
      ...row,
      code_calculated_total: codeCalculatedTotal,
      tip_mismatch: tipMismatch,
      effective_currency: effectiveCurrency,
      is_foreign: isForeign,
      converted_main_total: convertedMainTotal,
      all_flags: allFlags,
      needs_check: needsCheck,
      primary_flag_label: getPrimaryFlagLabel(allFlags),
    };
  });

  // Aggregate totals strictly in minor integer units
  let mainTotalCents = 0;
  const categoryTotalsCents: Record<ReceiptCategory, number> = {
    Meals: 0,
    Travel: 0,
    Lodging: 0,
    Office: 0,
    Other: 0,
  };
  const sourceCounts: Record<IngestionSourceType, number> = {
    manual_upload: 0,
    pasted_text: 0,
    manual_entry: 0,
    json_import: 0,
    sample_pile: 0,
  };
  const foreignMap = new Map<string, { totalCents: number; count: number }>();

  let includedCount = 0;
  let excludedCount = 0;
  let toCheckCount = 0;
  let crossSourceDuplicatesCount = 0;
  let missingTaxInvoiceCount = 0;
  let overPolicyCount = 0;

  for (const r of computedRows) {
    sourceCounts[getRowSourceType(r)] = (sourceCounts[getRowSourceType(r)] || 0) + 1;

    if (r.excluded) {
      excludedCount++;
      continue;
    }
    includedCount++;
    if (r.needs_check) toCheckCount++;
    if (r.all_flags.some((f) => f.type === "cross_source_duplicate")) {
      crossSourceDuplicatesCount++;
    }
    if (r.all_flags.some((f) => f.type === "missing_tax_invoice")) {
      missingTaxInvoiceCount++;
    }
    if (r.all_flags.some((f) => f.type === "over_policy_limit")) {
      overPolicyCount++;
    }

    const cat: ReceiptCategory = VALID_CATEGORIES.includes(r.category)
      ? r.category
      : "Other";

    if (!r.is_foreign) {
      const cents = toMinorUnits(r.code_calculated_total, mainCurrency);
      mainTotalCents += cents;
      categoryTotalsCents[cat] += cents;
    } else if (r.converted_main_total !== null) {
      const cents = toMinorUnits(r.converted_main_total, mainCurrency);
      mainTotalCents += cents;
      categoryTotalsCents[cat] += cents;
    } else {
      const fCents = toMinorUnits(r.code_calculated_total, r.effective_currency);
      const existing = foreignMap.get(r.effective_currency) || {
        totalCents: 0,
        count: 0,
      };
      existing.totalCents += fCents;
      existing.count += 1;
      foreignMap.set(r.effective_currency, existing);
    }
  }

  // Group included rows into Merchant Tiles (separating unconverted foreign currencies)
  const mainMerchantGroups = new Map<string, ComputedRow[]>();
  const foreignGroups = new Map<string, ComputedRow[]>();

  for (const r of computedRows) {
    if (r.excluded) continue;
    if (r.is_foreign && r.converted_main_total === null) {
      const key = `${normalizeMerchantName(r.merchant)}__${r.effective_currency}`;
      const list = foreignGroups.get(key) || [];
      list.push(r);
      foreignGroups.set(key, list);
    } else {
      const key = normalizeMerchantName(r.merchant);
      const list = mainMerchantGroups.get(key) || [];
      list.push(r);
      mainMerchantGroups.set(key, list);
    }
  }

  const merchantTiles: MerchantTileData[] = [];

  for (const [name, list] of mainMerchantGroups.entries()) {
    const totalCents = list.reduce((sum, r) => {
      const amt = r.is_foreign && r.converted_main_total !== null
        ? r.converted_main_total
        : r.code_calculated_total;
      return sum + toMinorUnits(amt, mainCurrency);
    }, 0);
    const sharePercent = mainTotalCents > 0 ? (totalCents / mainTotalCents) * 100 : 0;
    merchantTiles.push({
      id: `merchant-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      isForeign: false,
      isOtherGroup: false,
      currency: mainCurrency,
      totalCents,
      totalAmount: fromMinorUnits(totalCents, mainCurrency),
      sharePercent,
      receipts: list,
      flaggedCount: list.filter((r) => r.needs_check).length,
    });
  }

  for (const [key, list] of foreignGroups.entries()) {
    const [name, currency] = key.split("__");
    const totalCents = list.reduce(
      (sum, r) => sum + toMinorUnits(r.code_calculated_total, currency),
      0
    );
    merchantTiles.push({
      id: `foreign-${key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      isForeign: true,
      isOtherGroup: false,
      currency,
      totalCents,
      totalAmount: fromMinorUnits(totalCents, currency),
      sharePercent: 0,
      receipts: list,
      flaggedCount: list.filter((r) => r.needs_check).length,
    });
  }

  // Sort main tiles descending by spend, foreign tiles at end
  merchantTiles.sort((a, b) => {
    if (a.isForeign !== b.isForeign) return a.isForeign ? 1 : -1;
    return b.totalCents - a.totalCents;
  });

  // Reconciliation invariant check: sum of main merchant tiles must equal mainTotalCents and sum of categoryTotalsCents
  const sumTileCents = merchantTiles
    .filter((t) => !t.isForeign)
    .reduce((acc, t) => acc + t.totalCents, 0);
  const sumCategoryCents = Object.values(categoryTotalsCents).reduce(
    (acc, v) => acc + v,
    0
  );
  const reconciles =
    sumTileCents === mainTotalCents && sumCategoryCents === mainTotalCents;

  const foreignTotals = Array.from(foreignMap.entries()).map(([currency, info]) => ({
    currency,
    totalCents: info.totalCents,
    totalAmount: fromMinorUnits(info.totalCents, currency),
    count: info.count,
  }));

  return {
    computedRows,
    merchantTiles,
    reconciliation: {
      reconciles,
      failureReason: reconciles
        ? null
        : `Reconciliation mismatch: tiles=${sumTileCents}, categories=${sumCategoryCents}, total=${mainTotalCents}`,
      mainCurrency,
      mainTotalCents,
      mainTotalAmount: fromMinorUnits(mainTotalCents, mainCurrency),
      categoryTotalsCents,
      sourceCounts,
      crossSourceDuplicatesCount,
      missingTaxInvoiceCount,
      overPolicyCount,
      foreignTotals,
      receiptsFound: computedRows.length,
      includedCount,
      excludedCount,
      toCheckCount,
      totalPhotos: Math.max(totalPhotos, computedRows.length),
    },
  };
}

/**
 * Computes non-overlapping proportional treemap rectangles with graph coloring
 * so no two adjacent tiles share a color token.
 */
export function computeTreemapLayout(
  tiles: MerchantTileData[],
  hasLeftOpenTile = false
): PositionedTile[] {
  if (tiles.length === 0) return [];

  const mainSum = tiles
    .filter((t) => !t.isForeign)
    .reduce((acc, t) => acc + Math.max(1, t.totalCents), 0);

  const weighted = tiles.map((tile, rank) => {
    const rawWeight = tile.isForeign
      ? Math.max(mainSum * 0.14, 150)
      : Math.max(tile.totalCents, mainSum * 0.08, 100);
    return { tile, weight: rawWeight, rank };
  });

  interface RectNode {
    tile: MerchantTileData;
    weight: number;
    rank: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }

  function layoutHorizontalRow(
    items: typeof weighted,
    x: number,
    y: number,
    w: number,
    h: number
  ): RectNode[] {
    const totalW = items.reduce((acc, it) => acc + it.weight, 0) || 1;
    let curX = x;
    return items.map((it, idx) => {
      const tileW =
        idx === items.length - 1 ? x + w - curX : (it.weight / totalW) * w;
      const node: RectNode = { ...it, x: curX, y, w: tileW, h };
      curX += tileW;
      return node;
    });
  }

  function subdivideBinary(
    items: typeof weighted,
    x: number,
    y: number,
    w: number,
    h: number
  ): RectNode[] {
    if (items.length === 1) {
      return [{ ...items[0], x, y, w, h }];
    }
    const total = items.reduce((acc, it) => acc + it.weight, 0) || 1;
    let accum = 0;
    let splitIdx = 1;
    for (let i = 0; i < items.length - 1; i++) {
      accum += items[i].weight;
      splitIdx = i + 1;
      if (accum >= total * 0.45) break;
    }
    const first = items.slice(0, splitIdx);
    const second = items.slice(splitIdx);
    const ratio =
      first.reduce((acc, it) => acc + it.weight, 0) / total;

    if (w >= h) {
      const w1 = w * ratio;
      return [
        ...subdivideBinary(first, x, y, w1, h),
        ...subdivideBinary(second, x + w1, y, w - w1, h),
      ];
    } else {
      const h1 = h * ratio;
      return [
        ...subdivideBinary(first, x, y, w, h1),
        ...subdivideBinary(second, x, y + h1, w, h - h1),
      ];
    }
  }

  let nodes: RectNode[] = [];
  if (weighted.length === 1) {
    nodes = [{ ...weighted[0], x: 0, y: 0, w: 1, h: 1 }];
  } else if (weighted.length === 2) {
    nodes = layoutHorizontalRow(weighted, 0, 0, 1, 1);
  } else if (weighted.length <= 6) {
    const topCount = weighted.length <= 3 ? 1 : weighted.length <= 5 ? 2 : 3;
    const topGroup = weighted.slice(0, topCount);
    const bottomGroup = weighted.slice(topCount);
    const topWeight = topGroup.reduce((acc, it) => acc + it.weight, 0);
    const totalWeight = weighted.reduce((acc, it) => acc + it.weight, 0) || 1;
    const topH = Math.min(0.6, Math.max(0.46, topWeight / totalWeight));
    nodes = [
      ...layoutHorizontalRow(topGroup, 0, 0, 1, topH),
      ...layoutHorizontalRow(bottomGroup, 0, topH, 1, 1 - topH),
    ];
  } else {
    nodes = subdivideBinary(weighted, 0, 0, 1, 1);
  }

  // Graph coloring pass so no two adjacent rectangles share a colorToken
  const EPS = 0.002;
  function areRectsAdjacent(a: RectNode, b: RectNode): boolean {
    const touchX =
      Math.abs(a.x + a.w - b.x) < EPS || Math.abs(b.x + b.w - a.x) < EPS;
    const overlapY =
      Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > EPS;
    const touchY =
      Math.abs(a.y + a.h - b.y) < EPS || Math.abs(b.y + b.h - a.y) < EPS;
    const overlapX =
      Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > EPS;
    return (touchX && overlapY) || (touchY && overlapX);
  }

  const paletteOrder: TileColorToken[] = [
    "blue-700",
    "blue-500",
    "white",
    "blue-900",
  ];
  const assignedColors: TileColorToken[] = new Array(nodes.length);
  const adj: number[][] = Array.from({ length: nodes.length }, () => []);

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (areRectsAdjacent(nodes[i], nodes[j])) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  let steps = 0;
  function solveColoring(idx: number): boolean {
    if (idx === nodes.length) return true;
    if (++steps > 4000) return false;
    const node = nodes[idx];
    if (!hasLeftOpenTile && idx === 0) {
      assignedColors[0] = "blue-900";
      return solveColoring(1);
    }
    for (let k = 0; k < paletteOrder.length; k++) {
      const candidate = paletteOrder[(idx + k) % paletteOrder.length];
      if (hasLeftOpenTile && node.x < EPS && candidate === "blue-900") continue;
      let conflict = false;
      for (const nIdx of adj[idx]) {
        if (nIdx < idx && assignedColors[nIdx] === candidate) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        assignedColors[idx] = candidate;
        if (solveColoring(idx + 1)) return true;
      }
    }
    return false;
  }

  if (!solveColoring(0)) {
    for (let i = 0; i < nodes.length; i++) {
      if (!hasLeftOpenTile && i === 0) {
        assignedColors[0] = "blue-900";
        continue;
      }
      const forbidden = new Set<TileColorToken>();
      if (hasLeftOpenTile && nodes[i].x < EPS) forbidden.add("blue-900");
      for (const nIdx of adj[i]) {
        if (nIdx < i) forbidden.add(assignedColors[nIdx]);
      }
      assignedColors[i] =
        paletteOrder.find((c) => !forbidden.has(c)) ||
        paletteOrder[i % paletteOrder.length];
    }
  }

  return nodes.map((node, i) => ({
    ...node.tile,
    x: node.x,
    y: node.y,
    w: node.w,
    h: node.h,
    colorToken: assignedColors[i],
    rank: node.rank,
  }));
}

export function generateReceiptsCsv(rows: ComputedRow[]): string {
  const headers = [
    "Row",
    "Merchant",
    "Date",
    "Time",
    "Category",
    "Printed Total",
    "Handwritten Tip",
    "Printed Final Total",
    "Code Verified Total",
    "Currency",
    "Tax",
    "Tax Label",
    "Tax ID / VAT",
    "Card Last 4",
    "Duplicate Of Row",
    "Excluded",
    "Checked",
    "Cost Center",
    "Source",
    "Flags",
  ];

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.join(",")];
  for (const r of rows) {
    const flagsText = r.all_flags.map((f) => `${f.type}: ${f.note}`).join("; ");
    const rowValues = [
      r.row,
      r.merchant || "",
      r.date || "",
      r.time || "",
      r.category,
      r.printed_total ?? "",
      r.handwritten_tip ?? "",
      r.final_total ?? "",
      r.code_calculated_total,
      r.effective_currency,
      r.tax ?? "",
      r.tax_label || "",
      r.tax_id_or_vat || "",
      r.card_last4 || "",
      r.duplicate_of ?? "",
      r.excluded ? "Yes" : "No",
      r.checked ? "Yes" : "No",
      r.cost_center || "",
      formatSourceShort(r),
      flagsText,
    ];
    lines.push(rowValues.map(escapeCsv).join(","));
  }
  return lines.join("\n");
}
