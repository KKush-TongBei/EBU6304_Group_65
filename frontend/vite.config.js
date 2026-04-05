import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
/** 与 Tomcat 上 WAR 的 context path 一致（ta-recruit.war → /ta-recruit） */
const TOMCAT_API_PREFIX = "/ta-recruit";
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://127.0.0.1:8080",
                changeOrigin: true,
                rewrite: (path) => `${TOMCAT_API_PREFIX}${path}`,
            },
        },
    },
});
