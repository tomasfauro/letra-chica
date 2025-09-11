// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { normalizeDocument } from "@/core/normalize";
import { classifyContract } from "@/core/classify";
import { runRulesForType, selectedRuleIdsForType } from "@/rules";  // ⬅️ ahora importamos selectedRuleIdsForType
import { ensureEvidence } from "@/rules/utils";

export const runtime = "nodejs";     // OCR/parse → requiere Node
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function sniffIsPdf(name?: string, mime?: string, header?: string) {
  const declaredPdf =
    !!name?.toLowerCase().endsWith(".pdf") || mime === "application/pdf";
  const looksPdf = header === "%PDF-";
  return { declaredPdf, looksPdf, isPdf: declaredPdf || looksPdf };
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const forceOcr = url.searchParams.get("ocr") === "1";
    const debug = url.searchParams.get("debug") === "1";

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return json(400, { error: "Falta 'file' en form-data" });
    }

    // Tamaño (límite 20MB)
    const sizeMB = (file.size || 0) / (1024 * 1024);
    if (sizeMB > 20) {
      return json(413, { error: "Archivo demasiado grande (>20MB)" });
    }

    // Leer binario
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sniff de PDF por firma
    const header = buffer.subarray(0, 5).toString("utf-8");
    const { isPdf } = sniffIsPdf(file.name, file.type, header);

    // Normalizar: detecta docx/pdf, cleanup, segmenta y mapea offsets
    let normalized = await normalizeDocument({
      buffer,
      filename: file.name,
      mime: file.type,
    });

    // “Forzar OCR”: reintentar y quedarte con el que traiga más texto
    if (forceOcr && isPdf && normalized.kind !== "pdf-ocr") {
      const tryOcr = await normalizeDocument({
        buffer,
        filename: file.name,
        mime: file.type,
      });
      if ((tryOcr?.text?.length || 0) > (normalized?.text?.length || 0)) {
        normalized = tryOcr;
      }
    }

    const textLen = normalized?.text?.length ?? 0;
    const paragraphCount = normalized?.paragraphs?.length ?? 0;

    // Validación de contenido extraído
    if (!normalized.text || normalized.text.trim().length < 10) {
      return json(422, {
        error:
          "No se pudo extraer texto legible. Si es un escaneo, activá OCR (?ocr=1) o subí un PDF con texto.",
        meta: {
          ...normalized.meta,
          filename: file.name,
          sizeMB: +sizeMB.toFixed(2),
          hint: "Probá volver a subir con ?ocr=1",
          textLen,
          paragraphCount,
          isPdf,
          forceOcr,
        },
      });
    }

    // 1) Clasificación del contrato (heurística Fase 1)
    const classification = classifyContract(normalized.text);
    console.log("[classify] type(raw):", classification.type, "confidence:", classification.confidence);
    console.log("[classify] reasons =>", classification.reasons);

    // 2) Ver qué reglas quedarían seleccionadas (útil para debug de whitelist/gateo)
    const selectedRuleIds = selectedRuleIdsForType(classification.type);
    console.log("[rules] selected (ids):", selectedRuleIds);

    // 3) Gateo: ejecutar reglas del tipo detectado
    //    En debug bajamos el threshold a 0.5 para ver más señales mientras calibrás confidence
    const rawFindings = debug
      ? runRulesForType(normalized.text, classification.type, 0.5)
      : runRulesForType(normalized.text, classification.type);

    // 4) Evidencia garantizada + offsets mapeados para UI
    const findings = rawFindings.map((f: any) => {
      const withEv = ensureEvidence(f, normalized.text);
      if (withEv.index != null) {
        const { paragraphIndex, localIndex } = normalized.mapOffsets(withEv.index);
        withEv.meta = {
          ...withEv.meta,
          paragraphIndex,
          localIndex,
          contractTypeDetected: classification.type,
          contractTypeConfidence: classification.confidence,
        };
      } else {
        withEv.meta = {
          ...withEv.meta,
          contractTypeDetected: classification.type,
          contractTypeConfidence: classification.confidence,
        };
      }
      return withEv;
    });

    // 5) Armar payload con telemetría útil para la UI y para inspección rápida
    const resp = {
      ok: true,
      meta: {
        ...normalized.meta,           // kind, paragraphCount, length, etc.
        filename: file.name,
        sizeMB: +sizeMB.toFixed(2),
        isPdf,
        forceOcr,
        textLen,
        paragraphCount,
      },
      classification,                 // tipo + confidence + reasons/features
      findings,
      // Para inspección rápida (mantenelo corto)
      excerpt: normalized.text.slice(0, 1000),
      firstParagraphs: normalized.paragraphs.slice(0, 8),
      // Telemetría de reglas (ayuda a explicar “Hallazgos (0)”)
      debugInfo: {
        debugMode: debug,
        selectedRuleIds,
        selectedRuleCount: selectedRuleIds.length,
        // si no hay reglas seleccionadas, es whitelist/tipo; si hay y da 0, es regex/normalización
        hint:
          selectedRuleIds.length === 0
            ? "No hay reglas seleccionadas: revisá la whitelist o el tipo detectado."
            : findings.length === 0
              ? "Se ejecutaron reglas pero no encontraron coincidencias: revisá normalización/regex/OCR."
              : "OK: hubo hallazgos.",
      },
    };

    return json(200, resp);
  } catch (err: any) {
    console.error("[api/upload] ERROR:", {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    });
    return json(500, { error: err?.message ?? "Error procesando archivo" });
  }
}
