// src/lib/legal.ts

// --- Tipos ---
export type Country = "AR" | "ES" | "UNKNOWN";
export type ContractType = "permanente" | "temporaria" | "comercial" | "desconocido";
export type Currency = "ARS" | "EUR" | "UNKNOWN";

export type LegalRegime =
  | "PRE_27551"
  | "LEY_27551"
  | "LEY_27737"
  | "DNU_70_2023"
  | "ES_LAU"
  | "UNKNOWN";

export interface LegalContext {
  country: Country;
  regime: LegalRegime;
  contractType: ContractType;
  currency: Currency;
  contractDate?: Date | null;
}

// --- Fechas pivote AR ---
const DATE_2020_07_01 = new Date("2020-07-01");   // entra Ley 27.551
const DATE_2023_10_17 = new Date("2023-10-17");   // entra Ley 27.737
const DATE_2023_12_21 = new Date("2023-12-21");   // entra DNU 70/2023

// --- Utilidades de parsing de fecha ---
export function extractContractDate(raw: string): Date | null {
  if (!raw) return null;
  const patterns = [
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/,                // dd/mm/aaaa
    /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/,                  // aaaa/mm/dd
    /\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})\b/i,             // 1 de enero de 2024
  ];
  const months: Record<string, number> = {
    "enero":0,"febrero":1,"marzo":2,"abril":3,"mayo":4,"junio":5,
    "julio":6,"agosto":7,"septiembre":8,"setiembre":8,"octubre":9,"noviembre":10,"diciembre":11
  };

  for (const re of patterns) {
    const m = re.exec(raw);
    if (!m) continue;
    try {
      if (re === patterns[0]) {
        const d = parseInt(m[1],10), mo = parseInt(m[2],10)-1, y = parseInt(m[3].length===2?("20"+m[3]):m[3],10);
        return new Date(y, mo, d);
      }
      if (re === patterns[1]) {
        const y = parseInt(m[1],10), mo = parseInt(m[2],10)-1, d = parseInt(m[3],10);
        return new Date(y, mo, d);
      }
      if (re === patterns[2]) {
        const d = parseInt(m[1],10), mo = months[m[2].toLowerCase()], y = parseInt(m[3],10);
        if (mo>=0) return new Date(y, mo, d);
      }
    } catch {}
  }
  return null;
}

// --- Heurísticas de país/moneda/tipo ---
function detectCurrency(text: string): Currency {
  if (/[€]\s*\d|\d+\s*€/.test(text)) return "EUR";
  // Preferimos "ARS", "pesos", "AR$" antes que un "$" genérico
  if (/\b(ars|ar\$|pesos?)\b/i.test(text)) return "ARS";
  if (/\$\s*\d/.test(text)) return "ARS"; // fallback frecuente en AR
  return "UNKNOWN";
}

function detectCountry(text: string): Country {
  const lower = text.toLowerCase();
  // Señales España
  const es =
    /€|ibi\b|comunidad aut[oó]noma|lau\b|arrendamientos urbanos|ine\b/.test(lower);
  if (es) return "ES";
  // Señales Argentina
  const ar =
    /\b(caba|provincia de|argentina|dni|cuit|cuil|ley\s*27\.?551|27\.?737|bcra|icl|ripte)\b/.test(lower) ||
    /\b(ars|ar\$|pesos?)\b/i.test(lower) ||
    /\$\s*\d/.test(text);
  if (ar) return "AR";
  return "UNKNOWN";
}

function detectContractType(text: string): ContractType {
  const lower = text.toLowerCase();
  if (/\blocaci[oó]n\s+tempor(a|á)ria\b|\bcontrato temporari[oa]\b|turismo|temporada\b/.test(lower)) {
    return "temporaria";
  }
  if (/\bcomercial\b|\blocaci[oó]n\s+comercial\b|\blocal\b|\boficina\b|\bindustrial\b/.test(lower)) {
    return "comercial";
  }
  if (/\bvivienda (habitual|permanente)\b/.test(lower)) {
    return "permanente";
  }
  return "desconocido";
}

// --- Detección de régimen por pistas en el texto ---
function hintsRegimeAR(text: string): LegalRegime | null {
  const t = text.toLowerCase();
  if (/\bdnu\s*70\/?2023\b/.test(t)) return "DNU_70_2023";
  if (/\bley\s*27\.?737\b/.test(t)) return "LEY_27737";
  if (/\bley\s*27\.?551\b/.test(t)) return "LEY_27551";
  return null;
}

// --- Cálculo de régimen legal ---
function regimeForAR(date: Date | null): LegalRegime {
  if (!date) return "DNU_70_2023"; // fallback prudente (no marcar periodicidad salvo pista en texto)
  if (date < DATE_2020_07_01) return "PRE_27551";
  if (date >= DATE_2020_07_01 && date <= DATE_2023_10_17) return "LEY_27551";
  if (date > DATE_2023_10_17 && date < DATE_2023_12_21) return "LEY_27737";
  return "DNU_70_2023";
}

// --- API principal ---
export function getLegalContext(raw: string): LegalContext {
  const date = extractContractDate(raw);
  const currency = detectCurrency(raw);
  const country = detectCountry(raw);
  const contractType = detectContractType(raw);

  if (country === "ES") {
    return {
      country: "ES",
      regime: "ES_LAU",
      contractType,
      currency,
      contractDate: date,
    };
  }

  if (country === "AR") {
    // 1) Si el texto trae una pista explícita de régimen, usala
    const hinted = hintsRegimeAR(raw);
    if (hinted) {
      return {
        country: "AR",
        regime: hinted,
        contractType,
        currency,
        contractDate: date,
      };
    }
    // 2) Si no hay pista, usamos la fecha (o fallback prudente a DNU)
    return {
      country: "AR",
      regime: regimeForAR(date),
      contractType,
      currency,
      contractDate: date,
    };
  }

  // Desconocido: devolvemos régimen abierto y marcadores
  return {
    country: "UNKNOWN",
    regime: "UNKNOWN",
    contractType,
    currency,
    contractDate: date,
  };
}
