import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";

/** Directory containing this file — always use for `.env` + aliases (not `process.cwd()`). */
const configDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * When `VITE_DEV_PROXY_TARGET` is set (e.g. `https://apigp.mygendaphool.com`) and
 * `VITE_API_BASE_URL=/api/v1`, the browser calls same-origin `/api/v1/...` and Vite
 * forwards `/api` to the real API — avoids CORS and fixes 404 on auth/login.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, configDir, "");
  const proxyTarget = String(env.VITE_DEV_PROXY_TARGET ?? "")
    .trim()
    .replace(/\/+$/, "");
  const enableApiProxy = Boolean(proxyTarget);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(configDir, "./src"),
      },
    },
    css: {
      postcss: "./postcss.config.cjs",
    },
    server: enableApiProxy
      ? {
          proxy: {
            "/api": {
              target: proxyTarget,
              changeOrigin: true,
              secure: true,
            },
          },
        }
      : undefined,
    build: {
      chunkSizeWarningLimit: 500,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-motion": ["framer-motion"],
            "vendor-charts": ["chart.js", "react-chartjs-2"],
            "vendor-maps": ["@react-google-maps/api"],
            "vendor-ui": ["react-hot-toast", "react-icons", "lucide-react"],
            "vendor-forms": [
              "react-hook-form",
              "react-datepicker",
              "date-fns",
            ],
          },
        },
      },
    },
  };
});
