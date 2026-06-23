export type CommunityArchiveStatus = "active" | "archived";

export type CommunityArchiveSubmitState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export interface CommunityArchivePageProps {
  /** Current lifecycle status of the community (control-plane `communities.status`). */
  status: CommunityArchiveStatus;
  submitState: CommunityArchiveSubmitState;
  className?: string;
  /** Invoked when the owner/admin confirms archiving an active community. */
  onArchive?: () => void;
  /** Invoked when the owner/admin restores an archived community. */
  onUnarchive?: () => void;
}
