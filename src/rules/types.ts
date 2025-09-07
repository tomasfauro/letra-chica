export interface Finding {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  description: string;
  evidence?: string;
  meta?: {
    /** Lista de bullets (2–4) con recomendaciones concretas. */
    bullets?: string[];
    /** Palabras clave a resaltar dentro de la evidencia. */
    keywords?: string[];
    /** Campo libre para métricas u otros datos. */
    [k: string]: unknown;
  };
}

export type Rule = (text: string) => Finding[];
