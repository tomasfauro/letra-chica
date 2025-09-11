// src/lib/pdf/parse.ts
import "server-only";
import { normalizeDocument } from "@/core/normalize";

/**
 * Mantiene la misma firma que usaba tu /api/upload.
 * Internamente usa el pipeline robusto de normalización.
 */
export async function parsePdf(buffer: Buffer): Promise<{
  text: string;
  meta: {
    info: any;
    nPages: number;
    version: string | null;
    likelyScanned: boolean;
  };
}> {
  const normalized = await normalizeDocument({
    buffer,
    filename: "document.pdf",
    mime: "application/pdf",
  });

  // Heurística de "escaneado": poco texto tras extracción → probablemente imagen
  const likelyScanned = normalized.kind === "pdf-ocr" || normalized.text.trim().length < 50;

  // Mapeo a la meta que ya usa tu UI (si no tenemos pages/version del parser original, dejamos valores neutros)
  return {
    text: normalized.text,
    meta: {
      info: {},            // si luego quieres, aquí puedes inyectar metadata de pdf-parse
      nPages: 0,           // si integras pdf-parse antes del normalize, puedes conservar data.numpages
      version: null,
      likelyScanned,
    },
  };
}
