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
          // Mantine and tiptap are intentionally NOT force-grouped: letting
          // the bundler split them per route keeps first paint from
          // downloading every component used anywhere in the app. Forcing
          // them into one chunk previously made the whole bundle eager.
          if (/node_modules\/(@firebase|firebase)\//.test(id)) return "firebase";
        },
      },
    },
  },
});
