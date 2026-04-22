import type { ReactNode } from "react";

export function SettingsSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsRow({
  label,
  note,
  trailing,
  value,
}: {
  label: string;
  note?: string;
  trailing?: ReactNode;
  value?: ReactNode;
}) {
  return (
    <div className="flex min-h-20 flex-col items-start gap-2 border-b border-border px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-base font-medium text-foreground">{label}</div>
        {note ? <div className="text-base text-muted-foreground">{note}</div> : null}
      </div>
      {value ? (
        <div className="min-w-0 max-w-full flex-1 text-start text-base text-muted-foreground">
          {value}
        </div>
      ) : null}
      {trailing ? <div className="shrink-0 text-muted-foreground">{trailing}</div> : null}
    </div>
  );
}
