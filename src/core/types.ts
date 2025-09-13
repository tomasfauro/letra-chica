// src/core/types.ts
export type SourceKind = "docx" | "pdf-text" | "pdf-ocr" | "txt";

export interface NormalizeInput {
  /** Buffer del archivo o texto plano */
  buffer?: Buffer | Uint8Array | ArrayBuffer;
  /** Texto crudo (si ya lo tenés) */
  rawText?: string;
  /** Nombre o mimetype opcional para detección */
  filename?: string;
  mime?: string;

  /** Opciones OCR (opcionales) */
  ocrLang?: string;   // p.ej. "spa"
  ocrPsm?: number;    // p.ej. 6
}

export interface NormalizedDoc {
  kind: SourceKind;
  /** Texto normalizado y “limpio” */
  text: string;

  /** Segmentación en párrafos (conservando offsets en `paragraphSpans`) */
  paragraphs: string[];

  /** Spans [start,end) de cada párrafo en el texto limpio */
  paragraphSpans: Array<[number, number]>;

  /**
   * Localizador: dado un índice absoluto en `text`, devuelve el párrafo y
   * el índice local dentro de ese párrafo.
   */
  mapOffsets: (absIndex: number) => { paragraphIndex: number; localIndex: number };

  /**
   * (Opcionales) Mapeos de rangos para la UI:
   * - clean -> raw
   * - raw -> clean
   */
  mapCleanToRaw?: (start: number, end: number) => [number, number];
  mapRawToClean?: (start: number, end: number) => [number, number];

  meta: {
    detectedFormat: SourceKind;
    language?: "es" | "en" | string;
    length: number;
    paragraphCount: number;
    notes?: string[];
  };
}
