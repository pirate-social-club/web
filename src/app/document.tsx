import type { DocumentProps } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";

import {
  resolveLocaleDirection,
  resolveLocaleLanguageTag,
  type UiDirection,
  type UiLocaleCode,
} from "@/lib/ui-locale-core";

import stylesUrl from "@/styles/tokens.css?url";

type ThemeMode = "dark" | "light" | "system";

type AppContext = {
  dir?: UiDirection;
  locale?: UiLocaleCode;
  theme?: ThemeMode;
};

export const Document: React.FC<DocumentProps<RequestInfo<any, AppContext>>> = ({
  children,
  ctx,
  rw,
}) => {
  const isDev = import.meta.env.DEV;
  const locale = ctx.locale ?? "en";
  const dir = ctx.dir ?? resolveLocaleDirection(locale);
  const theme = ctx.theme ?? "dark";
  const nonce = rw.nonce;
  const clientModuleUrl = isDev
    ? "/src/client.tsx"
    : "rwsdk_asset:/src/client.tsx";
  const reactRefreshPreambleScript = `import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;`;

  return (
    <html
      className={theme === "light" ? undefined : "dark"}
      data-theme={theme}
      dir={dir}
      lang={resolveLocaleLanguageTag(locale)}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#222324" />
        <title>Pirate Social Club</title>
        <link rel="stylesheet" href={stylesUrl} />
        <link rel="modulepreload" href={clientModuleUrl} />
        {isDev ? (
          <script
            nonce={nonce}
            type="module"
            dangerouslySetInnerHTML={{
              __html: reactRefreshPreambleScript,
            }}
          />
        ) : null}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){var theme=${JSON.stringify(theme)};var prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;var useDark=theme!=="light"&&(theme==="dark"||prefersDark);document.documentElement.classList.toggle("dark",useDark);document.documentElement.classList.toggle("light",!useDark);document.documentElement.dataset.theme=theme;})();`,
          }}
        />
      </head>
      <body>
        {children}
        <script nonce={nonce} type="module" src={clientModuleUrl} />
      </body>
    </html>
  );
};
