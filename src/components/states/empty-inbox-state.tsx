import { IllustratedState } from "@/components/primitives/illustrated-state";

interface EmptyInboxStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function EmptyInboxState({
  title,
  description,
  className,
}: EmptyInboxStateProps) {
  return (
    <IllustratedState
      className={className}
      description={description}
      image={{
        alt: "Friendly pirate ghost checking an empty mailbox",
        src: "/mascots/empty-inbox-ghost-256.png",
        srcSet: "/mascots/empty-inbox-ghost-512.webp 2x, /mascots/empty-inbox-ghost-256.webp 1x",
      }}
      title={title}
    />
  );
}
