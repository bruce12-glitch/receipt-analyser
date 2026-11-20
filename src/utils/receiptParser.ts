import type { RawReceiptFromModel, ReceiptCategory, ReceiptRow } from "../types";

const CATEGORY_KEYWORDS: Array<[ReceiptCategory, RegExp]> = [
  [
    "Lodging",
    /\b(hotel|hilton|marriott|hyatt|airbnb|inn|resort|suites|lodge|motel)\b/i,
  ],
  [
    "Travel",
    /\b(airline|delta|united|american air|uber|lyft|taxi|cab|train|rail|amtrak|parking|shell|chevron|exxon|fuel|gas|flight|transit|metro)\b/i,
  ],
  [
    "Meals",
    /\b(coffee|starbucks|cafe|bistro|restaurant|grill|kitchen|pizza|sushi|burger|bakery|diner|bar|whole foods|trader joe|market|lunch|dinner|deli|blue bottle)\b/i,
  ],
  [
    "Office",
    /\b(staples|office depot|apple store|amazon|aws|github|figma|notion|adobe|hardware|supplies|printing|fedex|ups|postage|stationery)\b/i,
  ],
];

export function inferCategory(text: string): ReceiptCategory {
  for (const [cat, regex] of CATEGORY_KEYWORDS) {
    if (regex.test(text)) return cat;
  }
  return "Other";
}

function detectCurrency(text: string): string {
  const isoMatch = /\b(USD|EUR|GBP|JPY|CAD|AUD|NZD|CHF|SGD|INR)\b/.exec(text);
  if (isoMatch) return isoMatch[1].toUpperCase();
  if (text.includes("¥") || text.includes("￥")) return "JPY";
  if (text.includes("€")) return "EUR";
  if (text.includes("£")) return "GBP";
  if (text.includes("₹")) return "INR";
  return "USD";
}

function extractMoneyAfterLabel(text: string, labelPattern: RegExp): number | null {
  const match = labelPattern.exec(text);
  if (!match || !match[1]) return null;
  const cleaned = match[1].replace(/,/g, "");
  const val = parseFloat(cleaned);
  return Number.isFinite(val) ? val : null;
}

function normalizeParsedDate(raw: string): string | null {
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(raw);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }
  const mdy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/.exec(raw);
  if (mdy) {
    const year = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
    const p1 = parseInt(mdy[1], 10);
    const p2 = parseInt(mdy[2], 10);
    // Treat as MM/DD/YYYY unless first part > 12
    const month = p1 > 12 ? p2 : p1;
    const day = p1 > 12 ? p1 : p2;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}

/**
 * Pure TypeScript receipt text parser — works 100% client-side on GitHub Pages
 * and offline for pasted email receipts, SMS receipts, and uploaded .txt slips.
 */
