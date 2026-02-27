import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: mode === 'production' ? '/packages/apex-nebula/' : '/',
    plugins: [
        vue(),
        federation({
            name: "apex-nebula",
            filename: "remoteEntry.js",
            exposes: {
                "./ApexNebula": "./src/ApexNebula.vue",
                "./GameInfo": "./src/GameInfo.vue",
            },
            shared: ["vue", "@xstate/vue", "xstate", "@mykoboard/integration"],
        }),
    ],
    server: {
        port: 5005,
        cors: true,
    },
    preview: {
        port: 5005,
        cors: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "../../src"),
        },
    },
    build: {
        modulePreload: false,
        target: "esnext",
        cssCodeSplit: false,
    },
}));
