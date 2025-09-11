// src/lib/analyze.ts
import { normalizeDocument } from "@/core/normalize";
import { runRules } from "@/rules";
import { ensureEvidence } from "@/rules/utils";
import type { Finding } from "@/rules/types";
import { classifyContract } from "@/core/classify";

export async function analizar(buffer: Buffer, filename: string) {
  const normalized = await normalizeDocument({ buffer, filename });

  // 1) Clasificación de contrato
  const classification = classifyContract(normalized.text);

  // 2) Ejecutar reglas (si todavía no filtras por tipo, igual sirve para meta/UI)
  const rawFindings = runRules(normalized.text);

  // 3) Evidencia + mapeo a párrafos
  const findings: Finding[] = rawFindings.map((f) => {
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
    }
    return withEv;
  });

  return { normalized, findings, classification };
}
