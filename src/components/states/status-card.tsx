import type { ReactNode } from "react";
import { Type } from "@/components/primitives/type";

export function StatusCard({
  title,
  description,
  actions,
  tone = "default",
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const toneClassName = tone === "success"
    ? "border-emerald-500/20 bg-emerald-500/5"
    : tone === "warning"
      ? "border-amber-500/20 bg-amber-500/5"
      : "border-border-soft bg-card";

  return (
    <div className={`rounded-[var(--radius-3xl)] border px-5 py-5 ${toneClassName}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <Type as="p" variant="body-strong" className="">{title}</Type>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
