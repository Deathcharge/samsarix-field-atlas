import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const pagesBuild = mode === "pages";

  return {
    base: pagesBuild ? "/samsarix-field-atlas/" : process.env.BASE_PATH || "/",
    plugins: [react()],
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      emptyOutDir: !pagesBuild,
      outDir: path.resolve(
        import.meta.dirname,
        pagesBuild ? "docs" : "dist/public"
      ),
      sourcemap: !pagesBuild,
      ...(pagesBuild
        ? {
            rollupOptions: {
              output: {
                assetFileNames: "assets/field-atlas.min[extname]",
                chunkFileNames: "assets/[name].min.js",
                entryFileNames: "assets/field-atlas.min.js",
              },
            },
          }
        : {}),
    },
    server: {
      host: "127.0.0.1",
      port: 3000,
      strictPort: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
    },
  };
});