export function parseReceiptText(
  rawText: string,
  photoIndex = 1
): RawReceiptFromModel {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const currency = detectCurrency(rawText);

  // Merchant: first non-boilerplate header line
  let merchant: string | null = null;
  for (const line of lines.slice(0, 6)) {
    if (
      /^(receipt|tax invoice|invoice|order|date|time|tel|phone|www\.|http)/i.test(
        line
      )
    ) {
      continue;
    }
    if (/^\d{2,4}[-/]\d{1,2}[-/]\d{1,4}/.test(line)) continue;
    merchant = line.replace(/\s{2,}.*$/, "").slice(0, 64).trim();
    break;
  }

  // Explicit Merchant: label overrides heuristic
  const explicitMerchant = /^\s*(?:merchant|vendor|store|from)\s*:\s*(.+)$/im.exec(
    rawText
  );
  if (explicitMerchant?.[1]) {
    merchant = explicitMerchant[1].trim();
  }

  // Date extraction
  let date: string | null = null;
  const dateMatch =
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/.exec(rawText);
  if (dateMatch?.[1]) {
    date = normalizeParsedDate(dateMatch[1]);
  }

  // Time extraction
  let time: string | null = null;
  const timeMatch = /\b(\d{1,2}:\d{2})(?:\s*(AM|PM))?\b/i.exec(rawText);
  if (timeMatch?.[1]) {
    let [hStr, mStr] = timeMatch[1].split(":");
    let h = parseInt(hStr, 10);
    const meridiem = timeMatch[2]?.toUpperCase();
    if (meridiem === "PM" && h < 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    time = `${String(h).padStart(2, "0")}:${mStr}`;
  }

  const tax = extractMoneyAfterLabel(
    rawText,
    /(?:sales\s*tax|vat|gst|tax)\s*(?:\([^)]*\))?\s*[:=]?\s*[$€£¥₹]?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i
  );

  const taxLabelMatch = /\b(Sales Tax|VAT|GST|HST|PST|Tax)\b/i.exec(rawText);
  const tax_label = taxLabelMatch ? taxLabelMatch[1] : null;

  const tip = extractMoneyAfterLabel(
    rawText,
    /(?:handwritten\s*tip|gratuity|tip)\s*[:=]?\s*[$€£¥₹]?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i
  );

  const subtotal = extractMoneyAfterLabel(
    rawText,
    /(?:sub\s*-?\s*total|printed\s*total)\s*[:=]?\s*[$€£¥₹]?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i
  );

  const finalTotal = extractMoneyAfterLabel(
    rawText,
    /(?:^|[\s\n])(?:grand\s*total|amount\s*due|balance\s*due|total\s*charged|total)\s*[:=]?\s*[$€£¥₹]?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/im
  );

  let printed_total = subtotal;
  let final_total = finalTotal;

  // If no explicit subtotal/total labels found, pick largest monetary value in text
  if (printed_total === null && final_total === null) {
    const moneyMatches = Array.from(
      rawText.matchAll(/[$€£¥₹]\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g)
    )
      .map((m) => parseFloat(m[1].replace(/,/g, "")))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (moneyMatches.length > 0) {
      final_total = Math.max(...moneyMatches);
    }
  }

  if (printed_total === null && final_total !== null) {
    printed_total =
      tip !== null && final_total > tip
        ? Number((final_total - tip).toFixed(2))
        : final_total;
  } else if (printed_total !== null && final_total === null) {
    const withTax = tax !== null ? printed_total + tax : printed_total;
    final_total = Number((withTax + (tip ?? 0)).toFixed(2));
    printed_total = Number(withTax.toFixed(2));
  }

  // Card last 4
  const cardMatch =
    /(?:visa|mastercard|amex|card|ending\s*in|\*{2,4}|x{2,4})[\s-]*(\d{4})\b/i.exec(
      rawText
    );
  const card_last4 = cardMatch?.[1] || null;

  // Tax ID / VAT
  const taxIdMatch =
    /(?:vat|gst|ein|tax\s*id|abn|tin)\s*(?:no\.?|#|id)?\s*[:=]?\s*([A-Z0-9-]{6,20})/i.exec(
      rawText
    );
  const tax_id_or_vat = taxIdMatch?.[1] || null;
  const is_tax_invoice = Boolean(
    tax_id_or_vat || /\btax\s+invoice\b/i.test(rawText)
  );

  // Estimate item count from lines containing prices (excluding summary lines)
  const itemLines = lines.filter(
    (l) =>
      /[$€£¥₹]?\s*\d+\.\d{2}\s*$/.test(l) &&
      !/\b(subtotal|sub-total|tax|vat|gst|tip|total|change|balance|due|visa|card)\b/i.test(
        l
      )
  );

  const category = inferCategory(`${merchant || ""} ${rawText}`);

  return {
    photo_index: photoIndex,
    box_2d: [60, 120, 940, 880],
    merchant,
    date: date || new Date().toISOString().slice(0, 10),
    time,
    item_count: itemLines.length > 0 ? itemLines.length : null,
    printed_total,
    handwritten_tip: tip,
    final_total,
    currency,
    tax,
    tax_label,
    tax_id_or_vat,
    is_tax_invoice,
    category,
    card_last4,
    confidence: {
      merchant: merchant ? 0.94 : 0.4,
      date: date ? 0.95 : 0.6,
      printed_total: printed_total !== null ? 0.96 : 0.35,
      handwritten_tip: tip !== null ? 0.92 : 1,
      currency: 0.98,
      tax: tax !== null ? 0.95 : 0.9,
    },
    flags:
      printed_total === null && final_total === null
        ? [
            {
              type: "unreadable_field",
              note: "Could not detect a monetary total in the receipt text",
            },
          ]
        : [],
  };
}

