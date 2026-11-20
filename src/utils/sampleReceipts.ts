import type { ReceiptRow, UploadedPhoto } from "../types";

interface SampleReceiptSpec {
  id: string;
  filename: string;
  merchant: string;
  address: string;
  date: string;
  time: string;
  items: Array<[string, string]>;
  subtotalLabel: string;
  printed_total: number;
  handwritten_tip: number | null;
  final_total: number;
  currency: string;
  tax: number;
  tax_label: string;
  tax_id_or_vat: string | null;
  is_tax_invoice: boolean;
  category: ReceiptRow["category"];
  card_last4: string;
  cost_center: string;
  originLabel: string;
  handwrittenNote?: string;
}

const SAMPLE_SPECS: SampleReceiptSpec[] = [
  {
    id: "sample-delta",
    filename: "delta_sfo_jfk_2026-11-04.png",
    merchant: "Delta Air Lines",
    address: "ATLANTA GA · E-TICKET 006239481022",
    date: "2026-11-04",
    time: "07:45",
    items: [
      ["SFO → JFK MAIN CABIN", "$618.00"],
      ["SEAT SELECTION 14C", "$49.00"],
      ["CARRIER IMPOSED TAX", "$71.40"],
    ],
    subtotalLabel: "TOTAL CHARGED",
    printed_total: 738.4,
    handwritten_tip: null,
    final_total: 738.4,
    currency: "USD",
    tax: 71.4,
    tax_label: "Federal Excise Tax",
    tax_id_or_vat: "EIN 58-0218548",
    is_tax_invoice: true,
    category: "Travel",
    card_last4: "4821",
    cost_center: "Client Delivery",
    originLabel: "Email Ticket",
  },
  {
    id: "sample-staples",
    filename: "staples_studio_supplies_2026-11-06.png",
    merchant: "Staples Business",
    address: "425 MISSION ST · SAN FRANCISCO CA",
    date: "2026-11-06",
    time: "14:18",
    items: [
      ["USB-C DOCKING STATION", "$189.00"],
      ["ARCHIVAL LEDGER BINDERS x4", "$54.00"],
      ["THERMAL LABEL ROLLS x6", "$42.50"],
      ["CA SALES TAX (8.625%)", "$24.62"],
    ],
    subtotalLabel: "TOTAL",
    printed_total: 310.12,
    handwritten_tip: null,
    final_total: 310.12,
    currency: "USD",
    tax: 24.62,
    tax_label: "Sales Tax",
    tax_id_or_vat: null,
    is_tax_invoice: false,
    category: "Office",
    card_last4: "4821",
    cost_center: "Engineering",
    originLabel: "Photo Upload",
  },
  {
    id: "sample-bistro",
    filename: "verbena_client_dinner_2026-11-08.png",
    merchant: "Verbena Kitchen & Bar",
    address: "2323 POLK ST · SAN FRANCISCO CA",
    date: "2026-11-08",
    time: "20:12",
    items: [
      ["ROASTED HALIBUT x2", "$86.00"],
      ["CHARRED BROCCOLINI", "$16.00"],
      ["SPARKLING WATER x2", "$14.00"],
      ["SF MANDATE + TAX", "$12.40"],
    ],
    subtotalLabel: "PRINTED TOTAL",
    printed_total: 128.4,
    handwritten_tip: 24.0,
    final_total: 150.4, // Intentionally $2 off from 128.40 + 24.00 = 152.40 to showcase code-verified tip audit!
    currency: "USD",
    tax: 12.4,
    tax_label: "Sales Tax",
    tax_id_or_vat: "CA-SR-994021",
    is_tax_invoice: true,
    category: "Meals",
    card_last4: "4821",
    cost_center: "Client Delivery",
    originLabel: "Photo Upload",
    handwrittenNote: "Tip: +$24.00   Total: $150.40",
  },
  {
    id: "sample-uber",
    filename: "uber_sfo_airport_2026-11-04.png",
    merchant: "Uber Trip",
    address: "SFO INTERNATIONAL TERMINAL → SOMA",
    date: "2026-11-04",
    time: "22:34",
    items: [
      ["UBER COMFORT FARE", "$56.20"],
      ["SFO AIRPORT SURCHARGE", "$5.50"],
      ["BOOKING FEE & TAX", "$6.80"],
    ],
    subtotalLabel: "TOTAL",
    printed_total: 68.5,
    handwritten_tip: 10.0,
    final_total: 78.5,
    currency: "USD",
    tax: 6.8,
    tax_label: "Local Tax",
    tax_id_or_vat: "EIN 45-2647441",
    is_tax_invoice: true,
    category: "Travel",
    card_last4: "4821",
    cost_center: "Client Delivery",
    originLabel: "Email Receipt",
  },
  {
    id: "sample-starbucks-1",
    filename: "starbucks_terminal_2026-11-05.png",
    merchant: "Starbucks Coffee",
    address: "STORE #04821 · TERMINAL 2 CONCOURSE",
    date: "2026-11-05",
    time: "08:15",
    items: [
      ["VENTI FLAT WHITE", "$6.45"],
      ["SPINACH FETA WRAP", "$5.95"],
      ["COLD BREW BOTTLES x4", "$18.40"],
      ["SALES TAX", "$2.70"],
    ],
    subtotalLabel: "TOTAL",
    printed_total: 33.5,
    handwritten_tip: null,
    final_total: 33.5,
    currency: "USD",
    tax: 2.7,
    tax_label: "Sales Tax",
    tax_id_or_vat: "EIN 91-1325671",
    is_tax_invoice: true,
    category: "Meals",
    card_last4: "4821",
    cost_center: "Operations",
    originLabel: "Photo Upload",
  },
  {
    id: "sample-starbucks-dup",
    filename: "starbucks_email_copy_2026-11-05.png",
    merchant: "STARBUCKS COFFEE #04821",
    address: "DIGITAL RECEIPT COPY · TERMINAL 2",
    date: "2026-11-05",
    time: "08:15",
    items: [
      ["VENTI FLAT WHITE", "$6.45"],
      ["SPINACH FETA WRAP", "$5.95"],
      ["COLD BREW BOTTLES x4", "$18.40"],
      ["SALES TAX", "$2.70"],
    ],
    subtotalLabel: "TOTAL",
    printed_total: 33.5,
    handwritten_tip: null,
    final_total: 33.5,
    currency: "USD",
    tax: 2.7,
    tax_label: "Sales Tax",
    tax_id_or_vat: "EIN 91-1325671",
    is_tax_invoice: true,
    category: "Meals",
    card_last4: "4821",
    cost_center: "Operations",
    originLabel: "Email Copy",
  },
  {
    id: "sample-hilton-tokyo",
    filename: "hilton_tokyo_2026-11-11.png",
    merchant: "Hilton Tokyo Shinjuku",
    address: "6-6-2 NISHI-SHINJUKU · TOKYO JAPAN",
    date: "2026-11-11",
    time: "10:05",
    items: [
      ["EXECUTIVE KING (2 NIGHTS)", "¥44,000"],
      ["CONSUMPTION TAX (10%)", "¥4,400"],
      ["TOKYO ACCOMMODATION TAX", "¥100"],
    ],
    subtotalLabel: "GRAND TOTAL JPY",
    printed_total: 48500,
    handwritten_tip: null,
    final_total: 48500,
    currency: "JPY",
    tax: 4500,
    tax_label: "Consumption Tax",
    tax_id_or_vat: "JP-T1011101048291",
    is_tax_invoice: true,
    category: "Lodging",
    card_last4: "9034",
    cost_center: "APAC Summit",
    originLabel: "Photo Upload",
  },
];

