"use client";

import type { Finding } from "@/rules";

/**
 * Mapea un nivel de severidad a una clase de color de borde.
 * Utilizamos un objeto para no repetir condicionales.
 */
const severityClass: Record<Finding["severity"], string> = {
  low: "border-green-400",
  medium: "border-yellow-400",
  high: "border-red-500",
};

interface FindingsListProps {
  items: Finding[];
}

/**
 * Lista de hallazgos con formato de tarjetas.
 * Cada hallazgo muestra el título, la severidad, una descripción y
 * opcionalmente una evidencia (fragmento del contrato).
 */
export function FindingsList({ items }: FindingsListProps) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No se detectaron hallazgos con las reglas actuales.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((f) => (
        <div
          key={f.id}
          className={`border-l-4 p-4 rounded-md bg-white shadow ${
            severityClass[f.severity]
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">{f.title}</h3>
            <span className="text-xs uppercase tracking-wide text-neutral-600">
              {f.severity}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-700">{f.description}</p>
          {f.evidence && (
            <pre className="mt-2 text-xs bg-neutral-50 p-2 rounded whitespace-pre-wrap border">
              {f.evidence}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}