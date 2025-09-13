// src/core/normalize.ts
import type { NormalizeInput, NormalizedDoc, SourceKind } from "./types";
import { detectFormat } from "./detect";
import { extractDocxWithMammoth } from "./docx";
import { extractPdfWithPdfParse } from "./pdf";
import { extractPdfOcrWithTesseract } from "./ocr";
import {
  heuristicsCleanup,
  segment,
  makeOffsetMapper,
  normalizeNumbersDatesCurrency,
  // 💡 utilidades recomendadas
  dehyphenate,
  fixQuotesDashesLigatures,
  collapseWhitespace,
  stripFrequentHeadersFooters,
} from "./text";

type ExtractFlags = {
  ocrTried?: boolean;
  ocrLang?: string;
  pdfTextTried?: boolean;
  docxTried?: boolean;
  notes?: string[];
};

const EXTRACT_TIMEOUT_MS = 45_000;   // evita cuelgues
const MAX_CHARS = 2_000_000;         // ~2 MB de texto

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
    p.then(v => { clearTimeout(id); resolve(v); }).catch(e => { clearTimeout(id); reject(e); });
  });
}

/** Pipeline principal */
export async function normalizeDocument(input: NormalizeInput): Promise<NormalizedDoc> {
  const guessed = detectFormat(input);

  let raw = input.rawText ?? "";
  let detectedKind: SourceKind = "txt";
  const flags: ExtractFlags = { notes: [`detect:${guessed}`] };

  // 1) Extracción
  if (!raw) {
    try {
      if (guessed === "docx") {
        flags.docxTried = true;
        raw = await withTimeout(extractDocxWithMammoth(input), EXTRACT_TIMEOUT_MS, "docx-extract");
        detectedKind = "docx";
      } else {
        // PDF text-based primero
        flags.pdfTextTried = true;
        raw = await withTimeout(extractPdfWithPdfParse(input), EXTRACT_TIMEOUT_MS, "pdf-text-extract");
        detectedKind = "pdf-text";
        if (!raw || raw.trim().length < 20) {
          // Fallback OCR
          const ocrLang = input.ocrLang ?? "spa";
          const ocrPsm  = input.ocrPsm  ?? 6;
          flags.ocrTried = true;
          flags.ocrLang = ocrLang;
          raw = await withTimeout(
            extractPdfOcrWithTesseract({ ...input, ocrLang, ocrPsm }),
            EXTRACT_TIMEOUT_MS,
            "pdf-ocr-extract"
          );
          detectedKind = "pdf-ocr";
        }
      }
    } catch (e) {
      // Segundo intento: si veníamos de PDF text, probar OCR explícito
      if (String(guessed).startsWith("pdf")) {
        try {
          const ocrLang = input.ocrLang ?? "spa";
          const ocrPsm  = input.ocrPsm  ?? 6;
          flags.ocrTried = true;
          flags.ocrLang = ocrLang;
          raw = await withTimeout(
            extractPdfOcrWithTesseract({ ...input, ocrLang, ocrPsm }),
            EXTRACT_TIMEOUT_MS,
            "pdf-ocr-extract"
          );
          detectedKind = "pdf-ocr";
        } catch (_e2) {
          throw new Error("No se pudo extraer texto del documento (PDF texto y OCR fallaron).");
        }
      } else {
        throw e;
      }
    }
  }

  if (!raw || raw.trim().length === 0) {
    throw new Error("Documento vacío o ilegible.");
  }

  // 2) Pre-limpieza básica y salvaguardas
  let clean = raw;
  clean = fixQuotesDashesLigatures(clean);     // comillas/guiones/ligaduras → formas canónicas
  clean = dehyphenate(clean);                  // “palabra-\nsiguiente” → “palabrasiguiente”
  clean = collapseWhitespace(clean);           // normaliza espacios y saltos

  // 3) Heurística de headers/footers repetidos
  clean = stripFrequentHeadersFooters(clean);

  // 4) Limpieza heurística específica + normalizaciones semánticas
  clean = heuristicsCleanup(clean);
  clean = normalizeNumbersDatesCurrency(clean);

  // 5) Protección por tamaño
  if (clean.length > MAX_CHARS) {
    flags.notes?.push(`truncated:${clean.length}->${MAX_CHARS}`);
    clean = clean.slice(0, MAX_CHARS);
  }

  // 6) Segmentación y mapeos
  // segment() debe devolver: { paragraphs, indexMap, reverseIndexMap, paragraphSpans }
  const { paragraphs, indexMap, reverseIndexMap, paragraphSpans } = segment(clean);

  // Mapper rangos clean -> raw / raw -> clean (opcionales para UI)
  const mapCleanToRaw = makeOffsetMapper(clean, indexMap);
  const mapRawToClean = makeOffsetMapper(raw, reverseIndexMap);

  // Cumple la firma de NormalizedDoc.mapOffsets: (absIndex) => { paragraphIndex, localIndex }
  function buildParagraphLocator(spans: Array<[number, number]>) {
    return (absIndex: number) => {
      // fuera de rango negativo
      if (absIndex < 0) return { paragraphIndex: 0, localIndex: 0 };
      for (let i = 0; i < spans.length; i++) {
        const [start, end] = spans[i];
        if (absIndex >= start && absIndex < end) {
          return { paragraphIndex: i, localIndex: absIndex - start };
        }
      }
      // fuera de rango superior → último párrafo
      const last = Math.max(0, spans.length - 1);
      const [s, e] = spans[last] ?? [0, 0];
      return { paragraphIndex: last, localIndex: Math.max(0, Math.min(absIndex - s, Math.max(0, e - s))) };
    };
  }

  const mapOffsets = buildParagraphLocator(paragraphSpans);

  return {
    kind: detectedKind,
    text: clean,
    paragraphs,
    paragraphSpans,
    mapOffsets,          // ✅ firma requerida
    mapCleanToRaw,       // opcional (útil para resaltar)
    mapRawToClean,       // opcional (útil para resaltar)
    meta: {
      detectedFormat: detectedKind,
      language: "es",
      length: clean.length,
      paragraphCount: paragraphs.length,
      notes: [
        ...(flags.notes ?? []),
        `docx:${!!flags.docxTried}`,
        `pdfText:${!!flags.pdfTextTried}`,
        `ocr:${!!flags.ocrTried}:${flags.ocrLang ?? "-"}`
      ],
    },
  };
}
