// src/core/normalize.ts
import type { NormalizeInput, NormalizedDoc, SourceKind } from "./types";
import { detectFormat } from "./detect";
import { extractDocxWithMammoth } from "./docx";
import { extractPdfWithPdfParse } from "./pdf";
import { extractPdfOcrWithTesseract } from "./ocr";
import { heuristicsCleanup, segment, makeOffsetMapper, normalizeNumbersDatesCurrency } from "./text";

/** Pipeline principal */
export async function normalizeDocument(input: NormalizeInput): Promise<NormalizedDoc> {
  // 1) Determinar formato
  const guessed = detectFormat(input);

  // 2) Obtener texto bruto
  let raw = input.rawText ?? "";
  let detectedKind: SourceKind = "txt";

  if (!raw) {
    try {
      if (guessed === "docx") {
        raw = await extractDocxWithMammoth(input);
        detectedKind = "docx";
      } else {
        // intento PDF “text-based” primero
        raw = await extractPdfWithPdfParse(input);
        detectedKind = "pdf-text";
        if (!raw || raw.trim().length < 10) {
          // fallback a OCR
          raw = await extractPdfOcrWithTesseract(input);
          detectedKind = "pdf-ocr";
        }
      }
    } catch (e) {
      // Si el intento “pdf-text” falla, probamos OCR
      if (guessed.startsWith("pdf")) {
        try {
          raw = await extractPdfOcrWithTesseract(input);
          detectedKind = "pdf-ocr";
        } catch (e2) {
          throw new Error("No se pudo extraer texto del documento (PDF/OCR falló).");
        }
      } else {
        throw e;
      }
    }
  }

  // 3) Limpieza heurística
  let clean = heuristicsCleanup(raw);

  // 4) Normalizaciones semánticas livianas (números/fechas/moneda)
  clean = normalizeNumbersDatesCurrency(clean);

  // 5) Segmentación y mapeo de offsets
  const { paragraphs, indexMap } = segment(clean);
  const mapOffsets = makeOffsetMapper(clean, indexMap);

  return {
    kind: detectedKind,
    text: clean,
    paragraphs,
    mapOffsets,
    meta: {
      detectedFormat: detectedKind,
      language: "es",
      length: clean.length,
      paragraphCount: paragraphs.length,
      notes: [`from: ${guessed}`],
    },
  };
}
