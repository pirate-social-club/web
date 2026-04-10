import type { RequestInfo } from "rwsdk/worker";
import { requestInfo } from "rwsdk/worker";

import { UiLocaleProvider } from "@/lib/ui-locale";
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

export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const isDev = import.meta.env.DEV;
  const currentRequestInfo = requestInfo as RequestInfo<any, AppContext>;
  const locale = currentRequestInfo.ctx.locale ?? "en";
  const dir = currentRequestInfo.ctx.dir ?? resolveLocaleDirection(locale);
  const theme = currentRequestInfo.ctx.theme ?? "dark";
  const nonce = currentRequestInfo.rw.nonce;
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
        <UiLocaleProvider dir={dir} locale={locale}>
          {children}
        </UiLocaleProvider>
        <script nonce={nonce} type="module" src={clientModuleUrl} />
      </body>
    </html>
  );
};
