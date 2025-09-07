import "server-only";
import { normalizeText } from "@/lib/pdf/text/normalize";

import pdfParse from "pdf-parse";

export async function parsePdf(buffer: Buffer): Promise<{
  text: string;
  meta: { info: any; nPages: number; version: string | null; likelyScanned: boolean };
}> {
  const data = await pdfParse(buffer);

  const text = normalizeText(data.text ?? "");
  const likelyScanned = text.length < 50;

  return {
    text,
    meta: {
      info: data.info ?? {},
      nPages: data.numpages ?? 0,
      version: data.version ?? null,
      likelyScanned,
    },
  };
}
