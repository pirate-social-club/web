import type { SongArtifactBundle as ApiSongArtifactBundle } from "@pirate/api-contracts";

import type { ComposerReference } from "@/components/compositions/posts/post-composer/post-composer.types";
import type { ApiDerivativeSource } from "@/lib/api/client-api-types";

export function songArtifactBundleToComposerReference(bundle: ApiSongArtifactBundle): ComposerReference {
  return {
    id: bundle.id,
    title: bundle.title,
    subtitle: bundle.creator_user,
  };
}

export function derivativeSourceToComposerReference(
  source: ApiDerivativeSource,
): ComposerReference {
  return {
    id: source.source_ref,
    title: source.title,
    subtitle: source.creator_handle ?? source.creator_display_name ?? undefined,
    licensePreset: source.license_preset,
    upstreamRoyaltyPct: source.commercial_rev_share_pct,
    parentIpId: source.story_ip,
    licenseTermsId: source.story_license_terms,
  };
}

export function derivativeSourceToLiveComposerReference(
  source: ApiDerivativeSource,
): ComposerReference {
  return {
    ...derivativeSourceToComposerReference(source),
    id: `story:asset:${source.asset}`,
  };
}
