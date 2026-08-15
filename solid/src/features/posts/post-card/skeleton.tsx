import { Skeleton } from "../../../design-system";
import { cn } from "../../../lib/cn";

export interface PostCardSkeletonProps {
  showMedia?: boolean;
  class?: string;
}

export function PostCardSkeleton(props: PostCardSkeletonProps) {
  return (
    <article
      class={cn("flex flex-col gap-3 border-b border-border-soft px-4 py-3 md:rounded-[var(--radius-2xl)] md:border md:bg-card", props.class)}
    >
      <div class="flex items-center gap-2">
        <Skeleton class="size-5 rounded-full" />
        <div class="flex flex-1 gap-2">
          <Skeleton class="h-3 w-24" />
          <Skeleton class="h-3 w-8" />
          <Skeleton class="h-3 w-8" />
        </div>
        <Skeleton class="size-8 rounded-full" />
      </div>

      <Skeleton class="h-4 w-3/4" />

      {props.showMedia ?? true ? <Skeleton class="h-48 w-full rounded-lg" /> : null}

      <div class="flex items-center gap-1">
        <Skeleton class="size-8 rounded-full" />
        <Skeleton class="h-3 w-8" />
        <Skeleton class="size-8 rounded-full" />
        <Skeleton class="size-8 rounded-full" />
        <Skeleton class="ms-auto size-8 rounded-full" />
      </div>
    </article>
  );
}
