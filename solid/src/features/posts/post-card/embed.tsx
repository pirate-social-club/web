// Embed renderers for the post card: link-style previews, the sandboxed
// official YouTube/X iframes, and prediction-market cards. All sanitization
// and presentation derivation lives in embed-safety.ts — this file is view
// only. Provider chart accents come from tokens.css (.embed-market-chart).

import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";

import { IconArrowSquareOut } from "../../../design-system";
import { cn } from "../../../design-system";
import { createUiLocale } from "../../../lib/ui-locale";
import {
  buildEmbedSparkline,
  buildSandboxedXEmbedSrcDoc,
  defaultEmbedLabels,
  formatEmbedDateLabel,
  formatEmbedSource,
  formatProbability,
  isClosedMarketStatus,
  resolveEmbedImage,
  resolveEmbedText,
  resolveSafeYouTubeEmbed,
  resolveXTweetId,
  X_EMBED_SANDBOX,
  YOUTUBE_IFRAME_ALLOW,
  type EmbedContent,
  type EmbedLabels,
} from "./embed-safety";
import { postCardTextWrap, postCardType } from "./styles";

export interface PostEmbedLabels extends Partial<EmbedLabels> {
  noChart?: string;
  recentOddsMovement?: string;
  openArticle?: (source: string) => string;
}

function useEmbedLabels(labels?: PostEmbedLabels): EmbedLabels & Required<Pick<PostEmbedLabels, "noChart" | "recentOddsMovement">> {
  return {
    ...defaultEmbedLabels,
    noChart: "No chart",
    recentOddsMovement: "Recent odds movement",
    ...labels,
  } as EmbedLabels & { noChart: string; recentOddsMovement: string };
}

