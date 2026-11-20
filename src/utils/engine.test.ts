import test from "node:test";
import assert from "node:assert/strict";
import type { ReceiptRow } from "../types";
import {
  applyCodeVerifiedDuplicates,
  computeShoeboxEngine,
  computeTreemapLayout,
  DEFAULT_POLICY,
  formatCurrencyAmount,
  generateReceiptsCsv,
  normalizeMerchantName,
  toMinorUnits,
  fromMinorUnits,
} from "./engine";

function makeRow(overrides: Partial<ReceiptRow> = {}): ReceiptRow {
  return {
    id: `r-${Math.random().toString(36).slice(2)}`,
    row: 1,
    photo_index: 1,
    box_2d: [50, 50, 950, 950],
    merchant: "Starbucks Coffee",
    date: "2026-11-05",
    time: "08:15",
    item_count: 2,
    printed_total: 25.0,
    handwritten_tip: null,
    final_total: 25.0,
    currency: "USD",
    tax: 2.0,
    tax_label: "Sales Tax",
    tax_id_or_vat: "EIN 91-1325671",
    is_tax_invoice: true,
    category: "Meals",
    card_last4: "4821",
    confidence: {
      merchant: 0.98,
      date: 0.98,
      printed_total: 0.98,
      handwritten_tip: 1,
      currency: 0.99,
      tax: 0.95,
    },
    flags: [],
    excluded: false,
    checked: false,
    cost_center: "Operations",
    ...overrides,
  };
}

test("minor unit conversion handles 2-decimal and zero-decimal currencies accurately", () => {
  assert.equal(toMinorUnits(19.99, "USD"), 1999);
  assert.equal(fromMinorUnits(1999, "USD"), 19.99);
  assert.equal(toMinorUnits(48500, "JPY"), 48500);
  assert.equal(fromMinorUnits(48500, "JPY"), 48500);
  assert.equal(formatCurrencyAmount(48500, "JPY"), "¥48,500");
  assert.equal(formatCurrencyAmount(128.4, "USD"), "$128.40");
});

test("normalizeMerchantName cleans store numbers, legal suffixes, and uppercase text", () => {
  assert.equal(normalizeMerchantName("STARBUCKS COFFEE #04821"), "Starbucks Coffee");
  assert.equal(normalizeMerchantName("ACME SUPPLIES PTY LTD"), "Acme Supplies");
  assert.equal(normalizeMerchantName(null), "Unreadable merchant");
});

test("computeShoeboxEngine detects handwritten tip arithmetic mismatch and reconciles in code", () => {
  const rows = [
    makeRow({
      row: 1,
      merchant: "Verbena Kitchen",
      printed_total: 128.4,
      handwritten_tip: 24.0,
      final_total: 150.4, // $2 off from 152.40
    }),
  ];
  const { computedRows, reconciliation } = computeShoeboxEngine(rows, 1, DEFAULT_POLICY);
  assert.equal(computedRows[0].code_calculated_total, 152.4);
  assert.equal(computedRows[0].tip_mismatch, true);
  assert.equal(
    computedRows[0].all_flags.some((f) => f.type === "tip_changes_total"),
    true
  );
  assert.equal(reconciliation.mainTotalCents, 15240);
  assert.equal(reconciliation.reconciles, true);
});

test("computeShoeboxEngine isolates foreign currencies and applies optional rate + date conversion", () => {
  const rows = [
    makeRow({ row: 1, merchant: "Delta", printed_total: 200, final_total: 200, currency: "USD" }),
    makeRow({ row: 2, merchant: "Uber", printed_total: 50, final_total: 50, currency: "USD" }),
    makeRow({
      row: 3,
      merchant: "Hilton Tokyo",
      printed_total: 48500,
      final_total: 48500,
      currency: "JPY",
      category: "Lodging",
    }),
  ];

  const base = computeShoeboxEngine(rows, 3, DEFAULT_POLICY);
  assert.equal(base.reconciliation.mainCurrency, "USD");
  assert.equal(base.reconciliation.mainTotalAmount, 250);
  assert.equal(base.reconciliation.foreignTotals.length, 1);
  assert.equal(base.reconciliation.foreignTotals[0].currency, "JPY");
  assert.equal(base.reconciliation.foreignTotals[0].totalAmount, 48500);

  // Now supply user conversion rate + date -> folds cleanly into USD total
  rows[2].user_conversion_rate = 0.0066;
  rows[2].user_conversion_date = "2026-11-11";
  const converted = computeShoeboxEngine(rows, 3, DEFAULT_POLICY);
  assert.equal(converted.reconciliation.foreignTotals.length, 0);
  assert.equal(converted.computedRows[2].converted_main_total, 320.1);
  assert.equal(converted.reconciliation.mainTotalAmount, 570.1);
  assert.equal(converted.reconciliation.reconciles, true);
});

