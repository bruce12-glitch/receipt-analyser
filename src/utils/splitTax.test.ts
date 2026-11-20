import test from "node:test";
import assert from "node:assert/strict";
import type { ReceiptRow } from "../types";
import { computeShoeboxEngine, DEFAULT_POLICY } from "./engine";
import {
  computeCostCenterBreakdown,
  computeEqualSplit,
  computeTaxBreakdown,
} from "./splitTax";

function makeRow(overrides: Partial<ReceiptRow> = {}): ReceiptRow {
  return {
    id: `r-${Math.random().toString(36).slice(2)}`,
    row: 1,
    photo_index: 1,
    box_2d: [50, 50, 950, 950],
    merchant: "Cafe",
    date: "2026-11-10",
    time: "09:00",
    item_count: 1,
    printed_total: 100,
    handwritten_tip: null,
    final_total: 100,
    currency: "USD",
    tax: 10,
    tax_label: "Sales Tax",
    tax_id_or_vat: "EIN 11-1111111",
    is_tax_invoice: true,
    category: "Meals",
    card_last4: "4821",
    confidence: {
      merchant: 0.99,
      date: 0.99,
      printed_total: 0.99,
      handwritten_tip: 1,
      currency: 0.99,
      tax: 0.99,
    },
    flags: [],
    excluded: false,
    checked: false,
    cost_center: "Operations",
    ...overrides,
  };
}

test("computeEqualSplit divides integer cents accurately with remainder tracking", () => {
  const res = computeEqualSplit(10000, 3, "USD");
  assert.equal(res.perPersonCents, 3333);
  assert.equal(res.perPersonAmount, 33.33);
  assert.equal(res.remainderCents, 1);
  assert.equal(res.perPersonCents * 3 + res.remainderCents, 10000);
});

test("computeTaxBreakdown aggregates main currency taxes and separates foreign taxes", () => {
  const rows = [
    makeRow({ row: 1, printed_total: 110, final_total: 110, tax: 10, tax_label: "Sales Tax", currency: "USD" }),
    makeRow({ row: 2, printed_total: 220, final_total: 220, tax: 20, tax_label: "Sales Tax", currency: "USD" }),
    makeRow({ row: 3, printed_total: 11000, final_total: 11000, tax: 1000, tax_label: "Consumption Tax", currency: "JPY" }),
  ];
  const { computedRows, reconciliation } = computeShoeboxEngine(rows, 3, DEFAULT_POLICY);
  const tax = computeTaxBreakdown(computedRows, reconciliation.mainCurrency);
  assert.equal(tax.totalMainTaxAmount, 30);
  assert.equal(Math.round(tax.effectiveTaxRatePct), 10);
  assert.equal(tax.byLabel.length, 2);
  assert.equal(tax.byLabel[0].currency, "USD");
  assert.equal(tax.byLabel[1].currency, "JPY");
});

test("computeCostCenterBreakdown totals spend accurately by cost center", () => {
  const rows = [
    makeRow({ row: 1, printed_total: 300, final_total: 300, cost_center: "Engineering" }),
    makeRow({ row: 2, printed_total: 100, final_total: 100, cost_center: "Client Delivery" }),
  ];
  const { computedRows, reconciliation } = computeShoeboxEngine(rows, 2, DEFAULT_POLICY);
  const breakdown = computeCostCenterBreakdown(computedRows, reconciliation.mainCurrency);
  assert.equal(breakdown.length, 2);
  assert.equal(breakdown[0].costCenter, "Engineering");
  assert.equal(breakdown[0].totalAmount, 300);
  assert.equal(breakdown[0].sharePercent, 75);
});