/**
 * Renders a crisp, realistic thermal paper receipt image onto an offscreen canvas
 * so Proof Inspector displays authentic receipt scans with zero external URLs.
 */
export function renderThermalReceiptDataUrl(spec: SampleReceiptSpec): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 560;
  canvas.height = 760;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Subtle architectural studio surface background
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle paper drop shadow
  ctx.fillStyle = "rgba(15, 23, 42, 0.14)";
  ctx.fillRect(62, 46, 444, 676);

  // Thermal receipt paper body
  ctx.fillStyle = "#fbfbfa";
  ctx.fillRect(56, 38, 448, 676);

  // Serrated thermal paper top & bottom edges
  ctx.fillStyle = "#e2e8f0";
  for (let x = 56; x < 504; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 38);
    ctx.lineTo(x + 8, 45);
    ctx.lineTo(x + 16, 38);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, 714);
    ctx.lineTo(x + 8, 707);
    ctx.lineTo(x + 16, 714);
    ctx.closePath();
    ctx.fill();
  }

  // Subtle receipt header ink
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.font = "700 24px monospace";
  ctx.fillText(spec.merchant.toUpperCase(), 280, 96);

  ctx.fillStyle = "#475569";
  ctx.font = "500 13px monospace";
  ctx.fillText(spec.address, 280, 122);
  ctx.fillText(`DATE: ${spec.date}   TIME: ${spec.time}`, 280, 146);

  // Dashed divider
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(84, 170);
  ctx.lineTo(476, 170);
  ctx.stroke();
  ctx.setLineDash([]);

  // Line items
  let y = 212;
  ctx.font = "500 15px monospace";
  for (const [label, price] of spec.items) {
    ctx.fillStyle = "#1e293b";
    ctx.textAlign = "left";
    ctx.fillText(label, 86, y);
    ctx.textAlign = "right";
    ctx.fillText(price, 474, y);
    y += 34;
  }

  // Divider before total
  y += 14;
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(84, y);
  ctx.lineTo(476, y);
  ctx.stroke();

  y += 38;
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 20px monospace";
  ctx.textAlign = "left";
  ctx.fillText(spec.subtotalLabel, 86, y);
  ctx.textAlign = "right";
  const sym = spec.currency === "JPY" ? "¥" : "$";
  const formattedPrinted =
    spec.currency === "JPY"
      ? `${sym}${spec.printed_total.toLocaleString("en-US")}`
      : `${sym}${spec.printed_total.toFixed(2)}`;
  ctx.fillText(formattedPrinted, 474, y);

  // Handwritten blue-pen tip annotation if present
  if (spec.handwrittenNote) {
    y += 56;
    ctx.save();
    ctx.translate(280, y);
    ctx.rotate(-0.03);
    ctx.fillStyle = "#0052ff";
    ctx.font = "italic 600 22px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(spec.handwrittenNote, 0, 0);
    ctx.restore();
    y += 14;
  }

  // Card & Tax ID footer
  y = Math.max(y + 52, 535);
  ctx.fillStyle = "#475569";
  ctx.font = "500 13px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`CARD: VISA **** ${spec.card_last4}`, 86, y);
  ctx.fillText(`COST CENTER: ${spec.cost_center.toUpperCase()}`, 86, y + 24);
  if (spec.tax_id_or_vat) {
    ctx.fillText(`TAX ID: ${spec.tax_id_or_vat}`, 86, y + 48);
  } else {
    ctx.fillStyle = "#b45309";
    ctx.fillText("TAX ID: NOT PRINTED ON SLIP", 86, y + 48);
  }

  // Crisp barcode graphic at bottom
  ctx.fillStyle = "#0f172a";
  let bx = 138;
  for (let i = 0; i < 48; i++) {
    const bw = (i * 7 + spec.merchant.length) % 3 === 0 ? 4 : 2;
    if (i % 2 === 0) {
      ctx.fillRect(bx, 636, bw, 44);
    }
    bx += bw + 3;
    if (bx > 420) break;
  }

  return canvas.toDataURL("image/png");
}

