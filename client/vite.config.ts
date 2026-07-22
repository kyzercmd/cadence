import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" }
    }),
    react(),
  ],
  server: {
    port: 3000,
  },
  ssr: {
    noExternal: command === "build" ? true : undefined
  }
}));
