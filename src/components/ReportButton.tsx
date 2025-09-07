"use client";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";
import type { Finding } from "@/rules";

type Props = {
  findings: Finding[];
  fileName?: string;
  disabled?: boolean;
  meta?: { filename?: string; pages?: number; sizeMB?: number };
};

const sevLabel: Record<Finding["severity"], string> = {
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

// Orden deseado para el PDF: VERDE (Bajo) → AMARILLO (Medio) → ROJO (Alto)
const sevOrder: Record<Finding["severity"], number> = { low: 0, medium: 1, high: 2 };

export default function ReportButton({
  findings,
  fileName = "informe-letrachica.pdf",
  disabled,
  meta,
}: Props) {
  const onDownload = () => {
    try {
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      let y = 40;

      // Cabecera
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("LetraChica – Informe de análisis", 30, y);
      y += 18;

      // Métricas
      const counts = { high: 0, medium: 0, low: 0 };
      for (const f of findings) counts[f.severity as "high" | "medium" | "low"]++;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const date = new Date().toLocaleString();
      const metaLine = [
        meta?.filename ? `Archivo: ${meta.filename}` : null,
        meta?.pages ? `Páginas: ${meta.pages}` : null,
        meta?.sizeMB ? `Tamaño: ${meta.sizeMB} MB` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      if (metaLine) {
        pdf.text(metaLine, 30, y);
        y += 14;
      }
      pdf.text(`Fecha: ${date}`, 30, y);
      y += 14;
      pdf.text(
        `Hallazgos – Alto: ${counts.high} / Medio: ${counts.medium} / Bajo: ${counts.low}`,
        30,
        y
      );
      y += 16;

      // ---- ORDEN Y CUERPO DE TABLA ----
      // Copiamos y ordenamos (no muta la prop)
      const sorted = [...findings].sort(
        (a, b) => sevOrder[a.severity] - sevOrder[b.severity]
      );

      const head = [["Severidad", "Título", "Puntos clave", "Evidencia"]];
      const body = sorted.map((f) => {
        const sev = sevLabel[f.severity]; // "Bajo" | "Medio" | "Alto"
        const bullets = Array.isArray(f.meta?.bullets)
          ? (f.meta!.bullets as string[]).slice(0, 3).join(" • ")
          : "";
        const evidence = (f.evidence ?? "")
          .replace(/\s+/g, " ")
          .slice(0, 400);
        return [sev, f.title, bullets, evidence];
      });

      // ---- TABLA ----
      autoTable(pdf, {
        
        head: [["Severidad", "Título", "Puntos clave", "Evidencia"]],
        body,
        startY: y,
        margin: { left: 30, right: 30 },
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 4,
          overflow: "linebreak",
          valign: "top",
        },
        headStyles: {
          fillColor: [66, 133, 244], // azul
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 65, halign: "center" },
          1: { cellWidth: 120 },
          2: { cellWidth: 140, fillColor: [245, 245, 245] }, // gris claro
          3: { cellWidth: 180, font: "courier", fontSize: 8 }, // evidencia mono
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const sev = data.cell.raw as string;
            if (sev === "Alto") data.cell.styles.fillColor = [239, 68, 68]; // rojo
            if (sev === "Medio") data.cell.styles.fillColor = [253, 224, 71]; // amarillo
            if (sev === "Bajo") data.cell.styles.fillColor = [134, 239, 172]; // verde
            data.cell.styles.textColor = 0;
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: () => {
          pdf.setFontSize(9);
          pdf.setTextColor(100);
          const str = `Página ${pdf.getNumberOfPages()}`;
          pdf.text(
            str,
            pdf.internal.pageSize.getWidth() - 60,
            pdf.internal.pageSize.getHeight() - 20
          );
        },
      });

      // Disclaimer final
      pdf.addPage();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Disclaimer", 30, 50);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(
        "Este análisis es informativo y no constituye asesoría legal. Revisá tus decisiones con un/a profesional.",
        30,
        70,
        { maxWidth: pageW - 60 }
      );

      pdf.save(fileName);
    } catch (e) {
      console.error("[ReportButton] Error generando PDF:", e);
      alert("No se pudo generar el PDF. Revisá la consola.");
    }
  };

  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm border ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-50"
      }`}
      title={disabled ? "Analizá un PDF primero" : "Descargar informe PDF"}
    >
      <Download size={16} />
      Descargar informe
    </button>
  );
}
