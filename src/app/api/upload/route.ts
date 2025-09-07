// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { parsePdf } from "@/lib/pdf/parse";
import { runRules } from "@/rules";

export const runtime = "nodejs";
export const maxDuration = 60;
// Evita cacheado por Next (App Router)
export const dynamic = "force-dynamic";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return json(400, { error: "Falta 'file' en form-data" });
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[upload] recibido:", file.name, file.size, file.type);
    }

    // Tamaño
    const sizeMB = (file.size || 0) / (1024 * 1024);
    if (sizeMB > 20) {
      return json(413, { error: "PDF demasiado grande (>20MB)" });
    }

    // Leer buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (process.env.NODE_ENV !== "production") {
      console.log("[upload] buffer listo, bytes:", buffer.byteLength);
    }

    // Sniff de PDF por firma "%PDF-"
    const header = buffer.subarray(0, 5).toString("utf-8");
    const looksPdf = header === "%PDF-";
    const declaredPdf =
      file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");

    if (!looksPdf && !declaredPdf) {
      return json(415, { error: "El archivo no parece ser un PDF válido" });
    }

    if (process.env.NODE_ENV !== "production") console.log("[upload] antes de parsePdf");
    const { text, meta } = await parsePdf(buffer);
    if (process.env.NODE_ENV !== "production")
      console.log("[upload] después de parsePdf, páginas:", meta?.nPages);

    // Si no hay texto legible, avisamos con 422 y bandera likelyScanned
    if (!text || text.trim().length < 10) {
      return json(422, {
        error:
          "No se pudo extraer texto legible del PDF. Si es un escaneo, un OCR podría mejorar el análisis.",
        meta: { ...meta, filename: file.name, sizeMB: +sizeMB.toFixed(2) },
      });
    }

    if (process.env.NODE_ENV !== "production") console.log("[upload] antes de runRules");
    const findings = runRules(text);
    if (process.env.NODE_ENV !== "production")
      console.log("[upload] después de runRules, hallazgos:", findings.length);

    return json(200, {
      ok: true,
      meta: {
        ...meta, // incluye likelyScanned si lo agregaste en parsePdf
        filename: file.name,
        sizeMB: +sizeMB.toFixed(2),
      },
      findings,
      excerpt: text.slice(0, 1000),
    });
  } catch (err: any) {
    console.error("[upload] ERROR:", {
      message: err?.message,
      code: err?.code,
      path: err?.path,
      stack: err?.stack,
    });
    return json(500, { error: err?.message ?? "Error procesando PDF" });
  }
}
