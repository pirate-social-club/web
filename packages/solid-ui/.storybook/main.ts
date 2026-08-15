import path from "node:path";

import remarkGfm from "remark-gfm";
import type { StorybookConfig } from "storybook-solidjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)", "../src/**/*.mdx"],
  addons: [
    {
      name: "@storybook/addon-docs",
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "storybook-solidjs-vite",
  },
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    resolve: {
      ...viteConfig.resolve,
      alias: {
        ...(viteConfig.resolve?.alias ?? {}),
        "@": path.resolve(import.meta.dirname, "../src"),
      },
    },
    server: {
      ...viteConfig.server,
      watch: {
        ...(viteConfig.server?.watch ?? {}),
        ignored: ["**/.tmp/**", "**/worktrees/**"],
      },
    },
  }),
};

export default config;
