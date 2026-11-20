import test from "node:test";
import assert from "node:assert/strict";
import {
  inferCategory,
  parseImportedJsonReceipts,
  parseReceiptBatch,
  parseReceiptText,
} from "./receiptParser";

test("parseReceiptText extracts merchant, date, time, tax, tip, total, card, and VAT ID", () => {
  const sample = `WHOLE FOODS MARKET #1042
399 4th St, San Francisco, CA
Date: 2026-11-14  12:42 PM
Organic Arabica Beans       $16.99
Sourdough Country Loaf       $7.50
Subtotal: $58.49
Sales Tax: $5.04
Total: $63.53
VISA **** 4821
EIN 74-1989366`;

  const parsed = parseReceiptText(sample, 1);
  assert.equal(parsed.merchant, "WHOLE FOODS MARKET #1042");
  assert.equal(parsed.date, "2026-11-14");
  assert.equal(parsed.time, "12:42");
  assert.equal(parsed.currency, "USD");
  assert.equal(parsed.tax, 5.04);
  assert.equal(parsed.final_total, 63.53);
  assert.equal(parsed.card_last4, "4821");
  assert.equal(parsed.tax_id_or_vat, "74-1989366");
  assert.equal(parsed.is_tax_invoice, true);
  assert.equal(parsed.category, "Meals");
});

test("parseReceiptText handles foreign currencies and handwritten tip", () => {
  const sample = `HILTON TOKYO SHINJUKU
Date: 2026-11-11 10:05
Room Charge ¥44,000
Consumption Tax: ¥4,500
Grand Total: ¥48,500`;

  const parsed = parseReceiptText(sample, 2);
  assert.equal(parsed.currency, "JPY");
  assert.equal(parsed.final_total, 48500);
  assert.equal(parsed.tax, 4500);
  assert.equal(parsed.category, "Lodging");
});

test("inferCategory classifies common merchants accurately", () => {
  assert.equal(inferCategory("Delta Air Lines SFO-JFK"), "Travel");
  assert.equal(inferCategory("Staples Office Supplies"), "Office");
  assert.equal(inferCategory("Marriott Marquis"), "Lodging");
  assert.equal(inferCategory("Blue Bottle Coffee"), "Meals");
  assert.equal(inferCategory("General Municipal Fee"), "Other");
});

test("parseImportedJsonReceipts restores exported ledger JSON", () => {
  const payload = JSON.stringify({
    rows: [
      {
        id: "r-1",
        merchant: "GitHub Enterprise",
        date: "2026-11-01",
        printed_total: 84,
        final_total: 84,
        currency: "USD",
        category: "Office",
        checked: true,
      },
    ],
  });
  const rows = parseImportedJsonReceipts(payload);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].merchant, "GitHub Enterprise");
  assert.equal(rows[0].final_total, 84);
  assert.equal(rows[0].checked, true);
  assert.equal(rows[0].category, "Office");
});

test("parseReceiptBatch splits multiple receipts separated by ---", () => {
  const batch = `BLUE BOTTLE COFFEE
Date: 2026-11-10
Total: $14.50
---
UBER TRIP
Date: 2026-11-11
Total: $38.20`;

  const items = parseReceiptBatch(batch, 1);
  assert.equal(items.length, 2);
  assert.equal(items[0].receipt.merchant, "BLUE BOTTLE COFFEE");
  assert.equal(items[0].receipt.final_total, 14.5);
  assert.equal(items[0].receipt.category, "Meals");
  assert.equal(items[1].receipt.merchant, "UBER TRIP");
  assert.equal(items[1].receipt.final_total, 38.2);
  assert.equal(items[1].receipt.category, "Travel");
});

test("parseReceiptBatch parses quick single-line expense lists", () => {
  const lines = `Blue Bottle Coffee $14.50 2026-11-10
Uber to Airport $38.20 2026-11-11
Staples Printer Paper $62.00`;

  const items = parseReceiptBatch(lines, 1);
  assert.equal(items.length, 3);
  assert.equal(items[0].receipt.merchant, "Blue Bottle Coffee");
  assert.equal(items[0].receipt.final_total, 14.5);
  assert.equal(items[0].receipt.date, "2026-11-10");
  assert.equal(items[1].receipt.merchant, "Uber to Airport");
  assert.equal(items[1].receipt.final_total, 38.2);
  assert.equal(items[1].receipt.category, "Travel");
  assert.equal(items[2].receipt.merchant, "Staples Printer Paper");
  assert.equal(items[2].receipt.final_total, 62);
  assert.equal(items[2].receipt.category, "Office");
});
