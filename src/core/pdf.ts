// src/core/pdf.ts
import type { NormalizeInput } from "./types";
import pdfParse from "pdf-parse";

/** Intenta extraer texto de un PDF text-based */
export async function extractPdfWithPdfParse(input: NormalizeInput): Promise<string> {
  if (!input.buffer) throw new Error("PDF extractor: falta buffer");
  const buf = Buffer.isBuffer(input.buffer) ? input.buffer : Buffer.from(input.buffer as ArrayBuffer);
  const data = await pdfParse(buf);
  // data.text trae saltos y espacios; ya lo limpiaremos en cleanup
  return data.text || "";
}
