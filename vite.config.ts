import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: "./",
    plugins: [
        vue(),
        ...(process.env.FEDERATION === "true"
            ? [
                  federation({
                      name: "apex-nebula",
                      filename: "remoteEntry.js",
                      exposes: {
                          "./ApexNebula": "./src/ApexNebula.vue",
                          "./GameInfo": "./src/GameInfo.vue",
                      },
                      shared: ["vue", "@xstate/vue", "xstate"],
                  }),
              ]
            : []),
    ],
    server: {
        host: true,
        port: 5005,
        strictPort: true,
        origin: "http://localhost:5005",
        cors: {
            origin: "*",
            methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
            preflightContinue: false,
            optionsSuccessStatus: 204,
        },
        allowedHosts: true,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Private-Network": "true",
        },
    },
    preview: {
        host: true,
        port: 5005,
        strictPort: true,
        cors: {
            origin: "*",
            methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
            preflightContinue: false,
            optionsSuccessStatus: 204,
        },
        allowedHosts: true,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Private-Network": "true",
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@mykoboard/integration": path.resolve(__dirname, "./src/lib/integration.ts"),
        },
    },
    build: {
        modulePreload: false,
        target: "esnext",
        cssCodeSplit: false,
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
                entryFileNames: "assets/index.js",
                assetFileNames: "assets/[name].[ext]",
            },
        },
    },
}));