export interface ParsedBatchItem {
  rawText: string;
  receipt: RawReceiptFromModel;
}

function isQuickExpenseLine(line: string): boolean {
  if (line.length > 140) return false;
  if (
    /^(subtotal|sub-total|tax|sales tax|vat|gst|tip|gratuity|total|grand total|balance|change|visa|mastercard|amex|card|date|time|receipt|invoice)\b/i.test(
      line
    )
  ) {
    return false;
  }
  return /([$€£¥₹]\s*\d+(?:,\d{3})*(?:\.\d{1,2})?|\b\d+(?:,\d{3})*\.\d{2}\b)/.test(
    line
  );
}

function parseQuickExpenseLine(
  line: string,
  photoIndex: number
): RawReceiptFromModel {
  const currency = detectCurrency(line);
  const dateMatch =
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/.exec(line);
  const date = dateMatch ? normalizeParsedDate(dateMatch[1]) : null;

  const moneyMatch =
    /[$€£¥₹]\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)|\b([0-9]+(?:,[0-9]{3})*\.[0-9]{2})\b/.exec(
      line
    );
  const amountStr = moneyMatch?.[1] || moneyMatch?.[2] || "";
  const amount = amountStr ? parseFloat(amountStr.replace(/,/g, "")) : null;

  let merchant = line;
  if (dateMatch) merchant = merchant.replace(dateMatch[0], " ");
  if (moneyMatch) merchant = merchant.replace(moneyMatch[0], " ");
  merchant = merchant
    .replace(/\b(USD|EUR|GBP|JPY|CAD|AUD|NZD|CHF|SGD|INR)\b/gi, " ")
    .replace(/^[-•*:\s]+|[-•*:\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const finalMerchant = merchant || `Expense #${photoIndex}`;
  return {
    photo_index: photoIndex,
    box_2d: [60, 120, 940, 880],
    merchant: finalMerchant,
    date: date || new Date().toISOString().slice(0, 10),
    time: null,
    item_count: 1,
    printed_total: amount,
    handwritten_tip: null,
    final_total: amount,
    currency,
    tax: null,
    tax_label: null,
    tax_id_or_vat: null,
    is_tax_invoice: null,
    category: inferCategory(finalMerchant),
    card_last4: null,
    confidence: {
      merchant: merchant ? 0.95 : 0.6,
      date: date ? 0.95 : 0.7,
      printed_total: amount !== null ? 0.98 : 0.4,
      handwritten_tip: 1,
      currency: 0.98,
      tax: 0.9,
    },
    flags: [],
  };
}

/**
 * Parses one receipt, multiple receipts separated by `---` / `===`, or a list of
 * quick one-line expenses (e.g. "Blue Bottle Coffee $14.50 2026-11-12").
 */
export function parseReceiptBatch(
  rawText: string,
  startPhotoIndex = 1
): ParsedBatchItem[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // 1. Explicit multi-receipt blocks separated by --- or ===
  const explicitBlocks = trimmed
    .split(/\r?\n\s*(?:---+|\*\*\*+|===+)\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (explicitBlocks.length > 1) {
    return explicitBlocks.map((block, idx) => ({
      rawText: block,
      receipt: parseReceiptText(block, startPhotoIndex + idx),
    }));
  }

  // 2. Quick expense list: every non-empty line looks like "<Merchant> <Amount>"
  // and there are no receipt summary keywords like Subtotal/Total/Tax.
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const hasReceiptStructure =
    /\b(subtotal|sub-total|sales\s*tax|total\s*:|grand\s*total|balance\s*due|receipt|invoice)\b/i.test(
      trimmed
    );

  if (
    lines.length >= 2 &&
    !hasReceiptStructure &&
    lines.every((l) => isQuickExpenseLine(l))
  ) {
    return lines.map((line, idx) => ({
      rawText: line,
      receipt: parseQuickExpenseLine(line, startPhotoIndex + idx),
    }));
  }

  return [
    {
      rawText: trimmed,
      receipt: parseReceiptText(trimmed, startPhotoIndex),
    },
  ];
}

/**
 * Fallback metadata parser when a photo is added without a vision backend.
 * Pulls hints from the filename and marks the row for side-by-side review.
 */
export function buildClientImagePlaceholderReceipt(
  filename: string,
  photoIndex: number
): RawReceiptFromModel {
  const base = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();

  const amountMatch = /(?:\$|usd|eur|gbp)?\s*(\d+(?:\.\d{2}))/i.exec(base);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
  const dateMatch = /(\d{4}-\d{2}-\d{2})/.exec(base);

  const cleanedMerchant = base
    .replace(/\d{4}-\d{2}-\d{2}/g, "")
    .replace(/\b\d+(?:\.\d{2})\b/g, "")
    .replace(/\b(receipt|img|scan|photo|invoice)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const merchant = cleanedMerchant || `Receipt #${photoIndex}`;
  return {
    photo_index: photoIndex,
    box_2d: [50, 80, 950, 920],
    merchant,
    date: dateMatch?.[1] || new Date().toISOString().slice(0, 10),
    time: null,
    item_count: null,
    printed_total: amount,
    handwritten_tip: null,
    final_total: amount,
    currency: detectCurrency(base),
    tax: null,
    tax_label: null,
    tax_id_or_vat: null,
    is_tax_invoice: null,
    category: inferCategory(merchant),
    card_last4: null,
    confidence: {
      merchant: cleanedMerchant ? 0.78 : 0.5,
      date: dateMatch ? 0.9 : 0.65,
      printed_total: amount !== null ? 0.8 : 0.3,
      handwritten_tip: 1,
      currency: 0.9,
      tax: 0.8,
    },
    flags: [
      {
        type: "low_confidence",
        note: "Check merchant and total against the receipt photo on the left",
      },
    ],
  };
}

/**
 * Parses an exported Shoebox JSON backup back into ReceiptRow[].
 */
export function parseImportedJsonReceipts(jsonText: string): ReceiptRow[] {
  const parsed = JSON.parse(jsonText);
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.rows)
    ? parsed.rows
    : [];

  return list
    .filter((item: unknown): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object")
    )
    .map((item: Record<string, unknown>, idx: number) => ({
      id: typeof item.id === "string" ? item.id : `imported-${Date.now()}-${idx}`,
      row: idx + 1,
      photo_index:
        typeof item.photo_index === "number" ? item.photo_index : idx + 1,
      box_2d:
        Array.isArray(item.box_2d) && item.box_2d.length === 4
          ? (item.box_2d as [number, number, number, number])
          : [60, 100, 940, 900],
      merchant: typeof item.merchant === "string" ? item.merchant : null,
      date: typeof item.date === "string" ? item.date : null,
      time: typeof item.time === "string" ? item.time : null,
      item_count: typeof item.item_count === "number" ? item.item_count : null,
      printed_total:
        typeof item.printed_total === "number" ? item.printed_total : null,
      handwritten_tip:
        typeof item.handwritten_tip === "number" ? item.handwritten_tip : null,
      final_total:
        typeof item.final_total === "number" ? item.final_total : null,
      currency: typeof item.currency === "string" ? item.currency : "USD",
      tax: typeof item.tax === "number" ? item.tax : null,
      tax_label: typeof item.tax_label === "string" ? item.tax_label : null,
      tax_id_or_vat:
        typeof item.tax_id_or_vat === "string" ? item.tax_id_or_vat : null,
      is_tax_invoice:
        typeof item.is_tax_invoice === "boolean" ? item.is_tax_invoice : null,
      category: (["Meals", "Travel", "Lodging", "Office", "Other"].includes(
        String(item.category)
      )
        ? item.category
        : "Other") as ReceiptCategory,
      card_last4: typeof item.card_last4 === "string" ? item.card_last4 : null,
      confidence: {
        merchant: 0.95,
        date: 0.95,
        printed_total: 0.95,
        handwritten_tip: 0.95,
        currency: 0.95,
        tax: 0.95,
      },
      flags: Array.isArray(item.flags) ? item.flags : [],
      excluded: Boolean(item.excluded),
      checked: Boolean(item.checked),
      cost_center:
        typeof item.cost_center === "string" ? item.cost_center : "Operations",
      source_meta: {
        sourceType: "json_import",
        originLabel: "JSON Backup",
      },
    }));
}
