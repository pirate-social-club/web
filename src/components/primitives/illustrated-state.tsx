import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

interface IllustratedStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  image: {
    alt: string;
    src: string;
    srcSet: string;
  };
}

export function IllustratedState({
  title,
  description,
  action,
  className,
  image,
}: IllustratedStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 px-5 py-10 text-center",
        className,
      )}
    >
      <div className="relative size-32 overflow-hidden rounded-full md:size-40">
        <picture>
          <source srcSet={image.srcSet} type="image/webp" />
          <img
            alt={image.alt}
            className="size-full object-cover"
            draggable={false}
            src={image.src}
          />
        </picture>
      </div>
      {title ? (
        <Type as="p" className="text-muted-foreground" variant="h4">
          {title}
        </Type>
      ) : null}
      {description ? (
        <p className="max-w-xs text-lg leading-7 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
