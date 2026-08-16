import type { JSX } from "@solidjs/web";
import type { RouteSectionProps } from "@solidjs/router";
import { createHostContext } from "../lib/host-context";
import { RenderErrorBoundary } from "../lib/render-boundary";
import { createUiLocale } from "../lib/ui-locale";
import { getLocaleMessages } from "../locales";

export default function AppShellLayout(props: RouteSectionProps): JSX.Element {
  const host = createHostContext();
  const { locale } = createUiLocale();
  const shell = () => getLocaleMessages(locale(), "shell");
  return (
    <RenderErrorBoundary fallback={<main><h1>{shell().error.title}</h1></main>}>
      <div data-layout="app-shell">
        <header>
          <a href="/" aria-label={shell().navigation.home}>{shell().appName}</a>
          <span data-layout-surface={host.surface}>{host.communitySlug ?? "canonical"}</span>
          <nav aria-label="Primary navigation">
            <a href="/">{shell().navigation.home}</a>
            <a href="/c/demo/threads">{shell().navigation.community}</a>
            <a href="/settings">{shell().navigation.settings}</a>
          </nav>
        </header>
        {props.children}
      </div>
    </RenderErrorBoundary>
  );
}
