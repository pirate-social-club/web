import type { CrosspostSourcePreview } from "../post-card/types";
import type { CommunityPickerItem } from "../post-composer/types";

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
