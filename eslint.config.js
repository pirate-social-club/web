import reactHooks from "eslint-plugin-react-hooks";
import typescriptParser from "@typescript-eslint/parser";
import solidReactivity from "./scripts/eslint/solid-reactivity.mjs";

export default [
  {
    ignores: ["src/vendor/**", "**/storybook-static/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    ignores: ["packages/solid-ui/**"],
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
  {
    files: ["solid/**/*.{ts,tsx}", "packages/solid-ui/**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "solid-reactivity": solidReactivity,
    },
    rules: {
      "solid-reactivity/two-argument-create-effect": "error",
      "solid-reactivity/no-story-alias": "error",
    },
  },
];
