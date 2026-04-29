"use client";

import * as React from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterTheme = "dark" | "light" | "system";

function useDocumentTheme(): ToasterTheme {
  const [theme, setTheme] = React.useState<ToasterTheme>("system");

  React.useEffect(() => {
    const root = document.documentElement;
    const readTheme = () => {
      setTheme(root.classList.contains("light") ? "light" : "dark");
    };

    readTheme();

    const observer = new MutationObserver(readTheme);
    observer.observe(root, {
      attributeFilter: ["class", "data-theme"],
      attributes: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return theme;
}

export function Toaster() {
  const theme = useDocumentTheme();

  return (
    <Sonner
      closeButton
      mobileOffset={{
        bottom: "calc(env(safe-area-inset-bottom) + 1rem)",
        left: "1rem",
        right: "1rem",
      }}
      offset={{
        bottom: "calc(env(safe-area-inset-bottom) + 1rem)",
        right: "1rem",
      }}
      position="bottom-right"
      richColors
      theme={theme}
      toastOptions={{
        classNames: {
          actionButton:
            "!bg-primary !text-primary-foreground hover:!bg-primary/90",
          cancelButton:
            "!bg-secondary !text-secondary-foreground hover:!bg-secondary/85",
          description: "!break-words !text-muted-foreground",
          error:
            "!border-destructive/25 !bg-surface-toast-error !text-foreground",
          info:
            "!border-border-soft !bg-surface-toast-info !text-foreground",
          success:
            "!border-success/20 !bg-surface-toast-success !text-foreground",
          toast:
            "!max-h-[min(60vh,20rem)] !max-w-[calc(100vw-2rem)] !overflow-y-auto !rounded-[var(--radius-xl)] !border !shadow-[var(--shadow-lg)] !backdrop-blur-md sm:!max-w-[24rem]",
          title: "!break-words !text-base !font-semibold !text-foreground",
          warning:
            "!border-warning/20 !bg-surface-toast-warning !text-foreground",
        },
      }}
    />
  );
}

export { toast };
