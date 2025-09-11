// src/core/docx.ts
import type { NormalizeInput } from "./types";
import mammoth from "mammoth";

/** Extrae texto “limpio” desde DOCX */
export async function extractDocxWithMammoth(input: NormalizeInput): Promise<string> {
  if (!input.buffer) throw new Error("DOCX extractor: falta buffer");
  const buf = Buffer.isBuffer(input.buffer) ? input.buffer : Buffer.from(input.buffer as ArrayBuffer);
  const res = await mammoth.extractRawText({ buffer: buf });
  return res.value || "";
}
