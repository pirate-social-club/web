import { Link, Meta, Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { createEffect, createSignal, For, Show } from "solid-js";
import { getRequestEvent } from "@solidjs/web";
import { Type } from "../../../design-system";
import {
  deserializePublicProfile,
  loadPublicProfile,
  profileRedirectTarget,
  requestForPublicProfile,
  serializePublicProfile,
  type PublicProfileLoadResult,
} from "../../../lib/api/public-profile";
import {
  publicProfileCanonicalPath,
  publicProfileCommunityPath,
  publicProfileDescription,
  publicProfileDisplayName,
  publicProfileMediaRef,
  publicProfileShareImage,
} from "../../../lib/public-profile-presentation";
import { createUiLocale } from "../../../lib/ui-locale";
import { getLocaleMessages, interpolateMessage } from "../../../locales";

type ProfileRouteState = PublicProfileLoadResult | { readonly kind: "loading" };

function readInitialProfile(handle: string): PublicProfileLoadResult | null {
  const event = getRequestEvent();
  const serverResult = event?.locals?.profileResult;
  if (serverResult) return serverResult;

  if (typeof document !== "undefined") {
    const route = [...document.querySelectorAll<HTMLElement>('[data-route-path="/u/:handle"]')]
      .find(element => element.dataset.profileHandle === handle);
    return deserializePublicProfile(route?.dataset.profilePreload ?? null);
  }
  return null;
}

export default function ProfileRoute() {
  const params = useParams();
  const { locale } = createUiLocale();
  const copy = () => getLocaleMessages(locale(), "routes").profile;
  const handle = () => params.handle ?? "";
  const initial = readInitialProfile(handle());
  const [state, setState] = createSignal<ProfileRouteState>(initial ?? { kind: "loading" });
  let loadedHandle = initial ? handle() : "";
  let requestGeneration = 0;

  createEffect(
    () => handle(),
    currentHandle => {
      if (typeof window === "undefined" || !currentHandle || loadedHandle === currentHandle) return;
      loadedHandle = currentHandle;
      const generation = ++requestGeneration;
      setState({ kind: "loading" });
      void loadPublicProfile(currentHandle, { request: requestForPublicProfile() }).then(result => {
        if (generation === requestGeneration) setState(result);
      });
    },
  );

  const successData = () => {
    const current = state();
    return current.kind === "success" ? current.data : null;
  };

  createEffect(
    () => state(),
    current => {
      if (typeof window === "undefined" || current.kind !== "success" || current.data.isCanonical) return;
      const target = profileRedirectTarget(current.data);
      if (target && target !== window.location.pathname) window.location.replace(target);
    },
  );

  const displayName = () => state().kind === "success"
    ? publicProfileDisplayName(successData()!)
    : handle();
  const description = () => state().kind === "success"
    ? publicProfileDescription(successData()!, copy())
    : interpolateMessage(copy().defaultDescription, { name: displayName() });
  const canonicalPath = () => state().kind === "success"
    ? publicProfileCanonicalPath(successData()!, getCanonicalOrigin())
    : `${getCanonicalOrigin()}/u/${encodeURIComponent(handle())}`;
  const title = () => `${displayName()} • Pirate`;
  const stateStatus = () => state().kind === "success"
    ? "ready"
    : state().kind === "loading"
      ? "loading"
      : state().kind;
  const serverPreload = () => {
    if (typeof window !== "undefined") return undefined;
    const current = state();
    return current.kind === "loading" ? undefined : serializePublicProfile(current);
  };
  const getCanonicalOrigin = () => {
    const serverOrigin = getRequestEvent()?.locals?.canonicalOrigin;
    if (serverOrigin) return serverOrigin;
    if (typeof window !== "undefined") return window.location.origin;
    return "https://pirate.sc";
  };
  const ogImage = () => successData()
    ? publicProfileShareImage(successData()!, getCanonicalOrigin())
    : `${getCanonicalOrigin()}/og/pirate-share-card.jpg`;
  const safeImage = (value: string | null) => publicProfileMediaRef(value, getCanonicalOrigin());

  return (
    <main
      data-route-path="/u/:handle"
      data-profile-handle={handle()}
      data-profile-status={stateStatus()}
      data-profile-preload={serverPreload()}
      aria-busy={state().kind === "loading" ? "true" : "false"}
    >
      <Title>{title()}</Title>
      <Meta name="description" content={description()} />
      <Meta property="og:type" content="profile" />
      <Meta property="og:title" content={title()} />
      <Meta property="og:description" content={description()} />
      <Meta property="og:site_name" content="Pirate" />
      <Meta property="og:url" content={canonicalPath()} />
      <Meta property="og:image" content={ogImage()} />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content={title()} />
      <Meta name="twitter:description" content={description()} />
      <Meta name="twitter:image" content={ogImage()} />
      <Link rel="canonical" href={canonicalPath()} key="canonical" />
      <Link rel="image_src" href={ogImage()} key="image-src" />

      <Show when={state().kind === "loading"}>
        <section aria-live="polite" role="status">
          <Type as="h1" variant="h1">{copy().loading}</Type>
        </section>
      </Show>

      <Show when={state().kind === "invalid"}>
        <section role="alert">
          <Type as="h1" variant="h1">{copy().invalid}</Type>
        </section>
      </Show>

      <Show when={state().kind === "not-found"}>
        <section role="alert">
          <Type as="h1" variant="h1">{copy().notFound}</Type>
        </section>
      </Show>

      <Show when={state().kind === "upstream-error"}>
        <section role="alert">
          <Type as="h1" variant="h1">{copy().error}</Type>
        </section>
      </Show>

      <Show when={successData()}>
        {data => {
          const profile = () => data().profile;
          const name = () => publicProfileDisplayName(data());
          return (
              <article aria-labelledby="public-profile-heading">
              <Show when={safeImage(profile().coverRef)}>
                {cover => <img src={cover()} alt="" data-profile-cover="true" />}
              </Show>
              <header>
                <Show when={safeImage(profile().avatarRef)}>
                  {avatar => <img src={avatar()} alt={`${name()} avatar`} data-profile-avatar="true" />}
                </Show>
                <Type as="h1" variant="h1" id="public-profile-heading">{name()}</Type>
                <Type as="p" variant="body">@{data().resolvedHandleLabel}</Type>
                <Show when={!data().isCanonical && data().requestedHandleLabel !== data().resolvedHandleLabel}>
                  <Type as="p" variant="caption">@{data().requestedHandleLabel}</Type>
                </Show>
              </header>
              <Show when={profile().bio}>
                {bio => <Type as="p" variant="body">{bio()}</Type>}
              </Show>
              <section aria-labelledby="created-communities-heading">
                <Type as="h2" variant="h2" id="created-communities-heading">{copy().createdCommunities}</Type>
                <Show
                  when={data().createdCommunities.length > 0}
                  fallback={<Type as="p" variant="body">{copy().emptyCommunities}</Type>}
                >
                  <ul>
                    <For each={data().createdCommunities}>
                      {community => (
                        <li>
                          <a href={publicProfileCommunityPath(community)} aria-label={interpolateMessage(copy().openCommunity, { name: community.displayName })}>
                            <Type as="span" variant="body-strong">{community.displayName}</Type>
                          </a>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </section>
            </article>
          );
        }}
      </Show>
    </main>
  );
}
