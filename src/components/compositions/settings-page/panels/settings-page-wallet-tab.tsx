"use client";

import { Card } from "@/components/primitives/card";
import { CopyField } from "@/components/primitives/copy-field";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";

import { SettingsRow, SettingsSection } from "./settings-page-panel-primitives";
import type {
  SettingsConnectedWallet,
  SettingsPageProps,
} from "../settings-page.types";

function WalletList({ connectedWallets }: { connectedWallets: SettingsConnectedWallet[] }) {
  const { locale } = useUiLocale();
  const isMobile = useIsMobile();
  const copy = getLocaleMessages(locale, "routes").settings;

  if (connectedWallets.length === 0) {
    return (
      <Card className={cn("border-border bg-card px-5 py-5 shadow-none", isMobile && "border-0 bg-transparent px-0 py-0")}>
        <div className="text-base text-muted-foreground">{copy.noConnectedWallets}</div>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden border-border bg-card shadow-none", isMobile && "border-0 bg-transparent")}>
      <div className="flex flex-col">
        {connectedWallets.map((wallet) => (
          <SettingsRow
            key={`${wallet.chainLabel}:${wallet.address}`}
            label={wallet.chainLabel}
            note={wallet.isPrimary ? copy.primaryWalletNote : undefined}
            value={wallet.address}
          />
        ))}
      </div>
    </Card>
  );
}

export function WalletTab({
  wallet,
}: Pick<SettingsPageProps, "wallet">) {
  const { locale } = useUiLocale();
  const isMobile = useIsMobile();
  const copy = getLocaleMessages(locale, "routes").settings;
  return (
    <div className="space-y-8">
      <Card className={cn("space-y-5 border-border bg-card px-5 py-5 shadow-none", isMobile && "border-0 bg-transparent px-0 py-0")}>
        <div className="space-y-1">
          <div className="text-base text-muted-foreground">{copy.primaryWalletLabel}</div>
          <div className="text-lg font-semibold text-foreground">
            {wallet.primaryAddress ?? copy.noWalletConnected}
          </div>
        </div>
        {wallet.primaryAddress ? <CopyField value={wallet.primaryAddress} /> : null}
      </Card>

      <SettingsSection title={copy.connectedWalletsSection}>
        <WalletList connectedWallets={wallet.connectedWallets} />
      </SettingsSection>
    </div>
  );
}
