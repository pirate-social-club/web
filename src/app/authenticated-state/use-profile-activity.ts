"use client";

import * as React from "react";
import type { ProfileActivityResponse } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { logger } from "@/lib/logger";
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

function mergeActivityResponses(
  overview: ProfileActivityResponse,
  posts: ProfileActivityResponse,
  comments: ProfileActivityResponse,
): Pick<ProfileActivityResponse, "comments" | "overview_items" | "posts"> {
  return {
    comments: comments.comments,
    overview_items: overview.overview_items,
    posts: posts.posts,
  };
}

function useProfileActivity(
  key: string | null,
  loadTab: (tab: ProfileActivityTab) => Promise<ProfileActivityResponse>,
) {
  const [activityProps, setActivityProps] = React.useState(EMPTY_ACTIVITY_PROPS);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!key) {
      setActivityProps(EMPTY_ACTIVITY_PROPS);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      loadTab("overview"),
      loadTab("posts"),
      loadTab("comments"),
    ])
      .then(([overview, posts, comments]) => {
        if (cancelled) return;
        setActivityProps(mapProfileActivityProps(mergeActivityResponses(overview, posts, comments)));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        logger.warn("[profile-activity] failed to load profile activity", { error, key });
        setActivityProps(EMPTY_ACTIVITY_PROPS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, loadTab]);

  return { ...activityProps, loading };
}

export function useCurrentUserProfileActivity(locale: string | null | undefined, enabled: boolean) {
  const api = useApi();
  const loadTab = React.useCallback((tab: ProfileActivityTab) => api.profiles.getActivity({
    limit: PROFILE_ACTIVITY_PAGE_LIMIT,
    locale,
    tab,
  }), [api, locale]);

  return useProfileActivity(enabled ? "me" : null, loadTab);
}

export function usePublicProfileActivity(
  handleLabel: string | null | undefined,
  locale: string | null | undefined,
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

  return useProfileActivity(key, loadTab);
}