export function createSamplePile(): {
  photos: UploadedPhoto[];
  rows: ReceiptRow[];
} {
  const photos: UploadedPhoto[] = [];
  const rows: ReceiptRow[] = [];

  SAMPLE_SPECS.forEach((spec, idx) => {
    const photoIndex = idx + 1;
    const dataUrl = renderThermalReceiptDataUrl(spec);
    photos.push({
      id: spec.id,
      name: spec.filename,
      displayName: spec.merchant,
      objectUrl: dataUrl,
      globalIndex: photoIndex,
      status: "done",
      receiptsCount: 1,
      mimeType: "image/png",
      width: 560,
      height: 760,
      sourceMeta: {
        sourceType: "sample_pile",
        originLabel: spec.originLabel,
        costCenter: spec.cost_center,
      },
    });

    rows.push({
      id: `row-${spec.id}`,
      row: photoIndex,
      photo_index: photoIndex,
      box_2d: [50, 100, 940, 900],
      merchant: spec.merchant,
      date: spec.date,
      time: spec.time,
      item_count: spec.items.length,
      printed_total: spec.printed_total,
      handwritten_tip: spec.handwritten_tip,
      final_total: spec.final_total,
      currency: spec.currency,
      tax: spec.tax,
      tax_label: spec.tax_label,
      tax_id_or_vat: spec.tax_id_or_vat,
      is_tax_invoice: spec.is_tax_invoice,
      category: spec.category,
      card_last4: spec.card_last4,
      confidence: {
        merchant: 0.98,
        date: 0.99,
        printed_total: 0.98,
        handwritten_tip: spec.handwritten_tip ? 0.88 : 1,
        currency: 0.99,
        tax: 0.96,
      },
      flags: [],
      excluded: false,
      checked: false,
      cost_center: spec.cost_center,
      source_photo_id: spec.id,
      source_meta: {
        sourceType: "sample_pile",
        originLabel: spec.originLabel,
        costCenter: spec.cost_center,
      },
    });
  });

  return { photos, rows };
}

export const SAMPLE_PASTE_TEXT = `WHOLE FOODS MARKET #1042
399 4th St, San Francisco, CA
Date: 2026-11-14  12:42 PM
Organic Arabica Beans       $16.99
Sourdough Country Loaf       $7.50
Sparkling Mineral Water      $9.40
Prepared Lunch Bowls x2     $24.60
Subtotal: $58.49
Sales Tax: $5.04
Total: $63.53
VISA **** 4821
EIN 74-1989366`;