function PredictionMarketEmbed(props: {
  class?: string;
  content: EmbedContent;
  labels: PostEmbedLabels;
}) {
  const { locale } = createUiLocale();
  const labels = () => useEmbedLabels(props.labels);
  const preview = () => props.content.preview;
  const question = () => resolveEmbedText(props.content, labels());
  const provider = () => formatEmbedSource(props.content, labels());
  const isClosed = () => isClosedMarketStatus(preview()?.status);
  const yesPrice = () => preview()?.yesPrice ?? preview()?.lastPrice;
  const resolution = () => preview()?.resolution ?? null;
  const sparkline = () => buildEmbedSparkline(preview()?.chart, locale());
  const closeLabel = () => formatEmbedDateLabel(preview()?.closeTime, locale());
  const imageSrc = () => preview()?.imageUrl?.trim();
  const footerDateLabel = () => {
    const close = closeLabel();
    if (!close) return null;
    return `${resolution() ? labels().settled : isClosed() ? labels().closed : labels().closes} ${close}`;
  };
  const isMultiOutcome = () => (preview()?.outcomes?.length ?? 0) >= 2;
  const resolvedOutcome = () => preview()?.resolvedOutcome?.trim();
  const resolvedOutcomeLabel = () => {
    const resolved = resolvedOutcome();
    if (!resolved) return null;
    return preview()?.outcomes?.find((outcome) => outcome.label === resolved)?.translatedLabel?.trim() || resolved;
  };
  const visibleOutcomes = () => (preview()?.outcomes ?? []).filter((outcome) => outcome.label !== resolvedOutcome());
  const marketState = () => {
    const res = resolution();
    if (res) {
      return { label: res === "yes" ? labels().resolvedYes : labels().resolvedNo, resolved: true };
    }
    if (isClosed() && !isMultiOutcome()) {
      return { label: labels().closed, resolved: false };
    }
    return null;
  };

  return (
    <a
      class={cn(
        "embed-market-chart block w-full rounded-lg border border-border-soft bg-muted/20 p-3 text-start transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        props.class,
      )}
      data-closed={isClosed() ? "true" : undefined}
      data-post-card-interactive="true"
      data-provider={props.content.provider}
      href={props.content.canonicalUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div class="space-y-3">
        <div class="flex min-w-0 items-center gap-3">
          <Show when={imageSrc()}>
            {(src) => (
              <img
                alt=""
                aria-hidden="true"
                class="size-14 shrink-0 rounded-md object-cover"
                src={src()}
              />
            )}
          </Show>
          <div class="min-w-0">
            <p
              class={cn(postCardType.title, postCardTextWrap, "line-clamp-2 font-semibold text-foreground")}
              dir={preview()?.questionDir ?? "auto"}
              lang={preview()?.questionLang ?? undefined}
            >
              {question()}
            </p>
          </div>
        </div>

        <Show
          when={isMultiOutcome()}
          fallback={(
            <Show
              when={marketState()}
              fallback={(
                <div class="flex min-w-0 items-baseline gap-1.5 text-foreground">
                  <div class="text-2xl font-semibold leading-none" style={{ color: "var(--embed-market-text)" }}>
                    {formatProbability(yesPrice())}
                  </div>
                  <div class={cn("font-semibold", postCardType.meta)}>{labels().chance}</div>
                </div>
              )}
            >
              {(state) => (
                <div class="flex min-w-0 items-baseline gap-2 text-foreground">
                  <span class={cn("font-semibold", postCardType.title)}>{state().label}</span>
                  <Show when={state().resolved}>
                    <span class={cn("shrink-0 font-semibold", postCardType.meta)} style={{ color: "var(--embed-market-text)" }}>
                      {labels().closed}
                    </span>
                  </Show>
                </div>
              )}
            </Show>
          )}
        >
          <div class="space-y-2">
            <Show when={resolvedOutcomeLabel()}>
              {(outcomeLabel) => (
                <div class="flex min-w-0 items-baseline gap-2 text-foreground">
                  <span
                    class={cn("truncate font-semibold", postCardType.title)}
                    dir={preview()?.questionDir ?? "auto"}
                    lang={preview()?.questionLang ?? undefined}
                  >
                    {outcomeLabel()}
                  </span>
                  <span class={cn("shrink-0 font-semibold", postCardType.meta)} style={{ color: "var(--embed-market-text)" }}>
                    {labels().closed}
                  </span>
                </div>
              )}
            </Show>
            <For each={visibleOutcomes()}>
              {(outcome) => (
                <div class="space-y-1">
                  <div class={cn("flex min-w-0 items-baseline justify-between gap-2", postCardType.title)}>
                    <span
                      class="truncate text-foreground"
                      dir={preview()?.questionDir ?? "auto"}
                      lang={preview()?.questionLang ?? undefined}
                    >
                      {outcome.translatedLabel?.trim() || outcome.label}
                    </span>
                    <span class="shrink-0 font-semibold" style={{ color: "var(--embed-market-text)" }}>
                      {formatProbability(outcome.probability)}
                    </span>
                  </div>
                  <div class="h-1.5 min-w-0 overflow-hidden rounded-full bg-muted">
                    <div
                      class="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(Math.max(0, Math.min(1, outcome.probability)) * 100)}%`,
                        "background-color": "var(--embed-market-line)",
                      }}
                    />
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={!isMultiOutcome()}>
          <div class="relative h-32 min-w-0 overflow-hidden">
            <div class="absolute bottom-7 left-0 right-12 top-2">
              <div class="embed-market-gridline absolute inset-x-0 top-0 border-t border-dashed" />
              <div class="embed-market-gridline absolute inset-x-0 top-1/2 border-t border-dashed" />
              <div class="embed-market-gridline absolute inset-x-0 bottom-0 border-t border-dashed" />
            </div>
            <div class={cn("pointer-events-none absolute bottom-7 right-0 top-2 grid grid-rows-3 text-muted-foreground/80", postCardType.meta)}>
              <span class="self-start">100%</span>
              <span class="self-center">50%</span>
              <span class="self-end">0%</span>
            </div>
            <Show
              when={sparkline()}
              fallback={(
                <div class={cn("flex size-full items-center justify-center text-muted-foreground", postCardType.meta)}>
                  {labels().noChart}
                </div>
              )}
            >
              {(chart) => (
                <>
                  <div class="absolute bottom-7 left-0 right-12 top-2">
                    <svg
                      aria-label={labels().recentOddsMovement}
                      class="size-full"
                      preserveAspectRatio="none"
                      role="img"
                      viewBox="0 0 320 96"
                    >
                      <path d={chart().areaPath} fill="var(--embed-market-fill)" />
                      <path
                        d={chart().linePath}
                        fill="none"
                        stroke="var(--embed-market-line)"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2.5"
                        vector-effect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                  <div class={cn("absolute bottom-0 left-0 right-12 flex items-center justify-between text-muted-foreground/85", postCardType.meta)}>
                    <span>{chart().startLabel}</span>
                    <span>{chart().endLabel}</span>
                  </div>
                </>
              )}
            </Show>
          </div>
        </Show>

        <Show when={provider() || closeLabel()}>
          <div class={cn("flex min-w-0 items-center justify-between gap-3 border-t border-border-soft pt-2 text-muted-foreground", postCardType.meta)}>
            <div class="flex min-w-0 items-center gap-1">
              <span class="truncate font-semibold text-foreground">{provider()}</span>
              <IconArrowSquareOut class="size-4 shrink-0" />
            </div>
            <Show when={footerDateLabel()}>
              <div class="shrink-0">{footerDateLabel()}</div>
            </Show>
          </div>
        </Show>
      </div>
    </a>
  );
}

export interface PostEmbedPreviewProps {
  class?: string;
  content: EmbedContent;
  labels?: PostEmbedLabels;
}

export function PostEmbedPreview(props: PostEmbedPreviewProps) {
  const labels = () => useEmbedLabels(props.labels);

  return (
    <Show
      when={props.content.provider === "kalshi" || props.content.provider === "polymarket"}
      fallback={(() => {
        const text = () => resolveEmbedText(props.content, labels());
        const imageSrc = () => resolveEmbedImage(props.content);
        return (
          <div class={cn("w-full space-y-2 text-start", props.class)}>
            <a
              class={cn(
                "grid w-full items-stretch gap-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                imageSrc() ? "grid-cols-[minmax(0,7fr)_minmax(5rem,3fr)]" : "grid-cols-1",
              )}
              data-post-card-interactive="true"
              href={props.content.canonicalUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <div class="flex min-h-20 min-w-0 items-center rounded-lg border border-border-soft bg-muted/30 px-3 py-2.5">
                <div class="min-w-0 space-y-1">
                  <p class={cn(postCardType.title, postCardTextWrap, "line-clamp-2 font-semibold text-foreground")} dir="auto">
                    {text()}
                  </p>
                  <div class={cn("flex min-w-0 items-center gap-1.5 text-muted-foreground", postCardType.meta)}>
                    <span class="truncate">{formatEmbedSource(props.content, labels())}</span>
                    <IconArrowSquareOut class="size-4 shrink-0" />
                  </div>
                </div>
              </div>
              <Show when={imageSrc()}>
                {(src) => (
                  <div class="min-h-20 overflow-hidden rounded-lg">
                    <img alt="" aria-hidden="true" class="size-full object-cover" src={src()} />
                  </div>
                )}
              </Show>
            </a>
          </div>
        );
      })()}
    >
      <PredictionMarketEmbed class={props.class} content={props.content} labels={props.labels ?? {}} />
    </Show>
  );
}

export function OfficialYouTubeEmbed(props: PostEmbedPreviewProps) {
  const embed = () => {
    if (props.content.provider !== "youtube" || props.content.state !== "embed" || !props.content.oembedHtml) {
      return null;
    }
    return resolveSafeYouTubeEmbed(props.content.oembedHtml, props.labels?.youtubeVideo ?? defaultEmbedLabels.youtubeVideo);
  };

  return (
    <Show when={embed()} fallback={<PostEmbedPreview {...props} />}>
      {(safeEmbed) => (
        <div
          class={cn(
            "aspect-video w-full overflow-hidden rounded-lg border border-border-soft bg-black [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0",
            props.class,
          )}
          data-post-card-interactive="true"
        >
          <iframe
            allow={YOUTUBE_IFRAME_ALLOW}
            allowfullscreen
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            src={safeEmbed().src}
            title={safeEmbed().title}
          />
        </div>
      )}
    </Show>
  );
}

const X_EMBED_MIN_HEIGHT = 200;
const X_EMBED_MAX_HEIGHT = 800;
const X_EMBED_FALLBACK_HEIGHT = 400;

export function OfficialOEmbed(props: PostEmbedPreviewProps) {
  // Effects never run during SSR, so this flips to true only in the browser
  // and the official iframe renders client-side like the React useIsClient.
  // ownedWrite: the signal is written inside the effect apply phase.
  const [isClient, setIsClient] = createSignal(false, { ownedWrite: true });
  // ownedWrite: written from the window message listener inside an effect.
  const [xEmbedHeight, setXEmbedHeight] = createSignal(X_EMBED_FALLBACK_HEIGHT, { ownedWrite: true });

  createEffect(
    () => true,
    () => {
      setIsClient(true);
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== "https://platform.twitter.com" && event.origin !== "https://platform.x.com") return;
        const data = event.data as Record<string, unknown> | null;
        if (typeof data !== "object" || data === null) return;
        const resize = (data as { ["twttr.embed"]?: { params?: Array<{ height?: unknown }> } })["twttr.embed"]?.params?.[0];
        if (typeof resize?.height === "number") {
          setXEmbedHeight(Math.min(X_EMBED_MAX_HEIGHT, Math.max(X_EMBED_MIN_HEIGHT, Math.round(resize.height))));
        }
      };
      window.addEventListener("message", handleMessage);
      onCleanup(() => window.removeEventListener("message", handleMessage));
    },
  );

  const fallback = () => <PostEmbedPreview {...props} />;

  const xTweetEmbed = () => {
    if (!isClient() || props.content.provider !== "x" || props.content.state !== "embed") {
      return null;
    }
    const tweetId = resolveXTweetId(props.content.canonicalUrl);
    if (!tweetId) return null;
    const embedUrl = `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(tweetId)}&dnt=true&theme=dark`;
    return (
      <div class={cn("w-full rounded-lg border border-border-soft bg-muted/30 p-3", props.class)}>
        <div
          class="mx-auto w-full max-w-[550px] overflow-hidden rounded-lg bg-card transition-[height] duration-200"
          style={{ height: `${xEmbedHeight()}px` }}
        >
          <iframe
            allow="autoplay; fullscreen"
            class="size-full border-0"
            data-post-card-interactive="true"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            src={embedUrl}
            title={props.content.preview?.text?.trim() || props.labels?.xPost || defaultEmbedLabels.xPost}
          />
        </div>
      </div>
    );
  };

  const sandboxedSrcDocEmbed = () => {
    if (props.content.provider === "youtube" || props.content.state !== "embed" || !props.content.oembedHtml) {
      return null;
    }
    const srcDoc = buildSandboxedXEmbedSrcDoc(props.content.oembedHtml);
    if (!srcDoc) return null;
    return (
      <div class={cn("h-[34rem] w-full overflow-hidden rounded-lg border border-border-soft bg-card", props.class)}>
        <iframe
          class="size-full border-0"
          data-post-card-interactive="true"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          sandbox={X_EMBED_SANDBOX}
          srcdoc={srcDoc}
          title={props.content.preview?.title?.trim() || props.content.preview?.text?.trim() || props.labels?.xPost || defaultEmbedLabels.xPost}
        />
      </div>
    );
  };

  return (
    <Show when={xTweetEmbed() ?? sandboxedSrcDocEmbed()} fallback={fallback()}>
      {(element) => element()}
    </Show>
  );
}
