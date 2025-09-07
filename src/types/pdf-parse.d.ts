// src/types/pdf-parse.d.ts
declare module "pdf-parse" {
  export interface PDFParseResult {
    text: string;
    numpages: number;
    numrender?: number;
    info?: any;
    metadata?: any;
    version?: string | null;
  }

  export default function pdfParse(
    buffer: Buffer | Uint8Array,
    options?: Record<string, unknown>
  ): Promise<PDFParseResult>;
}
