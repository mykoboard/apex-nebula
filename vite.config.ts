import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: mode === 'production' ? '/packages/apex-nebula/' : '/',
    plugins: [
        react(),
        federation({
            name: "apex-nebula",
            filename: "remoteEntry.js",
            exposes: {
                "./ApexNebula": "./src/ApexNebula.tsx",
                "./GameInfo": "./src/GameInfo.tsx",
            },
            shared: ["react", "react-dom", "@xstate/react", "xstate", "@mykoboard/integration"],
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
