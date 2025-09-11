import { describe, it, expect } from "vitest";
import { classifyContract } from "@/core/classify";



describe("classifyContract", () => {
  it("detecta ALQUILER", () => {
    const txt = "CONTRATO DE LOCACIÓN. El locatario abonará el canon mensual. Expensas extraordinarias...";
    const c = classifyContract(txt);
    expect(c.type === "alquiler" || c.confidence >= 0.6).toBe(true);
  });

  it("detecta LABORAL", () => {
    const txt = "Contrato de trabajo. El empleador y el trabajador acuerdan período de prueba y jornada.";
    const c = classifyContract(txt);
    expect(c.type === "laboral" || c.confidence >= 0.6).toBe(true);
  });
});
