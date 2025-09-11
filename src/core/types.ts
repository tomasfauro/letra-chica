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
}

export interface NormalizedDoc {
  kind: SourceKind;
  text: string;             // texto normalizado y “limpio”
  paragraphs: string[];     // segmentación en párrafos (conservando offsets)
  mapOffsets: (absIndex: number) => { paragraphIndex: number; localIndex: number };
  meta: {
    detectedFormat: SourceKind;
    language?: "es" | "en" | string;
    length: number;
    paragraphCount: number;
    notes?: string[];
  };
}
