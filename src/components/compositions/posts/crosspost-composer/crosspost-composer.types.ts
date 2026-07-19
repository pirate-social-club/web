import type { CommunityPickerItem } from "@/components/compositions/posts/post-composer/post-composer.types";
import type { CrosspostSourcePreview } from "@/components/compositions/posts/post-card/post-card.types";

export type CrosspostTargetCommunity = CommunityPickerItem;

interface CrosspostComposerSubmitState {
  disabled?: boolean;
  error?: string | null;
  label?: string;
  loading?: boolean;
  onSubmit?: () => void;
}

export interface CrosspostComposerProps {
  communityPickerEmptyLabel?: string;
  communityPickerItems?: CrosspostTargetCommunity[];
  communityPickerSearchPlaceholder?: string;
  communityPickerTitle?: string;
  onSelectCommunity?: (communityId: string) => void;
  onCommunitySearchQueryChange?: (query: string) => void;
  onTitleValueChange?: (value: string) => void;
  selectedCommunity?: CrosspostTargetCommunity | null;
  source: CrosspostSourcePreview;
  submit?: CrosspostComposerSubmitState;
  titleLabel?: string;
  titlePlaceholder?: string;
  titleValue?: string;
}
