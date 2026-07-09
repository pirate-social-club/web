"use client";

import * as React from "react";
import type { Profile, ProfileActivityResponse } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { logger } from "@/lib/logger";
import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
import type { ProfilePageProps } from "@/components/compositions/profiles/profile-page/profile-page.types";
import {
  mapProfileActivityProps,
  PROFILE_ACTIVITY_PAGE_LIMIT,
} from "@/app/authenticated-helpers/profile-activity-mapping";

type ProfileActivityTab = "overview" | "posts" | "comments";

const EMPTY_ACTIVITY_PROPS: Pick<ProfilePageProps, "comments" | "overviewItems" | "posts"> = {
  comments: [],
  overviewItems: [],
  posts: [],
};

type LoadedActivity = Pick<ProfileActivityResponse, "comments" | "overview_items" | "posts">;
type AuthorProfilesByUserId = Record<string, Profile | null>;

function emptyLoadedActivity(): LoadedActivity {
  return { comments: [], overview_items: [], posts: [] };
}

function mergeActivityResponse(current: LoadedActivity, response: ProfileActivityResponse): LoadedActivity {
  if (response.tab === "posts") {
    return { ...current, posts: response.posts };
  }
  if (response.tab === "comments") {
    return { ...current, comments: response.comments };
  }
  return { ...current, overview_items: response.overview_items };
}

function addPublicAuthorUserId(userIds: Set<string>, identityMode: string | null | undefined, userId: string | null | undefined) {
  if (identityMode === "public" && userId) {
    userIds.add(userId);
  }
}

function collectActivityAuthorUserIds(activity: LoadedActivity): string[] {
  const userIds = new Set<string>();

  for (const item of activity.posts) {
    addPublicAuthorUserId(userIds, item.post.post.identity_mode, item.post.post.author_user);
  }

  for (const item of activity.comments) {
    addPublicAuthorUserId(userIds, item.comment.comment.identity_mode, item.comment.comment.author_user);
  }

  for (const item of activity.overview_items) {
    if (item.kind === "post") {
      addPublicAuthorUserId(userIds, item.post.post.identity_mode, item.post.post.author_user);
    } else {
      addPublicAuthorUserId(userIds, item.comment.comment.identity_mode, item.comment.comment.author_user);
    }
  }

  return [...userIds];
}

function useProfileActivity(
  key: string | null,
  activeTab: ProfileActivityTab,
  loadTab: (tab: ProfileActivityTab) => Promise<ProfileActivityResponse>,
) {
  const api = useApi();
  const session = useSession();
  const [activityProps, setActivityProps] = React.useState(EMPTY_ACTIVITY_PROPS);
  const [error, setError] = React.useState<string | null>(null);
  const loadedTabsRef = React.useRef(new Set<ProfileActivityTab>());
  const activityRef = React.useRef<LoadedActivity>(emptyLoadedActivity());
  const authorProfilesRef = React.useRef<AuthorProfilesByUserId>({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    loadedTabsRef.current = new Set();
    activityRef.current = emptyLoadedActivity();
    authorProfilesRef.current = {};
    setActivityProps(EMPTY_ACTIVITY_PROPS);
    setError(null);
  }, [key]);

  React.useEffect(() => {
    if (!key) {
      setActivityProps(EMPTY_ACTIVITY_PROPS);
      setError(null);
      setLoading(false);
      return;
    }

    if (loadedTabsRef.current.has(activeTab)) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadTab(activeTab)
      .then(async (response) => {
        if (cancelled) return;
        loadedTabsRef.current.add(activeTab);
        activityRef.current = mergeActivityResponse(activityRef.current, response);
        const fallbackProfiles = session?.profile && session.user?.id
          ? { [session.user.id]: session.profile }
          : {};
        authorProfilesRef.current = await loadProfilesByUserId(
          api,
          collectActivityAuthorUserIds(activityRef.current),
          {
            ...authorProfilesRef.current,
            ...fallbackProfiles,
          },
        );
        if (cancelled) return;
        setActivityProps(mapProfileActivityProps(activityRef.current, authorProfilesRef.current));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        logger.warn("[profile-activity] failed to load profile activity", { error, key });
        setError("Could not load profile activity.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, api, key, loadTab, session?.profile, session?.user?.id]);

  return { ...activityProps, error, loading };
}

export function useCurrentUserProfileActivity(
  handleLabel: string | null | undefined,
  locale: string | null | undefined,
  enabled: boolean,
  activeTab: ProfileActivityTab,
) {
  const api = useApi();
  const key = handleLabel?.trim() || null;
  const loadTab = React.useCallback((tab: ProfileActivityTab) => {
    if (key) {
      return api.publicProfiles.getActivity(key, {
        limit: PROFILE_ACTIVITY_PAGE_LIMIT,
        locale,
        tab,
      });
    }
    return api.profiles.getActivity({
      limit: PROFILE_ACTIVITY_PAGE_LIMIT,
      locale,
      tab,
    });
  }, [api, key, locale]);

  return useProfileActivity(enabled ? `me:${key ?? "auth"}:${locale ?? ""}` : null, activeTab, loadTab);
}

export function usePublicProfileActivity(
  handleLabel: string | null | undefined,
  locale: string | null | undefined,
  activeTab: ProfileActivityTab,
) {
  const api = useApi();
  const key = handleLabel ?? null;
  const loadTab = React.useCallback((tab: ProfileActivityTab) => {
    if (!key) {
      return Promise.reject(new Error("Profile handle is required"));
    }
    return api.publicProfiles.getActivity(key, {
      limit: PROFILE_ACTIVITY_PAGE_LIMIT,
      locale,
      tab,
    });
  }, [api, key, locale]);

  return useProfileActivity(key ? `${key}:${locale ?? ""}` : null, activeTab, loadTab);
}
