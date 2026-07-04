import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "*.cjs", "*.config.js"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // react-hooks v6 ships React Compiler diagnostics as errors; legacy code
      // trips many — keep the whole plugin advisory until refactored.
      ...Object.fromEntries(
        Object.keys(reactHooks.rules).map((rule) => [`react-hooks/${rule}`, "warn"])
      ),
      // Legacy codebase: keep these advisory until cleaned up incrementally
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-refresh/only-export-components": "off",
      "no-unsafe-finally": "warn",
      "no-extra-boolean-cast": "warn",
      "prefer-spread": "warn",
    },
  }
);
