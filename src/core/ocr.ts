// src/core/ocr.ts
import type { NormalizeInput } from "./types";
import { createWorker } from "tesseract.js";

/** OCR completo del PDF (menos veloz, usar sólo como fallback) */
export async function extractPdfOcrWithTesseract(input: NormalizeInput): Promise<string> {
  if (!input.buffer) throw new Error("OCR extractor: falta buffer");
  const worker = await createWorker("spa"); // español; acepta "eng", "spa", etc.
  try {
    // Tesseract.js no lee PDFs directamente: hay dos caminos:
    // 1) Convertir PDF→ imágenes (páginas) usando pdfjs-dist o un conversor externo.
    // 2) Si ya tenés imágenes, iterar y concatenar.
    // Para simplificar, asumimos que te llega una imagen o ya convertiste fuera.
    // Si necesitás OCR de PDF “real”, implementa un convertidor PDF→PNG por página.

    // EJEMPLO: si 'buffer' ya es una imagen:
    const { data } = await worker.recognize(Buffer.from(input.buffer as ArrayBuffer));
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}
