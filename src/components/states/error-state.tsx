import { IllustratedState } from "@/components/primitives/illustrated-state";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title,
  description,
  action,
  className,
}: ErrorStateProps) {
  return (
    <IllustratedState
      action={action}
      className={className}
      description={description}
      image={{
        alt: "Confused pirate ghost",
        src: "/mascots/error-ghost-256.png",
        srcSet: "/mascots/error-ghost-512.webp 2x, /mascots/error-ghost-256.webp 1x",
      }}
      title={title}
    />
  );
}