test("applyCodeVerifiedDuplicates catches cross-source duplicates deterministically", () => {
  const rows = [
    makeRow({
      row: 1,
      photo_index: 1,
      merchant: "Starbucks Coffee",
      date: "2026-11-05",
      printed_total: 33.5,
      final_total: 33.5,
      source_meta: { sourceType: "manual_upload", originLabel: "Photo Upload" },
    }),
    makeRow({
      row: 2,
      photo_index: 2,
      merchant: "STARBUCKS COFFEE #04821",
      date: "2026-11-05",
      printed_total: 33.5,
      final_total: 33.5,
      source_meta: { sourceType: "pasted_text", originLabel: "Email Copy" },
    }),
  ];

  const deduped = applyCodeVerifiedDuplicates(rows, []);
  assert.equal(deduped[0].duplicate_of, null);
  assert.equal(deduped[1].duplicate_of, 1);
  assert.equal(
    deduped[1].flags.some((f) => f.type === "cross_source_duplicate"),
    true
  );
});

test("computeShoeboxEngine flags receipts exceeding single-receipt policy cap and missing tax ID", () => {
  const rows = [
    makeRow({
      row: 1,
      merchant: "Luxury Charter",
      printed_total: 850,
      final_total: 850,
      tax_id_or_vat: null,
      is_tax_invoice: false,
    }),
  ];
  const { computedRows, reconciliation } = computeShoeboxEngine(rows, 1, {
    monthlyBudget: 2000,
    singleReceiptLimit: 500,
    requireTaxIdAbove: 100,
  });
  assert.equal(
    computedRows[0].all_flags.some((f) => f.type === "over_policy_limit"),
    true
  );
  assert.equal(
    computedRows[0].all_flags.some((f) => f.type === "missing_tax_invoice"),
    true
  );
  assert.equal(reconciliation.overPolicyCount, 1);
  assert.equal(reconciliation.missingTaxInvoiceCount, 1);
});

test("computeTreemapLayout produces full-coverage tiles with no adjacent color collisions", () => {
  const rows = [
    makeRow({ row: 1, merchant: "Delta", printed_total: 700, final_total: 700 }),
    makeRow({ row: 2, merchant: "Staples", printed_total: 300, final_total: 300 }),
    makeRow({ row: 3, merchant: "Verbena", printed_total: 150, final_total: 150 }),
    makeRow({ row: 4, merchant: "Uber", printed_total: 80, final_total: 80 }),
    makeRow({ row: 5, merchant: "Starbucks", printed_total: 40, final_total: 40 }),
  ];
  const { merchantTiles } = computeShoeboxEngine(rows, 5, DEFAULT_POLICY);
  const positioned = computeTreemapLayout(merchantTiles);
  assert.equal(positioned.length, 5);
  const totalArea = positioned.reduce((sum, t) => sum + t.w * t.h, 0);
  assert.ok(Math.abs(totalArea - 1) < 0.01);

  const EPS = 0.002;
  for (let i = 0; i < positioned.length; i++) {
    for (let j = i + 1; j < positioned.length; j++) {
      const a = positioned[i];
      const b = positioned[j];
      const touchX =
        Math.abs(a.x + a.w - b.x) < EPS || Math.abs(b.x + b.w - a.x) < EPS;
      const overlapY =
        Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > EPS;
      const touchY =
        Math.abs(a.y + a.h - b.y) < EPS || Math.abs(b.y + b.h - a.y) < EPS;
      const overlapX =
        Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > EPS;
      if ((touchX && overlapY) || (touchY && overlapX)) {
        assert.notEqual(a.colorToken, b.colorToken);
      }
    }
  }
});

test("generateReceiptsCsv escapes commas and quotes cleanly", () => {
  const rows = [
    makeRow({
      row: 1,
      merchant: 'Smith, Jones & "Partners"',
      printed_total: 42.5,
      final_total: 42.5,
    }),
  ];
  const { computedRows } = computeShoeboxEngine(rows, 1, DEFAULT_POLICY);
  const csv = generateReceiptsCsv(computedRows);
  assert.ok(csv.includes('"Smith, Jones & ""Partners"""'));
  assert.ok(csv.includes("42.5"));
});
