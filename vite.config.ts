// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Vite does not put non-VITE_ vars from .env into process.env. Load server-only DB vars
// so DATABASE_URL in .env (e.g. on EC2) is picked up by the server data layer.
const fileEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
for (const key of ["DATABASE_URL", "DATABASE_SSL"]) {
  if (fileEnv[key] && !process.env[key]) process.env[key] = fileEnv[key];
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
