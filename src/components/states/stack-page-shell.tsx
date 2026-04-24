import type { ReactNode } from "react";

import { CardShell } from "@/components/primitives/layout-shell";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export function StackPageShell({
  title,
  description,
  actions,
  children,
  headerVariant = "card",
  hideTitleOnMobile = false,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  headerVariant?: "card" | "plain";
  hideTitleOnMobile?: boolean;
}) {
  const showHeader = Boolean(title.trim() || description || actions);
  const headerRowClassName = cn(
    "flex flex-col gap-4 md:flex-row md:justify-between",
    description ? "md:items-end" : "md:items-center",
  );

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      {showHeader && headerVariant === "plain" ? (
        <div className="px-1 md:px-6">
          <div className={headerRowClassName}>
            <div className="flex flex-col gap-2">
              {title.trim() ? (
                <Type as="h1" variant="h1" className={cn("text-2xl md:text-3xl", hideTitleOnMobile && "hidden md:block")}>
                  {title}
                </Type>
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
          <div className={headerRowClassName}>
            <div className="flex flex-col gap-2">
              {title.trim() ? (
                <Type as="h1" variant="h1" className={cn("text-2xl md:text-3xl", hideTitleOnMobile && "hidden md:block")}>
                  {title}
                </Type>
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
