// vite.config.ts
import react from "file:///Users/isabelnavamagallanes/Documents/A-Documents/mikey/SnagemV3/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { defineConfig } from "file:///Users/isabelnavamagallanes/Documents/A-Documents/mikey/SnagemV3/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          mantine: ["@mantine/core", "@mantine/hooks", "@mantine/form"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
          tiptap: ["@tiptap/react", "@tiptap/starter-kit"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvaXNhYmVsbmF2YW1hZ2FsbGFuZXMvRG9jdW1lbnRzL0EtRG9jdW1lbnRzL21pa2V5L1NuYWdlbVYzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvaXNhYmVsbmF2YW1hZ2FsbGFuZXMvRG9jdW1lbnRzL0EtRG9jdW1lbnRzL21pa2V5L1NuYWdlbVYzL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9pc2FiZWxuYXZhbWFnYWxsYW5lcy9Eb2N1bWVudHMvQS1Eb2N1bWVudHMvbWlrZXkvU25hZ2VtVjMvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBidWlsZDoge1xuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICByZWFjdDogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIiwgXCJyZWFjdC1yb3V0ZXItZG9tXCJdLFxuICAgICAgICAgIG1hbnRpbmU6IFtcIkBtYW50aW5lL2NvcmVcIiwgXCJAbWFudGluZS9ob29rc1wiLCBcIkBtYW50aW5lL2Zvcm1cIl0sXG4gICAgICAgICAgZmlyZWJhc2U6IFtcImZpcmViYXNlL2FwcFwiLCBcImZpcmViYXNlL2F1dGhcIiwgXCJmaXJlYmFzZS9maXJlc3RvcmVcIiwgXCJmaXJlYmFzZS9zdG9yYWdlXCJdLFxuICAgICAgICAgIHRpcHRhcDogW1wiQHRpcHRhcC9yZWFjdFwiLCBcIkB0aXB0YXAvc3RhcnRlci1raXRcIl0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBa1gsT0FBTyxXQUFXO0FBQ3BZLFNBQVMsb0JBQW9CO0FBRzdCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixPQUFPLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ2hELFNBQVMsQ0FBQyxpQkFBaUIsa0JBQWtCLGVBQWU7QUFBQSxVQUM1RCxVQUFVLENBQUMsZ0JBQWdCLGlCQUFpQixzQkFBc0Isa0JBQWtCO0FBQUEsVUFDcEYsUUFBUSxDQUFDLGlCQUFpQixxQkFBcUI7QUFBQSxRQUNqRDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
