// src/rules/notificaciones.ts
import type { Rule } from "./types.ts";
import { makeFinding } from "./utils.ts";

/** Notificaciones restrictivas (sólo un canal válido). */
export const ruleNotificacionesAbusivas: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const m =
    /\bnotificaci[oó]n(?:es)?\b.{0,40}\b(exclusiv(?:a|amente)|[sóo]lo|únicamente)\b.{0,40}\b(por|v[ií]a)\b/.exec(
      lower
    );
  if (!m) return [];

  return [
    makeFinding({
      id: "notificaciones-abusivas",
      title: "Notificaciones restrictivas (un solo canal)",
      severity: "medium",
      description:
        "Se limita la validez de notificaciones a un único canal. Podría dificultar comunicaciones o defensas.",
      text: raw,
      index: m.index!,
      meta: {
        bullets: [
          "Verificá si admite múltiples vías (email, domicilio, plataforma).",
          "Chequeá plazos de respuesta y formas de notificación.",
          "Pedí constancias (acuse de recibo o de lectura)."
        ],
        keywords: ["notificación", "exclusiva", "únicamente", "vía", "por"]
      }
    }),
  ];
};
