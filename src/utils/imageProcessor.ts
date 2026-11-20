import type { UploadedPhoto } from "../types";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.84;

export function isSupportedUploadFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return (
    type.startsWith("image/") ||
    type === "application/pdf" ||
    type === "text/plain" ||
    type === "application/json" ||
    ["jpg", "jpeg", "png", "webp", "heic", "heif", "pdf", "txt", "json"].includes(
      ext
    )
  );
}

export function isTextOrJsonFile(file: File): "txt" | "json" | null {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext === "json" || file.type === "application/json") return "json";
  if (ext === "txt" || file.type === "text/plain") return "txt";
  return null;
}

export function isPdfFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return file.type === "application/pdf" || ext === "pdf";
}

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        const idx = reader.result.indexOf(",");
        resolve(idx !== -1 ? reader.result.slice(idx + 1) : reader.result);
      } else {
        reject(new Error("Failed to read file as base64"));
      }
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

async function ensureBrowserDecodableBlob(file: File): Promise<Blob> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    ext === "heic" ||
    ext === "heif"
  ) {
    const heicMod = await import("heic2any");
    const fn = heicMod.default || heicMod;
    const converted = await fn({
      blob: file,
      toType: "image/jpeg",
      quality: JPEG_QUALITY,
    });
    return Array.isArray(converted) ? converted[0] : converted;
  }
  return file;
}

export async function processPhotoInBrowser(
  photo: UploadedPhoto
): Promise<UploadedPhoto> {
  if (photo.base64Data && photo.width && photo.height) return photo;
  if (!photo.file) return photo;

  if (isPdfFile(photo.file)) {
    const base64Data = await readBlobAsBase64(photo.file);
    return {
      ...photo,
      base64Data,
      mimeType: "application/pdf",
      width: 900,
      height: 1200,
      byteSize: photo.file.size,
    };
  }

  const decodable = await ensureBrowserDecodableBlob(photo.file);
  const url = URL.createObjectURL(decodable);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Could not decode ${photo.name}`));
      el.src = url;
    });

    const origW = img.naturalWidth || 900;
    const origH = img.naturalHeight || 1200;
    let targetW = origW;
    let targetH = origH;
    if (origW > MAX_DIMENSION || origH > MAX_DIMENSION) {
      if (origW >= origH) {
        targetW = MAX_DIMENSION;
        targetH = Math.max(1, Math.round((origH * MAX_DIMENSION) / origW));
      } else {
        targetH = MAX_DIMENSION;
        targetW = Math.max(1, Math.round((origW * MAX_DIMENSION) / origH));
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const base64Data = dataUrl.split(",")[1] || "";
    return {
      ...photo,
      objectUrl: dataUrl,
      base64Data,
      mimeType: "image/jpeg",
      width: targetW,
      height: targetH,
      byteSize: Math.ceil((base64Data.length * 3) / 4),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function renderTextReceiptCanvas(
  merchant: string,
  rawText: string
): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 560;
  canvas.height = 700;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(52, 36, 456, 628);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 20px monospace";
  ctx.fillText((merchant || "TEXT RECEIPT").toUpperCase().slice(0, 30), 80, 86);

  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(80, 104);
  ctx.lineTo(480, 104);
  ctx.stroke();

  ctx.fillStyle = "#334155";
  ctx.font = "400 14px monospace";
  const lines = rawText.split(/\r?\n/).slice(0, 22);
  let y = 138;
  for (const line of lines) {
    ctx.fillText(line.slice(0, 44), 80, y);
    y += 23;
  }
  return canvas.toDataURL("image/png");
}
