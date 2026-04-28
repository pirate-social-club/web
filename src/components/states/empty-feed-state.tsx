export function EmptyFeedState({ message }: { message: string }) {
  return (
    <div className="px-1 py-4 md:px-0">
      <p className="text-base leading-7 text-muted-foreground">{message}</p>
    </div>
  );
}
