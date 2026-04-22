import type { ReactNode } from "react";

import { CardShell } from "@/components/primitives/layout-shell";

export function StackPageShell({
  title,
  description,
  actions,
  children,
  headerVariant = "card",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  headerVariant?: "card" | "plain";
}) {
  const showHeader = Boolean(title.trim() || description || actions);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      {showHeader && headerVariant === "plain" ? (
        <div className="px-5 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              {title.trim() ? (
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
          </div>
        </div>
      ) : showHeader ? (
        <CardShell className="px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              {title.trim() ? (
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
          </div>
        </CardShell>
      ) : null}
      {children}
    </section>
  );
}
