import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_ID = "gemini-4-hydrogen";

const PLACEHOLDER_API_KEYS = new Set([
  "",
  "MY_GEMINI_API_KEY",
  "PLACEHOLDER_API_KEY",
  "YOUR_GEMINI_API_KEY",
  "YOUR_API_KEY",
]);

function getValidApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim() || "";
  if (!key || PLACEHOLDER_API_KEYS.has(key)) return null;
  return key;
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = getValidApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function parseJsonSafely<T>(rawText: string | undefined, fallback: T): T {
  if (!rawText) return fallback;
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

const READ_SYSTEM_INSTRUCTION = `You are a meticulous financial auditor reading photos and PDFs of receipts.
For every physical receipt visible in each image, locate it with box_2d = [ymin, xmin, ymax, xmax] normalized 0-1000 and extract exact structured fields:
- merchant: clean store/vendor name as printed
- date: YYYY-MM-DD if visible, else null
- time: HH:MM (24h) if visible, else null
- item_count: integer count of distinct line items if clear, else null
- printed_total: the machine-printed subtotal/total BEFORE any handwritten tip
- handwritten_tip: handwritten tip amount if written on the receipt, else null
- final_total: final printed or handwritten grand total
- currency: 3-letter ISO currency code (USD, EUR, GBP, JPY, CAD, AUD, NZD, etc.)
- tax: tax/VAT/GST amount if printed, else null
- tax_label: e.g. "Sales Tax", "VAT", "GST", or null
- tax_id_or_vat: merchant VAT/GST/EIN registration number if printed, else null
- is_tax_invoice: true if labeled Tax Invoice / VAT receipt or displays a tax ID, false if clearly a non-tax slip, else null
- category: one of "Meals", "Travel", "Lodging", "Office", "Other"
- card_last4: last 4 digits of payment card if printed, else null
- confidence: 0.0-1.0 confidence scores for merchant, date, printed_total, handwritten_tip, currency, tax
- flags: list of issues (tip_changes_total, unreadable_field, foreign_currency, missing_tax_invoice, low_confidence, not_a_receipt) with concise notes.
Do not invent numbers that are not printed or written on the receipt.`;

const READ_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    receipts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          photo_index: { type: Type.INTEGER },
          box_2d: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
          },
          merchant: { type: Type.STRING, nullable: true },
          date: { type: Type.STRING, nullable: true },
          time: { type: Type.STRING, nullable: true },
          item_count: { type: Type.INTEGER, nullable: true },
          printed_total: { type: Type.NUMBER, nullable: true },
          handwritten_tip: { type: Type.NUMBER, nullable: true },
          final_total: { type: Type.NUMBER, nullable: true },
          currency: { type: Type.STRING, nullable: true },
          tax: { type: Type.NUMBER, nullable: true },
          tax_label: { type: Type.STRING, nullable: true },
          tax_id_or_vat: { type: Type.STRING, nullable: true },
          is_tax_invoice: { type: Type.BOOLEAN, nullable: true },
          category: { type: Type.STRING },
          card_last4: { type: Type.STRING, nullable: true },
          confidence: {
            type: Type.OBJECT,
            properties: {
              merchant: { type: Type.NUMBER },
              date: { type: Type.NUMBER },
              printed_total: { type: Type.NUMBER },
              handwritten_tip: { type: Type.NUMBER },
              currency: { type: Type.NUMBER },
              tax: { type: Type.NUMBER },
            },
          },
          flags: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                note: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  },
};

const DUPLICATES_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    duplicates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          row: { type: Type.INTEGER },
          duplicate_of: { type: Type.INTEGER },
          reason: { type: Type.STRING },
        },
      },
    },
  },
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      aiConfigured: Boolean(getValidApiKey()),
      model: MODEL_ID,
    });
  });

  app.post("/api/read-receipts", async (req, res) => {
    try {
      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            "Server Gemini API key is not configured. Use client-side text parsing, manual entry, or configure GEMINI_API_KEY in Settings > Secrets.",
          code: "AI_NOT_CONFIGURED",
        });
        return;
      }

      const { photos } = req.body as {
        photos?: Array<{
          globalIndex: number;
          totalPhotos: number;
          mimeType: string;
          base64Data: string;
        }>;
      };

      if (!photos || !Array.isArray(photos) || photos.length === 0) {
        res.status(400).json({ error: "No photos provided in batch." });
        return;
      }

      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];

      const indexDescriptions = photos
        .map(
          (p, i) =>
            `Image ${i + 1} is Photo ${p.globalIndex} of ${p.totalPhotos} (set photo_index = ${p.globalIndex}).`
        )
        .join("\n");

      parts.push({
        text: `Examine the following ${photos.length} receipt photo(s).\n${indexDescriptions}\nFind every physical receipt, provide box_2d = [ymin, xmin, ymax, xmax] (0-1000), and extract all fields strictly matching the schema.`,
      });

      for (const photo of photos) {
        parts.push({
          text: `Photo ${photo.globalIndex} of ${photo.totalPhotos} (photo_index: ${photo.globalIndex}):`,
        });
        parts.push({
          inlineData: {
            mimeType: photo.mimeType || "image/jpeg",
            data: photo.base64Data,
          },
        });
      }

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: { parts },
        config: {
          systemInstruction: READ_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: READ_RESPONSE_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const parsed = parseJsonSafely<{ receipts: unknown[] }>(response.text, {
        receipts: [],
      });
      res.json(parsed);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to read receipts batch";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/check-duplicates", async (req, res) => {
    try {
      const ai = createGeminiClient();
      if (!ai) {
        res.json({ duplicates: [], mode: "client_deterministic" });
        return;
      }

      const { rows } = req.body as { rows?: unknown[] };
      if (!rows || !Array.isArray(rows) || rows.length < 2) {
        res.json({ duplicates: [] });
        return;
      }

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: `Identify likely duplicate transaction pairs in these extracted receipt rows. Always set "row" to the higher row number and "duplicate_of" to the lower row number.\n\n${JSON.stringify(
          rows,
          null,
          2
        )}`,
        config: {
          systemInstruction:
            "You are a financial bookkeeper identifying duplicate receipt submissions across manual uploads, pasted email receipts, and imported files. Only report pairs that are genuinely the same transaction.",
          responseMimeType: "application/json",
          responseSchema: DUPLICATES_RESPONSE_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const parsed = parseJsonSafely<{ duplicates: unknown[] }>(response.text, {
        duplicates: [],
      });
      res.json(parsed);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to check duplicates";
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Shoebox server running on http://localhost:${PORT}`);
  });
}

startServer();
