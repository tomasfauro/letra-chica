// src/lib/labels.ts
import type { Finding } from "@/rules";

// Map raw rule IDs to v2 umbrella labels for UI grouping
export function mapRuleIdToV2(id: string): string {
  const i = id || "";
  // Alquiler - Depósito/Fianza
  if (
    i === "alquiler-deposito-un-mes" ||
    i === "alquiler-deposito-multiples-meses" ||
    i === "alquiler-fianza" ||
    i === "deposito-max-1"
  ) return "alquiler-deposito";

  // Servicios - Jurisdicción / arbitraje
  if (i === "servicios-jurisdiccion-arbitraje") return "servicios-jurisdiccion";

  // Bancario - intereses punitorios
  if (i === "bancario-intereses-punitorios") return "bancario-intereses";

  // Default: keep as-is (already v2-consistent or unknown)
  return i;
}

const sevRank: Record<Finding["severity"], number> = { low: 1, medium: 2, high: 3 };

function confidenceOf(f: Finding): number {
  const top = (f as any)?.confidence;
  const meta = (f as any)?.meta?.confidence;
  return typeof top === "number" ? top : typeof meta === "number" ? meta : 0.6;
}

// Merge and dedupe findings by (id), keeping higher severity, then higher confidence
export function mergeFindings(a: Finding[], b: Finding[]): Finding[] {
  const all = [...(a || []), ...(b || [])];
  const byId = new Map<string, Finding[]>();
  for (const f of all) {
    const key = f.id;
    const arr = byId.get(key) || [];
    arr.push(f);
    byId.set(key, arr);
  }

  const out: Finding[] = [];
  for (const [id, items] of byId) {
    // Special merge for canonical deposit label
    if (id === "alquiler-deposito") {
      let best: Finding | null = null;
      let maxMonths = 0;
      // Prefer the candidate that provides totalMonths metadata
      for (const f of items) {
        const tm = Number((f as any)?.meta?.totalMonths || 0);
        if (tm > maxMonths) maxMonths = tm;
      }
      // Choose a base: one with months if available, otherwise best by sev/conf
      const withMonths = items.filter((f) => Number((f as any)?.meta?.totalMonths || 0) > 0);
      if (withMonths.length > 0) {
        best = withMonths.sort((a, b) => Number((b as any)?.meta?.totalMonths || 0) - Number((a as any)?.meta?.totalMonths || 0))[0];
      } else {
        best = items.sort((a, b) => {
          const bySev = sevRank[b.severity] - sevRank[a.severity];
          if (bySev !== 0) return bySev;
          return confidenceOf(b) - confidenceOf(a);
        })[0];
      }
      if (best) {
        // Domain severity strictly from months; guarantor bump happens post-merge
        const tm = Number((best as any)?.meta?.totalMonths || maxMonths || 0);
        let severity: Finding["severity"] = "low";
        if (tm >= 2) severity = "high"; // >1 mes → high
        else if (tm === 1) severity = "low"; // 1 mes → low/info
        out.push({ ...best, severity });
      }
      continue;
    }

    // Default: keep the best by severity then confidence
    const best = items.sort((a, b) => {
      const bySev = sevRank[b.severity] - sevRank[a.severity];
      if (bySev !== 0) return bySev;
      return confidenceOf(b) - confidenceOf(a);
    })[0];
    if (best) out.push(best);
  }
  return out;
}

// Try to align deposit evidence to the closest clause heading mentioning Depósito/Garantía
// Generic: take evidence from the clause heading that matches `headingKeywordRx`
export function adjustEvidenceToHeadingRange(
  text: string,
  f: Finding,
  headingKeywordRx: RegExp
): Finding {
  try {
    const idx = Math.max(0, (f.index as number) ?? 0);
    const win = 2000;
    const start = Math.max(0, idx - win);
    const end = Math.min(text.length, idx + win);
    const slice = text.slice(start, end);

    // Ordinal or numeric heading lines (optionally prefixed by "CLÁUSULA ")
    // Examples matched: "CLÁUSULA NOVENA – ...", "NOVENA - ...", "9ª – ...", "9. ...", "CLÁUSULA 9º: ..."
    const headingRx = new RegExp(
      String.raw`(^|\n)\s*(?:cl[aá]usula\s+)?(?:` +
        // word ordinals
        String.raw`primera|segunda|tercera|cuarta|quinta|sexta|s[eé]ptima|septima|octava|novena|d[eé]cima(?:\s+\w+)?|` +
        // numeric ordinals with optional ordinal indicators or dot
        String.raw`\d{1,2}\s*(?:[ºo°ª]\.?)?` +
      String.raw`)\s*(?:[-–—:\.]\s*)?[^\n]*$`,
      "gmi"
    );

    // Find candidate headings in the window
    const headings: { absStart: number; absEnd: number; text: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = headingRx.exec(slice))) {
      const absStart = start + m.index;
      const line = m[0];
      const absEnd = absStart + line.length;
      headings.push({ absStart, absEnd, text: line });
    }

    // Choose the nearest previous heading that also matches the keyword rx
    let chosenIndex = -1;
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      if (h.absStart <= idx && headingKeywordRx.test(h.text)) {
        chosenIndex = i;
      }
    }

    if (chosenIndex >= 0) {
      const h = headings[chosenIndex];
      const next = headings.find((x) => x.absStart > h.absStart);
      const eStart = h.absStart;
      const eEnd = next ? next.absStart : Math.min(text.length, h.absEnd + 1200);
      const evidence = text.slice(eStart, eEnd).trim();
      if (evidence && evidence.length > 20) {
        return { ...f, evidence };
      }
    }
  } catch {}
  return f;
}

export function adjustDepositEvidence(text: string, f: Finding): Finding {
  try {
    return adjustEvidenceToHeadingRange(
      text,
      f,
      /dep[oó]sito|garant[ií]a/i
    );
  } catch {}
  return f;
}

// Post-merge severity bump: if a strong guarantor is present, bump depósito to high
export function bumpDepositSeverityWithGuarantor(findings: Finding[]): Finding[] {
  const hasStrongGuarantor = findings.some((x) =>
    x.id === "alquiler-garante-solidario" &&
    Array.isArray((x as any)?.meta?.renunciations) && ((x as any).meta.renunciations.length >= 2)
  );
  if (!hasStrongGuarantor) return findings;
  return findings.map((f) => {
    if (f.id !== "alquiler-deposito") return f;
    const tm = Number((f as any)?.meta?.totalMonths || 0);
    const severity: Finding["severity"] = tm >= 1 ? "high" : f.severity;
    return { ...f, severity };
  });
}
