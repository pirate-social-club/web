"use client";

import * as React from "react";

import type { ApiClient } from "@/lib/api/client";
import type { ApiCommunityNamespaceAttachment } from "@/lib/api/client-api-types";
import type { HandleClaimNamespaceOption } from "@/components/compositions/community/handle-claim-modal/handle-claim-modal.types";

type NamespaceApi = Pick<ApiClient["communities"], "listNamespaces">;

function canIssueNames(namespace: ApiCommunityNamespaceAttachment): boolean {
  return namespace.verification_status === "verified"
    && (namespace.family === "spaces"
      || namespace.delegation?.pirate_subdomain_issuance_allowed === true);
}

function toOption(namespace: ApiCommunityNamespaceAttachment): HandleClaimNamespaceOption {
  const suffix = namespace.family === "spaces"
    ? `@${namespace.root_label}`
    : `.${namespace.root_label}`;
  return {
    namespaceVerification: namespace.namespace_verification,
    label: `${suffix} names${namespace.namespace_role === "primary" ? " (primary)" : ""}`,
    routeLabel: namespace.route_slug,
    disabled: !canIssueNames(namespace),
  };
}

export function useCommunityHandleNamespaces(input: {
  api: NamespaceApi;
  communityId: string;
  enabled: boolean;
}) {
  const [namespaces, setNamespaces] = React.useState<ApiCommunityNamespaceAttachment[]>([]);
  const [selectedNamespaceVerification, setSelectedNamespaceVerification] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setNamespaces([]);
    setSelectedNamespaceVerification(null);
    if (!input.enabled || !input.communityId) return () => { cancelled = true; };

    void input.api.listNamespaces(input.communityId).then((response) => {
      if (cancelled) return;
      setNamespaces(response.namespaces);
      const primary = response.namespaces.find(
        (namespace) => namespace.namespace_role === "primary" && canIssueNames(namespace),
      );
      const firstVerified = response.namespaces.find(
        canIssueNames,
      );
      setSelectedNamespaceVerification(
        (current) => current && response.namespaces.some(
          (namespace) => namespace.namespace_verification === current,
        )
          ? current
          : primary?.namespace_verification ?? firstVerified?.namespace_verification ?? null,
      );
    }).catch(() => {
      if (!cancelled) setNamespaces([]);
    });

    return () => { cancelled = true; };
  }, [input.api, input.communityId, input.enabled]);

  const options = React.useMemo(() => namespaces.map(toOption), [namespaces]);

  return {
    namespaceOptions: options,
    selectedNamespaceVerification,
    setSelectedNamespaceVerification,
  };
}
