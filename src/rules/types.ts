// src/rules/types.ts

export type Severity = "low" | "medium" | "high";
export const SeverityOrder: Record<Severity, number> = { low: 0, medium: 1, high: 2 };

export type RuleKind = "legal" | "heuristic";

/** NUEVO: familias para ejecutar reglas según tipo de contrato detectado */
export type RuleGroup = "alquiler" | "servicios" | "laboral" | "bancario" | "global";

export interface LegalBasis {
  law: string;               // p.ej. "Ley 27.551" / "DNU 70/2023"
  article?: string;          // p.ej. "art. 13"
  note?: string;             // p.ej. "Depósito ≤ 1 mes..."
  link?: string;             // URL oficial
  jurisdiction?: "AR";       // por ahora AR
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  description: string;

  /** Extracto legible (si no viene, el motor lo arma con index+window) */
  evidence?: string;

  /** Texto bruto del fragmento detectado (opcional, útil para debug) */
  text?: string;

  /** Índice absoluto en el texto normalizado donde matcheó la regla */
  index?: number;

  /** Ventana por defecto para construir evidence cuando sólo hay index */
  window?: number;

  meta?: {
    /** Clasificación de la regla: legal (dura) o heurística (buenas prácticas) */
    type?: RuleKind;

    /** Bases legales (larga) y alias corto lawRefs (para UI) */
    legalBasis?: LegalBasis[];
    lawRefs?: LegalBasis[];

    /** Prioridad / ranking */
    confidence?: number;   // 0..1
    score?: number;        // libre, si usas sumatoria/boosts

    /** Puntos clave al usuario (máx. 3–4 bullets) */
    bullets?: string[];

    /** Palabras clave (para resaltar) */
    keywords?: string[];

    /** Ubicación mapeada a párrafo (para UI) */
    paragraphIndex?: number;
    localIndex?: number;

    /** Cualquier otro dato de la regla */
    [k: string]: unknown;
  };
}

/** Firma de una regla: recibe texto normalizado, devuelve hallazgos */
export type Rule = (text: string) => Finding[];

/** NUEVO: registro de reglas con su grupo para gatear por tipo de contrato */
export interface RuleEntry {
  id: string;        // identificador estable de la regla (para trazabilidad/telemetría)
  group: RuleGroup;  // a qué familia pertenece ("global" si aplica a todos)
  run: Rule;         // implementación de la regla
}
