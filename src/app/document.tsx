import type { DocumentProps } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";

import type { AppContext } from "@/app/app-context";
import {
  resolveLocaleDirection,
  resolveLocaleLanguageTag,
  type UiLocaleCode,
} from "@/lib/ui-locale-core";
import {
  DEFAULT_SHARE_IMAGE_HEIGHT,
  DEFAULT_SHARE_IMAGE_PATH,
  DEFAULT_SHARE_IMAGE_TYPE,
  DEFAULT_SHARE_IMAGE_WIDTH,
} from "@/lib/share-metadata";

import stylesUrl from "@/styles/tokens.css?url";

function resolveOpenGraphLocale(locale: UiLocaleCode): string {
  if (locale === "ar") return "ar_AR";
  if (locale === "zh") return "zh_CN";
  return "en_US";
}

function resolveDefaultShareImageUrl(ctx: AppContext): string | null {
  const origin = ctx.appOrigin?.trim()
    || (ctx.canonicalUrl ? new URL(ctx.canonicalUrl).origin : null);
  return origin ? new URL(DEFAULT_SHARE_IMAGE_PATH, origin).toString() : null;
}

function isDefaultShareImageUrl(value: string | null): boolean {
  if (!value) return false;

  try {
    return new URL(value).pathname === DEFAULT_SHARE_IMAGE_PATH;
  } catch {
    return false;
  }
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
  const pageTitle = seo?.title?.trim() || "Pirate";
  const pageDescription = seo?.description?.trim() || "Human-first communities. From book clubs to aspiring space colonies";
  const defaultImageUrl = resolveDefaultShareImageUrl(ctx);
  const pageImageUrl = seo?.imageUrl?.trim() || defaultImageUrl;
  const usesDefaultImage = isDefaultShareImageUrl(pageImageUrl);
  const pageImageAlt = seo?.imageAlt?.trim() || pageTitle;
  const pageImageWidth = seo?.imageWidth ?? (usesDefaultImage ? DEFAULT_SHARE_IMAGE_WIDTH : null);
  const pageImageHeight = seo?.imageHeight ?? (usesDefaultImage ? DEFAULT_SHARE_IMAGE_HEIGHT : null);
  const pageImageType = seo?.imageType?.trim() || (usesDefaultImage ? DEFAULT_SHARE_IMAGE_TYPE : null);
  const pageUrl = seo?.url?.trim() || canonicalUrl;
  const ogType = seo?.type ?? "website";
  const ogLocale = resolveOpenGraphLocale(locale);
  const twitterCard = pageImageUrl ? "summary_large_image" : "summary";
  const homeFeedPreloadUrl = ctx.homeFeedPreloadUrl ?? null;
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
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <title>{pageTitle}</title>
        {pageDescription ? <meta name="description" content={pageDescription} /> : null}
        <meta property="og:type" content={ogType} />
        <meta property="og:locale" content={ogLocale} />
        <meta property="og:title" content={pageTitle} />
        {pageDescription ? <meta property="og:description" content={pageDescription} /> : null}
        {pageUrl ? <meta property="og:url" content={pageUrl} /> : null}
        <meta property="og:site_name" content="Pirate" />
        {pageImageUrl ? <meta property="og:image" content={pageImageUrl} /> : null}
        {pageImageUrl ? <meta property="og:image:url" content={pageImageUrl} /> : null}
        {pageImageUrl ? <meta property="og:image:secure_url" content={pageImageUrl} /> : null}
        {pageImageUrl && pageImageType ? <meta property="og:image:type" content={pageImageType} /> : null}
        {pageImageUrl && pageImageWidth ? <meta property="og:image:width" content={String(pageImageWidth)} /> : null}
        {pageImageUrl && pageImageHeight ? <meta property="og:image:height" content={String(pageImageHeight)} /> : null}
        {pageImageUrl ? <meta property="og:image:alt" content={pageImageAlt} /> : null}
        {pageImageUrl ? <meta itemProp="image" content={pageImageUrl} /> : null}
        <meta name="twitter:card" content={twitterCard} />
        <meta name="twitter:title" content={pageTitle} />
        {pageDescription ? <meta name="twitter:description" content={pageDescription} /> : null}
        {pageImageUrl ? <meta name="twitter:image" content={pageImageUrl} /> : null}
        {pageImageUrl ? <meta name="twitter:image:src" content={pageImageUrl} /> : null}
        {pageImageUrl ? <meta name="twitter:image:alt" content={pageImageAlt} /> : null}
        {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
        {pageImageUrl ? <link rel="image_src" href={pageImageUrl} /> : null}
        {!ctx.isIndexable ? <meta name="robots" content="noindex, nofollow" /> : null}
        <link rel="stylesheet" href={stylesUrl} />
        {homeFeedPreloadUrl ? (
          <link as="fetch" crossOrigin="anonymous" href={homeFeedPreloadUrl} rel="preload" type="application/json" />
        ) : null}
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
        <script defer nonce={nonce} type="module" src={clientModuleUrl} />
      </body>
    </html>
  );
};
