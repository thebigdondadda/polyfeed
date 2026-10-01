import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const proxies = {
  "/api": {
    target: "https://data-api.polymarket.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ""),
  },
  "/gamma": {
    target: "https://gamma-api.polymarket.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/gamma/, ""),
  },
  "/clob": {
    target: "https://clob.polymarket.com",
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => path.replace(/^\/clob/, ""),
    configure(proxy) {
      proxy.on("proxyReq", (proxyReq, req) => {
        const incoming = req.headers;
        for (const [name, value] of Object.entries(incoming)) {
          if (!name.toLowerCase().startsWith("poly") || value == null) continue;
          const canonical = name.replace(/-/g, "_").toUpperCase();
          proxyReq.setHeader(canonical, value);
        }
      });
    },
  },
  "/polygon-rpc": {
    target: "https://1rpc.io",
    changeOrigin: true,
    secure: true,
    rewrite: () => "/matic",
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: proxies,
  },
  preview: {
    proxy: proxies,
  },
});
