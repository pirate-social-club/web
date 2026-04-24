import { resolveResourceHref } from "@/lib/resource-links";

import { LegalMarkdown } from "./legal-markdown";

function HeaderLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
      href={href}
    >
      {label}
    </a>
  );
}

export function LegalDocumentPage({
  source,
  supportEmail = "support@pirate.sc",
}: {
  source: string;
  supportEmail?: string;
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="overflow-hidden rounded-[var(--radius-4xl)] border border-border bg-card shadow-xl">
          <div className="border-b border-border bg-gradient-to-br from-background via-background to-primary/10 px-5 py-5 md:px-8 md:py-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <HeaderLink href="/" label="Home" />
              <HeaderLink href={resolveResourceHref("blog") ?? "https://blog.pirate.sc"} label="Blog" />
              <HeaderLink href={resolveResourceHref("terms-of-service") ?? "/terms"} label="Terms" />
              <HeaderLink href={resolveResourceHref("privacy-policy") ?? "/privacy"} label="Privacy" />
              <a
                className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                href={`mailto:${supportEmail}`}
              >
                {supportEmail}
              </a>
            </div>
          </div>
          <div className="px-5 py-6 md:px-8 md:py-8">
            <LegalMarkdown source={source} />
          </div>
        </div>
      </div>
    </main>
  );
}
