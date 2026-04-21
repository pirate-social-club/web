export function EmptyFeedState({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
      <p className="text-base leading-7 text-muted-foreground">{message}</p>
    </div>
  );
}
