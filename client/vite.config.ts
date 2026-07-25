import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ command }) => ({
  plugins: [tsconfigPaths(), tailwindcss(), tanstackStart({
    server: { entry: "server" }
  }), react(), cloudflare({
    viteEnvironment: {
      name: "ssr"
    }
  })],
  server: {
    port: 3000,
  },
  ssr: {
    noExternal: command === "build" ? true : undefined
  }
}));