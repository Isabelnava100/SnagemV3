import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          mantine: ["@mantine/core", "@mantine/hooks", "@mantine/form"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
          tiptap: ["@tiptap/react", "@tiptap/starter-kit"],
        },
      },
    },
  },
});
