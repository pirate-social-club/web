import { Meta, Link, Title } from "@solidjs/meta";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { createMemo, createSignal, Errored, isPending, Loading } from "solid-js";
import { pageRoutes } from "virtual:file-routes";
import PublicVideoFeed from "../../components/public-video-feed";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  TextField,
  TextFieldDescription,
  TextFieldInput,
  TextFieldLabel,
} from "../../design-system";
import { apiVersionQueryKey, createApiVersionQuery } from "../../lib/api/home-query";
import type { ApiVersionResponse } from "../../lib/api/client";
import { projectQueryData } from "../../lib/async-query-projection";
import { useHostContext } from "../../lib/host-context";
import { useUiLocale } from "../../lib/ui-locale";
import { getLocaleMessages } from "../../locales";

export default function HomeRoute() {
  const [count, setCount] = createSignal(0);
  const [streamed] = createSignal(
    () => new Promise<string>(resolve => setTimeout(() => resolve("stream-complete"), 80)),
    { ssrSource: "server" },
  );
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [displayName, setDisplayName] = createSignal("");
  const host = useHostContext();
  const { locale } = useUiLocale();
  const copy = () => getLocaleMessages(locale(), "routes").home;

  return (
    <main data-route-path="/">
      <Title>{copy().title}</Title>
      <Meta name="description" content={copy().description} />
      <Meta property="og:title" content={copy().title} />
      <Meta property="og:type" content="website" />
      <Link rel="canonical" href="/" key="canonical" />
      <h1>{copy().heading}</h1>
      <p id="seam-host">host-surface: {host.surface}</p>
      <p id="host-community-slug">host-community-slug: {host.communitySlug ?? "none"}</p>
      <p id="route-manifest">filesystem-routing routes: {pageRoutes.length}</p>
      <Button id="hydration-button" type="button" onClick={() => setCount(value => value + 1)}>
        hydration-count: {count()}
      </Button>
      <ApiVersionStatus />
      <section id="hydration-dialog-fixture" aria-label="Overlay hydration fixture">
        <Dialog open={dialogOpen()} onOpenChange={setDialogOpen}>
          <DialogTrigger id="hydration-dialog-open" type="button">
            Open hydration dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hydration dialog</DialogTitle>
              <DialogDescription>
                This portalled design-system overlay is part of the app gate.
              </DialogDescription>
            </DialogHeader>
            <p id="hydration-dialog-marker">portal-ready</p>
          </DialogContent>
        </Dialog>
      </section>
      <section id="hydration-form-fixture" aria-label="Form hydration fixture">
        <TextField name="display-name" value={displayName()} onChange={setDisplayName}>
          <TextFieldLabel>Display name</TextFieldLabel>
          <TextFieldInput id="hydration-display-name" />
          <TextFieldDescription id="hydration-display-name-description">
            Controlled form values stay connected after hydration.
          </TextFieldDescription>
        </TextField>
      </section>
      <Loading fallback={<p id="stream-fallback">streaming-shell</p>}>
        <p id="stream-result">{streamed()}</p>
      </Loading>
      <PublicVideoFeed />
      <nav aria-label="Seam probes">
        <a href="/seam/host">host seam</a>
        <a href="/seam/binding">binding seam</a>
        <a href="/p/demo-post">post route</a>
        <a href="/u/demo-user">profile route</a>
      </nav>
    </main>
  );
}

function ApiVersionStatus() {
  const apiVersion = useQuery(() => createApiVersionQuery());
  const queryClient = useQueryClient();
  const apiData = createMemo<ApiVersionResponse>(() =>
    projectQueryData(apiVersion.data, apiVersion.promise) as ApiVersionResponse,
  );

  return (
    <Errored fallback={(_, reset) => (
      <p id="api-version" data-api-status="error" role="alert">
        API status: unavailable
        <button type="button" onClick={() => void queryClient.resetQueries({ queryKey: apiVersionQueryKey }).then(reset)}>
          Retry
        </button>
      </p>
    )}>
      <Loading fallback={<p id="api-version-fallback">loading api status</p>}>
        <p id="api-version" data-api-status="success" data-api-pending={isPending(apiData) ? "true" : "false"}>
          API status: {apiData().service}
        </p>
      </Loading>
    </Errored>
  );
}
