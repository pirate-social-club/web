import * as React from "react";

import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";

export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  debugLabel?: string;
}

export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, debugLabel, ...props }, ref) => {
    const { locale } = useUiLocale();
    const copy = getLocaleMessages(locale, "routes").common;

    React.useEffect(() => {
      if (debugLabel) {
        console.info("[loader-debug][Spinner] mount", { debugLabel, t: Math.round(performance.now()) });
        return () => console.info("[loader-debug][Spinner] unmount", { debugLabel, t: Math.round(performance.now()) });
      }
    }, [debugLabel]);

    return (
      <svg
        aria-label={copy.loading}
        className={cn("size-4 animate-spin text-current", className)}
        fill="none"
        ref={ref}
        role="status"
        viewBox="0 0 24 24"
        {...props}
      >
        <circle cx="12" cy="12" opacity="0.2" r="9" stroke="currentColor" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
    );
  },
);

Spinner.displayName = "Spinner";
