import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // O tsconfig usa jsx: "preserve" (quem transforma é o Next). Nos testes quem
  // transforma é o esbuild, então o runtime automático precisa ser explícito —
  // sem isso, importar um componente .tsx quebra com "React is not defined".
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
