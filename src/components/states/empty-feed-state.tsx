import { CardShell } from "@/components/primitives/layout-shell";

export function EmptyFeedState({ message }: { message: string }) {
  return (
    <CardShell className="px-5 py-5">
      <p className="text-base leading-7 text-muted-foreground">{message}</p>
    </CardShell>
  );
}
