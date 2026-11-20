export type ReceiptCategory = "Meals" | "Travel" | "Lodging" | "Office" | "Other";

export type IngestionSourceType =
  | "manual_upload"
  | "pasted_text"
  | "manual_entry"
  | "json_import"
  | "sample_pile";

export interface SourceMeta {
  sourceType: IngestionSourceType;
  costCenter?: string;
  submittedBy?: string;
  originLabel?: string;
}

export type ReceiptFlagType =
  | "tip_changes_total"
  | "unreadable_field"
  | "foreign_currency"
  | "possible_duplicate"
  | "cross_source_duplicate"
  | "missing_tax_invoice"
  | "over_policy_limit"
  | "low_confidence"
  | "not_a_receipt";

export interface ReceiptFlag {
  type: ReceiptFlagType;
  note: string;
  source?: "model" | "code";
}

export interface ReceiptConfidence {
  merchant: number;
  date: number;
  printed_total: number;
  handwritten_tip: number;
  currency: number;
  tax: number;
}

export interface RawReceiptFromModel {
  photo_index: number;
  box_2d: number[];
  merchant: string | null;
  date: string | null;
  time: string | null;
  item_count: number | null;
  printed_total: number | null;
  handwritten_tip: number | null;
  final_total: number | null;
  currency: string | null;
  tax: number | null;
  tax_label: string | null;
  tax_id_or_vat?: string | null;
  is_tax_invoice?: boolean | null;
  category: string;
  card_last4: string | null;
  confidence: ReceiptConfidence;
  flags: ReceiptFlag[];
}

export interface ReceiptRow {
  id: string;
  row: number;
  photo_index: number;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  merchant: string | null;
  date: string | null;
  time: string | null;
  item_count: number | null;
  printed_total: number | null;
  handwritten_tip: number | null;
  final_total: number | null;
  currency: string | null;
  tax: number | null;
  tax_label: string | null;
  tax_id_or_vat?: string | null;
  is_tax_invoice?: boolean | null;
  category: ReceiptCategory;
  card_last4: string | null;
  confidence: ReceiptConfidence;
  flags: ReceiptFlag[];
  duplicate_of?: number | null;
  duplicate_reason?: string | null;
  excluded?: boolean;
  checked?: boolean;
  user_conversion_rate?: number | null;
  user_conversion_date?: string | null;
  source_meta?: SourceMeta;
  cost_center?: string;
  source_photo_id?: string;
  raw_text?: string;
}

export interface ComputedRow extends ReceiptRow {
  code_calculated_total: number;
  tip_mismatch: boolean;
  effective_currency: string;
  is_foreign: boolean;
  converted_main_total: number | null;
  all_flags: ReceiptFlag[];
  needs_check: boolean;
  primary_flag_label: string | null;
}

export interface MerchantTileData {
  id: string;
  name: string;
  isForeign: boolean;
  isOtherGroup: boolean;
  currency: string;
  totalCents: number;
  totalAmount: number;
  sharePercent: number;
  receipts: ComputedRow[];
  flaggedCount: number;
}

export type TileColorToken = "blue-900" | "blue-700" | "blue-500" | "white";

export interface PositionedTile extends MerchantTileData {
  x: number;
  y: number;
  w: number;
  h: number;
  colorToken: TileColorToken;
  rank: number;
}

export interface SpendPolicy {
  monthlyBudget: number;
  singleReceiptLimit: number;
  requireTaxIdAbove: number;
}

export interface ReconciliationResult {
  reconciles: boolean;
  failureReason: string | null;
  mainCurrency: string;
  mainTotalCents: number;
  mainTotalAmount: number;
  categoryTotalsCents: Record<ReceiptCategory, number>;
  sourceCounts: Record<IngestionSourceType, number>;
  crossSourceDuplicatesCount: number;
  missingTaxInvoiceCount: number;
  overPolicyCount: number;
  foreignTotals: Array<{
    currency: string;
    totalCents: number;
    totalAmount: number;
    count: number;
  }>;
  receiptsFound: number;
  includedCount: number;
  excludedCount: number;
  toCheckCount: number;
  totalPhotos: number;
}

export interface UploadedPhoto {
  id: string;
  file?: File;
  name: string;
  displayName: string;
  objectUrl: string;
  globalIndex: number;
  status: "queued" | "reading" | "done" | "error";
  receiptsCount: number;
  errorText?: string;
  base64Data?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  byteSize?: number;
  sourceMeta?: SourceMeta;
}

export type WorkspaceTab = "treemap" | "ledger" | "splittax" | "policy";
