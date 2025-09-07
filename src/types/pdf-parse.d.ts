declare module "pdf-parse/lib/pdf-parse.js" {
  import { PDFInfo } from "pdf-parse";

  interface PDFMeta {
    info: PDFInfo;
    metadata?: any;
    version?: string;
    numpages: number;
    numrender: number;
  }

  interface PDFResult {
    text: string;
    info: PDFInfo;
    metadata: any;
    version: string;
    numpages: number;
    numrender: number;
  }

  function pdfParse(
    buffer: Buffer,
    options?: Record<string, unknown>
  ): Promise<PDFResult>;

  export default pdfParse;
}
