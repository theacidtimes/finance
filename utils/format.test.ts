import { describe, it, expect } from "vitest";
import { parseDateBR, formatDate } from "./format";

describe("parseDateBR", () => {
  const ano = new Date().getFullYear();
  it("converte formatos brasileiros para ISO", () => {
    expect(parseDateBR("15/10/2026")).toBe("2026-10-15");
    expect(parseDateBR("5/3/26")).toBe("2026-03-05");
    expect(parseDateBR("15/10")).toBe(`${ano}-10-15`);
    expect(parseDateBR("15.10.2026")).toBe("2026-10-15");
  });
  it("mantém ISO", () => {
    expect(parseDateBR("2026-10-15")).toBe("2026-10-15");
  });
  it("texto vazio ou inválido vira null", () => {
    expect(parseDateBR("")).toBeNull();
    expect(parseDateBR("  ")).toBeNull();
    expect(parseDateBR("semana que vem")).toBeNull();
    expect(parseDateBR("31/02/2026")).toBeNull();
    expect(parseDateBR("15/13")).toBeNull();
  });
  it("ida e volta com formatDate", () => {
    expect(formatDate(parseDateBR("15/10/2026"))).toBe("15/10/2026");
  });
});
