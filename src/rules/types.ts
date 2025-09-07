export interface Finding {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  description: string;
  evidence?: string;
  meta?: Record<string, unknown>;
}

export type Rule = (text: string) => Finding[];
