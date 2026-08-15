import reactHooks from "eslint-plugin-react-hooks";
import typescriptParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["src/vendor/**", "solid/**", "packages/solid-ui/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
