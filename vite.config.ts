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
          //
          // Firebase: only app + auth are eager (the AuthContext chunk
          // statically imports them on boot). Firestore/Storage/Functions load
          // on first actual use via dynamic import, so grouping every firebase
          // package into one chunk would drag ~180KB gzip of Firestore into
          // the boot path. Shared @firebase/* utils stay ungrouped; the
          // bundler places them with their importers.
          if (/node_modules\/(@firebase\/(app|auth)|firebase\/(app|auth))\//.test(id))
            return "firebase";
          if (/node_modules\/(@firebase\/firestore|firebase\/firestore)\//.test(id))
            return "firestore";
        },
      },
    },
  },
});
