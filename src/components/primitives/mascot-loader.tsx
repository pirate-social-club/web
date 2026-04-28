import * as React from "react";

import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";

export interface MascotLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  debugLabel?: string;
}

export const MascotLoader = React.forwardRef<HTMLDivElement, MascotLoaderProps>(
  ({ size = "md", className, ...props }, ref) => {
    const { locale } = useUiLocale();
    const copy = getLocaleMessages(locale, "routes").common;

    const sizeClass = {
      sm: "size-16",
      md: "size-32",
      lg: "size-48",
    }[size];

    return (
      <div
        className={cn(
          sizeClass,
          "animate-mascot-run bg-[url('/loaders/sprite-128.webp')] bg-[length:2500%_100%] bg-no-repeat",
          className,
        )}
        ref={ref}
        role="status"
        aria-label={copy.loading}
        {...props}
      />
    );
  },
);

MascotLoader.displayName = "MascotLoader";
