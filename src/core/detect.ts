// src/core/detect.ts
import type { NormalizeInput, SourceKind } from "./types";

const DOCX = /\.docx$/i;
const PDF  = /\.pdf$/i;

export function detectFormat(input: NormalizeInput): SourceKind {
  const name = input.filename || "";
  const mime = (input.mime || "").toLowerCase();

  if (DOCX.test(name) || mime.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
    return "docx";
  }
  if (PDF.test(name) || mime.includes("application/pdf")) {
    // no podemos saber aún si será text-based u OCR; devolvemos pdf-text por defecto,
    // si falla el parser, el pipeline hará fallback a OCR.
    return "pdf-text";
  }
  if (typeof input.rawText === "string") return "txt";
  // por defecto intentamos pdf-text, y si falla, OCR
  return "pdf-text";
}
