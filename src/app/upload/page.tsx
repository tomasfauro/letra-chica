"use client";

import { useCallback, useRef, useState } from "react";
import { FindingsList } from "@/components/FindingsList";
import type { Finding } from "@/rules";
import { Upload, FileText, X, Info, AlertTriangle } from "lucide-react";

type ApiOk = {
  ok: true;
  meta: { filename: string; sizeMB: number; nPages: number; likelyScanned?: boolean };
  findings: Finding[];
  excerpt: string;
};
type ApiErr = { error: string };
type ApiResponse = ApiOk | ApiErr;

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ApiResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFile = (f: File | null) => {
    setErr(null);
    setResp(null);
    if (f) {
      const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) { setErr("Solo se admite PDF."); setFile(null); return; }
      const sizeMB = f.size / (1024 * 1024);
      if (sizeMB > 20) { setErr("PDF demasiado grande (>20MB)."); setFile(null); return; }
    }
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(false);
    onFile(e.dataTransfer.files?.[0] ?? null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(false);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setResp(null);
    if (!file) { setErr("Seleccioná un PDF."); return; }
    setLoading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok) setErr((json as any).error ?? "Error en el análisis");
      else setResp(json);
    } catch (e: any) {
      setErr(e?.message ?? "Error de red");
    } finally {
      setLoading(false);
    }
  };

  const onReset = () => {
    setFile(null); setResp(null); setErr(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const findingsCount = resp && "ok" in resp && resp.ok ? resp.findings.length : 0;

  return (
    <main className="min-h-[calc(100vh-120px)] bg-gray-50">
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Analizar contrato (PDF)</h1>
        <p className="text-sm text-neutral-600">Análisis informativo; no constituye asesoría legal.</p>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Columna principal */}
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="h-2 rounded-t-2xl bg-gradient-to-r from-blue-500/70 via-indigo-500/70 to-purple-500/70" />

            <form onSubmit={onSubmit} className="p-6 space-y-4">
              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={[
                  "rounded-xl border-2 border-dashed p-6 transition-colors",
                  dragging ? "border-blue-400 bg-blue-50" : "border-neutral-200 hover:bg-neutral-50",
                ].join(" ")}
                aria-label="Arrastrá y soltá tu PDF"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Upload className="text-blue-600" size={20} />
                    <div className="text-sm text-neutral-700">
                      Arrastrá el PDF acá o{" "}
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="text-blue-700 font-medium hover:underline"
                      >
                        buscá en tu equipo
                      </button>
                      .
                      <div className="text-xs text-neutral-500 mt-1">
                        Formato admitido: .pdf · Máx 20&nbsp;MB
                      </div>
                    </div>
                  </div>

                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />

                  <button
                    type="submit"
                    disabled={loading || !file}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    <FileText size={16} />
                    {loading ? "Analizando…" : "Subir y analizar"}
                  </button>
                </div>

                {file && (
                  <div className="mt-4 flex items-center justify-between rounded-md bg-neutral-100 border border-neutral-200 p-3">
                    <div className="flex items-center gap-2 text-sm text-neutral-800">
                      <FileText size={16} className="text-neutral-700" />
                      <span className="font-medium truncate max-w-[60vw] md:max-w-none">
                        {file.name}
                      </span>
                      <span className="text-neutral-500">
                        ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onReset}
                      className="p-1 hover:bg-neutral-200 rounded"
                      aria-label="Quitar archivo"
                      title="Quitar archivo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {err && (
                <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle size={16} className="mt-0.5" />
                  <div>{err}</div>
                </div>
              )}
            </form>

            {/* Resultado */}
            {resp && "ok" in resp && resp.ok && (
              <div className="border-t p-6 space-y-6">
                {/* Resumen compacto */}
                <div className="rounded-xl border bg-neutral-50 p-4">
                  <div className="grid sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-neutral-500">Archivo</div>
                      <div className="font-medium truncate">{resp.meta.filename}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">Tamaño</div>
                      <div className="font-medium">{resp.meta.sizeMB} MB</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">Páginas</div>
                      <div className="font-medium">{resp.meta.nPages}</div>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={[
                          "inline-block rounded-full px-3 py-1 text-xs font-bold",
                          resp.findings.length === 0
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-800",
                        ].join(" ")}
                      >
                        Hallazgos: {findingsCount}
                      </span>
                    </div>
                  </div>

                  {resp.meta.likelyScanned && (
                    <div className="mt-3 border-l-4 border-amber-400 bg-amber-50 text-amber-900 px-3 py-2 rounded">
                      El PDF parece escaneado (texto muy corto). Un OCR podría mejorar el análisis.
                    </div>
                  )}
                </div>

                {/* Hallazgos */}
                <FindingsList items={resp.findings} />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onReset}
                    className="px-3 py-2 rounded border bg-white hover:bg-neutral-50 text-sm"
                  >
                    Subir otro contrato
                  </button>
                  <button
                    type="button"
                    disabled
                    className="px-3 py-2 rounded bg-neutral-200 text-neutral-600 text-sm cursor-not-allowed"
                    title="Próximamente"
                  >
                    Descargar informe (próximamente)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Columna lateral (tips) */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-2xl border bg-white shadow-sm p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Info size={16} className="text-blue-600" />
                Sugerencias
              </div>
              <ul className="mt-3 text-sm text-neutral-700 space-y-2 list-disc list-inside">
                <li>Preferí el PDF original (evitá fotos o capturas).</li>
                <li>Si es escaneado, activá OCR antes de subir.</li>
                <li>No incluyas datos sensibles innecesarios.</li>
                <li>La salida es informativa; revisá con un profesional.</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
