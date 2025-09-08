// src/rules/types.ts

export type Severity = "low" | "medium" | "high";
export type RuleKind = "legal" | "heuristic";

export interface LegalBasis {
  law: string;               // p.ej. "Ley 27.551" / "DNU 70/2023"
  article?: string;          // p.ej. "art. 13"
  note?: string;             // p.ej. "Depósito ≤ 1 mes y devolución al valor del último mes"
  link?: string;             // URL oficial o guía fiable
  jurisdiction?: "AR";       // por ahora Argentina, escalable a multi-país
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  description: string;

  /** Evidencia resumida opcional (extracto legible) */
  evidence?: string;

  /** Texto completo del fragmento detectado (opcional, útil para debug) */
  text?: string;

  /** Índice aproximado del match dentro del contrato (si aplica) */
  index?: number;

  meta?: {
    /** NUEVO: clasifica la regla como legal (dura) o heurística (buenas prácticas) */
    type?: RuleKind;

    /** NUEVO: lista de bases legales que respaldan el hallazgo */
    legalBasis?: LegalBasis[];

    /** Puntos clave para el usuario (máx. 3–4 bullets) */
    bullets?: string[];

    /** Palabras clave (para resaltar en evidencia) */
    keywords?: string[];

    [k: string]: unknown;
  };
}

export type Rule = (text: string) => Finding[];
