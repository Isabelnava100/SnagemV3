import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id))
            return "react";
          if (id.includes("node_modules/@mantine/")) return "mantine";
          if (/node_modules\/(@firebase|firebase)\//.test(id)) return "firebase";
          if (/node_modules\/(@tiptap|prosemirror)/.test(id)) return "tiptap";
        },
      },
    },
  },
});
