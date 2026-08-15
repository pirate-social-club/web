import remarkGfm from "remark-gfm";
import type { StorybookConfig } from "storybook-solidjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
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
    options: {
      builder: {
        viteConfigPath: ".storybook/vite.config.ts",
      },
    },
  },
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
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
