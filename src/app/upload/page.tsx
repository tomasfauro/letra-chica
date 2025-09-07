"use client";

import { useState } from "react";
import { FindingsList } from "@/components/FindingsList";
import type { Finding } from "@/rules";

type ApiResponse =
  | { ok: true; meta: any; findings: Finding[]; excerpt: string }
  | { error: string };

/**
 * Página para subir un contrato en PDF y analizarlo.
 *
 * Se encarga de recoger el archivo, enviarlo al API `/api/upload` y
 * mostrar los hallazgos devueltos. Muestra un estado de carga y
 * maneja posibles errores de red o de validación del servidor.
 */
export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ApiResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setResp(null);
    if (!file) {
      setErr("Selecciona un PDF.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok) {
        // el servidor puede devolver {error}
        setErr((json as any).error ?? "Error en el análisis");
      } else {
        setResp(json);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Analizar contrato (PDF)</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Análisis informativo, no constituye asesoría legal.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 border rounded-lg p-4 bg-white shadow">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        <button
          disabled={loading || !file}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {loading ? "Analizando…" : "Subir y analizar"}
        </button>
      </form>

      {err && <p className="mt-4 text-red-600 text-sm">{err}</p>}

      {resp && "ok" in resp && resp.ok && (
        <section className="mt-8 space-y-4">
          <div className="text-sm text-neutral-600">
            <div>
              <strong>Archivo:</strong> {resp.meta?.filename} ({resp.meta?.sizeMB} MB)
            </div>
            <div>
              <strong>Páginas:</strong> {resp.meta?.nPages}
            </div>
          </div>
          <FindingsList items={resp.findings} />
        </section>
      )}
    </main>
  );
}