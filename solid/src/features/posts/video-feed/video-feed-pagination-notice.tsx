import { Button, Type } from "../../../design-system";

export function VideoFeedPaginationNotice(props: {
  actionLabel: string;
  message: string;
  onAction: () => void;
}) {
  return (
    <div class="pointer-events-none fixed inset-x-4 bottom-4 z-30 flex justify-center" role="status" data-video-pagination-notice>
      <div class="pointer-events-auto flex items-center gap-3 rounded-full border border-border-soft bg-card px-4 py-2 shadow-lg">
        <Type variant="caption">{props.message}</Type>
        <Button onClick={props.onAction} size="sm" type="button" variant="secondary">{props.actionLabel}</Button>
      </div>
    </div>
  );
}
