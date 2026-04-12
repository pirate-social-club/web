import type { RequestInfo } from "rwsdk/worker";

import { readPublicRuntimeEnv } from "@/lib/public-runtime-env";
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
  dir: UiDirection;
  locale: UiLocaleCode;
  theme: ThemeMode;
};

type DocumentProps = RequestInfo<any, AppContext> & {
  children: React.ReactNode;
};

export const Document: React.FC<DocumentProps> = ({
  children,
  ctx,
  rw,
}) => {
  const isDev = import.meta.env.DEV;
  const publicEnv = readPublicRuntimeEnv();
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
            __html: `globalThis.__PIRATE_ENV__=${JSON.stringify(publicEnv)};globalThis.process=globalThis.process||{};globalThis.process.env=Object.assign(globalThis.process.env||{},${JSON.stringify(publicEnv)},{PRIVY_APP_ID:${JSON.stringify(publicEnv.VITE_PRIVY_APP_ID)}});`,
          }}
        />
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
