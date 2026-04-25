import type { DocumentProps } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";

import type { AppContext } from "@/app/app-context";
import {
  resolveLocaleDirection,
  resolveLocaleLanguageTag,
  type UiLocaleCode,
} from "@/lib/ui-locale-core";

import stylesUrl from "@/styles/tokens.css?url";

function resolveOpenGraphLocale(locale: UiLocaleCode): string {
  if (locale === "ar") return "ar_AR";
  if (locale === "zh") return "zh_CN";
  return "en_US";
}

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
  const canonicalUrl = ctx.canonicalUrl ?? null;
  const seo = ctx.seoMetadata ?? null;
  const pageTitle = seo?.title?.trim() || "Pirate Social Club";
  const pageDescription = seo?.description?.trim() || null;
  const pageImageUrl = seo?.imageUrl?.trim() || null;
  const ogType = seo?.type ?? "website";
  const ogLocale = resolveOpenGraphLocale(locale);
  const twitterCard = pageImageUrl ? "summary_large_image" : "summary";
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
        <title>{pageTitle}</title>
        {pageDescription ? <meta name="description" content={pageDescription} /> : null}
        <meta property="og:type" content={ogType} />
        <meta property="og:locale" content={ogLocale} />
        <meta property="og:title" content={pageTitle} />
        {pageDescription ? <meta property="og:description" content={pageDescription} /> : null}
        {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
        <meta property="og:site_name" content="Pirate" />
        {pageImageUrl ? <meta property="og:image" content={pageImageUrl} /> : null}
        <meta name="twitter:card" content={twitterCard} />
        <meta name="twitter:title" content={pageTitle} />
        {pageDescription ? <meta name="twitter:description" content={pageDescription} /> : null}
        {pageImageUrl ? <meta name="twitter:image" content={pageImageUrl} /> : null}
        {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
        {!ctx.isIndexable ? <meta name="robots" content="noindex, nofollow" /> : null}
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
