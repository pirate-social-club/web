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

function buildHomeVideoFeedBootstrapScript(publicUrl: string, scopeKey: string): string {
  const parsedPublicUrl = new URL(publicUrl);
  const viewerNeutral = parsedPublicUrl.pathname.startsWith("/public-communities/");
  const authenticatedUrl = new URL(publicUrl);
  authenticatedUrl.pathname = authenticatedUrl.pathname.replace(/\/public$/u, "");
  const locale = parsedPublicUrl.searchParams.get("locale") ?? "en";

  return `(function(){try{var publicUrl=${JSON.stringify(publicUrl)};var authenticatedUrl=${JSON.stringify(authenticatedUrl.toString())};var viewerNeutral=${JSON.stringify(viewerNeutral)};var locale=${JSON.stringify(locale)};var scopeKey=${JSON.stringify(scopeKey)};var token=null;try{var raw=localStorage.getItem("pirate_session");var session=raw?JSON.parse(raw):null;token=session&&typeof session.accessToken==="string"?session.accessToken:null;if(token){var part=token.split(".")[1];if(part){var normalized=part.replace(/-/g,"+").replace(/_/g,"/");var payload=JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,"=")));if(typeof payload.exp==="number"&&payload.exp*1000<=Date.now())token=null;}}}catch(_error){token=null;}var authenticated=!viewerNeutral&&Boolean(token);var request=function(withToken){return fetch(withToken?authenticatedUrl:publicUrl,{headers:withToken&&token?{Authorization:"Bearer "+token}:undefined}).then(function(response){if(response.status===401&&withToken)return request(false);if(!response.ok)return{ok:false};return response.json().then(function(body){return{ok:true,response:body};});}).catch(function(){return{ok:false};});};window.__pirateHomeVideoFeedBootstrap={authenticated:authenticated,locale:locale,scopeKey:scopeKey,promise:request(authenticated)};}catch(_error){}})();`;
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
  const effectivePath = new URL(ctx.effectiveUrl ?? "https://pirate.sc/").pathname;
  const isTelegramMiniApp = effectivePath === "/tg" || effectivePath.startsWith("/tg/");
  const canonicalUrl = ctx.canonicalUrl ?? null;
  const seo = ctx.seoMetadata ?? null;
  const expectsEntitySeoMetadata = ctx.expectsEntitySeoMetadata === true;
  const shouldRenderSocialMetadata = seo !== null || !expectsEntitySeoMetadata;
  const pageTitle = seo?.title?.trim() || "Pirate";
  const pageDescription = seo?.description?.trim()
    || (expectsEntitySeoMetadata ? null : "Human-first communities. From book clubs to aspiring space colonies");
  const defaultImageUrl = expectsEntitySeoMetadata ? null : resolveDefaultShareImageUrl(ctx);
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
  const homeFeedScopeKey = ctx.homeFeedScopeKey ?? "global";
  const homeFeedApiOrigin = homeFeedPreloadUrl ? new URL(homeFeedPreloadUrl).origin : null;
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
        {isTelegramMiniApp ? (
          <script src="https://telegram.org/js/telegram-web-app.js" />
        ) : null}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#222324" />
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <title>{pageTitle}</title>
        {pageDescription ? <meta name="description" content={pageDescription} /> : null}
        {shouldRenderSocialMetadata ? <meta property="og:type" content={ogType} /> : null}
        {shouldRenderSocialMetadata ? <meta property="og:locale" content={ogLocale} /> : null}
        {shouldRenderSocialMetadata ? <meta property="og:title" content={pageTitle} /> : null}
        {shouldRenderSocialMetadata && pageDescription ? <meta property="og:description" content={pageDescription} /> : null}
        {shouldRenderSocialMetadata && pageUrl ? <meta property="og:url" content={pageUrl} /> : null}
        {shouldRenderSocialMetadata ? <meta property="og:site_name" content="Pirate" /> : null}
        {shouldRenderSocialMetadata && pageImageUrl ? <meta property="og:image" content={pageImageUrl} /> : null}
        {shouldRenderSocialMetadata && pageImageUrl ? <meta property="og:image:url" content={pageImageUrl} /> : null}
        {shouldRenderSocialMetadata && pageImageUrl ? <meta property="og:image:secure_url" content={pageImageUrl} /> : null}
        {shouldRenderSocialMetadata && pageImageUrl && pageImageType ? <meta property="og:image:type" content={pageImageType} /> : null}
        {shouldRenderSocialMetadata && pageImageUrl && pageImageWidth ? <meta property="og:image:width" content={String(pageImageWidth)} /> : null}
        {shouldRenderSocialMetadata && pageImageUrl && pageImageHeight ? <meta property="og:image:height" content={String(pageImageHeight)} /> : null}
        {shouldRenderSocialMetadata && pageImageUrl ? <meta property="og:image:alt" content={pageImageAlt} /> : null}
        {shouldRenderSocialMetadata && pageImageUrl ? <meta itemProp="image" content={pageImageUrl} /> : null}
        {shouldRenderSocialMetadata ? <meta name="twitter:card" content={twitterCard} /> : null}
        {shouldRenderSocialMetadata ? <meta name="twitter:title" content={pageTitle} /> : null}
        {shouldRenderSocialMetadata && pageDescription ? <meta name="twitter:description" content={pageDescription} /> : null}
        {shouldRenderSocialMetadata && pageImageUrl ? <meta name="twitter:image" content={pageImageUrl} /> : null}
        {shouldRenderSocialMetadata && pageImageUrl ? <meta name="twitter:image:src" content={pageImageUrl} /> : null}
        {shouldRenderSocialMetadata && pageImageUrl ? <meta name="twitter:image:alt" content={pageImageAlt} /> : null}
        {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
        {shouldRenderSocialMetadata && pageImageUrl ? <link rel="image_src" href={pageImageUrl} /> : null}
        {!ctx.isIndexable ? <meta name="robots" content="noindex, nofollow" /> : null}
        <link rel="stylesheet" href={stylesUrl} />
        {homeFeedApiOrigin ? <link crossOrigin="anonymous" href={homeFeedApiOrigin} rel="preconnect" /> : null}
        {homeFeedPreloadUrl ? <link crossOrigin="anonymous" href="https://psc.myfilebase.com" rel="preconnect" /> : null}
        {homeFeedPreloadUrl ? (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: buildHomeVideoFeedBootstrapScript(homeFeedPreloadUrl, homeFeedScopeKey),
            }}
          />
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
