import { NextResponse } from "next/server";
import { parsePdf } from "@/lib/pdf/parse";
import { runRules } from "@/rules";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Falta 'file' en form-data" }, { status: 400 });
    }

    console.log("[upload] recibido:", file.name, file.size, file.type);

    if (file.type !== "application/pdf" && !file.name?.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Solo se admite PDF" }, { status: 400 });
    }

    const sizeMB = (file.size || 0) / (1024 * 1024);
    if (sizeMB > 20) {
      return NextResponse.json({ error: "PDF demasiado grande (>20MB)" }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("[upload] buffer listo, bytes:", buffer.byteLength);

    console.log("[upload] antes de parsePdf");
    const { text, meta } = await parsePdf(buffer);
    console.log("[upload] después de parsePdf, páginas:", meta?.nPages);

    console.log("[upload] antes de runRules");
    const findings = runRules(text);
    console.log("[upload] después de runRules, hallazgos:", findings.length);

    return NextResponse.json({
      ok: true,
      meta: { ...meta, filename: file.name, sizeMB: +sizeMB.toFixed(2) },
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
    return NextResponse.json({ error: err?.message ?? "Error procesando PDF" }, { status: 500 });
  }
}
