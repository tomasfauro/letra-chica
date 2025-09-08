// src/rules/notificaciones.ts
import type { Rule } from "./types.ts";
import {
  makeFinding,
  sliceAround,
  hasNegationNear,
  score,
} from "./utils.ts";
import { getLegalContext } from "../lib/legal";

/**
 * Notificaciones / domicilios potencialmente abusivos
 * – Detecta canal único (solo email/whatsapp/etc.), plazos exiguos, domicilio rígido.
 * – Reduce falsos positivos si hay multi-canal (“email o CD”, “y/o”, “cualquier medio fehaciente”)
 *   o si el domicilio especial puede modificarse.
 */
export const ruleNotificacionesAbusivas: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctx = getLegalContext(raw);

  // Disparador amplio de “notificación / domicilio / canal”
  const m = /\b(notificaci[oó]n(?:es)?|domicilio\s+especial|correo\s+electr[oó]nico|email|e-?mail|whatsapp|carta\s+documento|plataforma|telegram|sms|tel[eé]fono)\b/.exec(
    lower
  );
  if (!m) return [];

  const idx = m.index!;
  const around = sliceAround(lower, idx, 360);

  // ¿Menciona explícitamente varios canales cerca?
  const channelsPattern =
    /(correo\s+electr[oó]nico|e-?mail|whatsapp|carta\s+documento|plataforma|domicilio\s+especial|telegram|sms|tel[eé]fono)/g;
  const channelMatches = around.match(channelsPattern);
  const channelsCount = channelMatches ? channelMatches.length : 0;

  const mentionsMulti =
    channelsCount >= 2 ||
    /\b(cualquier\s+medio\s+fehaciente|cualquier\s+medio|cualquiera\s+de\s+los\s+siguientes)\b/.test(
      around
    ) ||
    /\b(y\/o|\/|,|\so\s|\sy\s)\b/.test(around);

  // Señales de restricción / carga excesiva
  const oneWayOnly =
    (/\b(exclusiv(?:a|amente)|[sóo]lo|[úu]nicamente)\b/.test(around) &&
      /\b(por|v[ií]a)\b/.test(around)) ||
    /\bser[aá]\s+v[aá]lida\s+solo\b/.test(around);

  // Si hay “domicilio especial” pero también permite modificarlo, no lo tratamos como rígido
  const domicileChange =
    /\b(podr[aá]\s+(modificar|cambiar)\s+el\s+domicilio|el\s+domicilio\s+(podr[aá]\s+ser|ser[aá])\s+modificad[oa])\b/.test(
      around
    );

  let rigidDomicile =
    /\b(domicilio\s+constituid[oa]\s+(?:irrevocable|inmodificable)|s[oó]lo\s+ser[aá]\s+v[aá]lido\s+en\s+el\s+domicilio\s+indicado)\b/.test(
      around
    );
  if (domicileChange) rigidDomicile = false;

  // Plazos muy cortos (24/48h) para acciones críticas
  const impracticalDeadline =
    /\b(24|48)\s*h(?:oras)?\b.{0,40}\b(responder|impugnar|presentar|contestar|notificar|oponerse)\b/.test(
      around
    );

  // Negación cerca baja la confianza (“no exclusivamente”, “no será válido solo…”)
  const neg = hasNegationNear(lower, idx, 160);

  // Si explícitamente menciona múltiples canales y no hay plazo exiguo ni domicilio rígido → no dispares
  if (mentionsMulti && !impracticalDeadline && !rigidDomicile && !oneWayOnly) return [];

  // Confianza (0–1): señales de riesgo – señales “salvavidas”
  const confidence = score(
    [
      (oneWayOnly || impracticalDeadline || rigidDomicile), // riesgo base
      !mentionsMulti,                                       // baja si hay multi-canal
      !domicileChange,                                      // baja si se puede modificar domicilio
      !neg,                                                 // baja si hay negación (“no exclusivamente”)
    ],
    [1.0, 0.6, 0.6, 0.8]
  );
  if (confidence < 0.6) return [];

  // Severidad: HIGH si canal único + plazo 24/48h (y no hay multi-canal)
  const severity: "low" | "medium" | "high" =
    oneWayOnly && impracticalDeadline && !mentionsMulti ? "high" : "medium";

  return [
    makeFinding({
      id: "notificaciones-abusivas",
      title:
        severity === "high"
          ? "Notificaciones restrictivas con plazo exiguo"
          : "Notificaciones / domicilios potencialmente restrictivos",
      severity,
      description:
        severity === "high"
          ? "Se limita el canal de notificación a uno solo y se fijan plazos muy cortos para responder. Esto puede dificultar defensas o comunicaciones."
          : "La cláusula de notificaciones podría ser restrictiva (canal único, domicilio rígido o plazos breves). Revisá si hay vías alternativas y plazos razonables.",
      text: raw,
      index: idx,
      window: 360,
      meta: {
        type: "heuristic",
        confidence,
        country: ctx.country,
        regime: ctx.regime,
        contractType: ctx.contractType,
        contractDate: ctx.contractDate?.toISOString() ?? null,
        bullets: [
          "Verificá si admite múltiples vías (email, CD, plataforma, teléfono).",
          "Chequeá plazos de respuesta y su razonabilidad (evitá 24–48 h).",
          "Confirmá si el domicilio especial es modificable y cómo notificar cambios.",
          "Pedí constancias (acuse de recibo/lectura) cuando el canal sea digital.",
        ],
        keywords: [
          "notificación",
          "exclusiva",
          "únicamente",
          "plazo",
          "24h",
          "48h",
          "domicilio especial",
          "correo electrónico",
          "WhatsApp",
          "carta documento",
          "fehaciente",
          "y/o",
        ],
      },
    }),
  ];
};
