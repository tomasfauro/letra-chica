import "server-only";

/**
 * Procesa un buffer de PDF y devuelve el texto extraído y metadatos básicos.
 *
 * IMPORTANTE:
 * - Usamos import dinámico de "pdf-parse" para que SOLO se cargue en Node.
 * - Este archivo no debe importarse desde componentes "use client".
 */
export async function parsePdf(buffer: Buffer): Promise<{
  text: string;
  meta: { info: any; nPages: number; version: string | null };
}> {
  // ⬇️ import dinámico → evita que Webpack lo empaquete al cliente
  const pdfParse = (await import("pdf-parse")).default;

  const data = await pdfParse(buffer);

  const raw = data.text ?? "";
  const text = raw
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    text,
    meta: {
      info: data.info ?? {},
      nPages: data.numpages ?? 0,
      version: (data as any).version ?? null,
    },
  };
}
