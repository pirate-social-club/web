"use client";

import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";
import type { DownloadFileComposerState } from "./post-composer.types";

const DOWNLOAD_ACCEPT = ".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,text/plain,application/json";

export function PostComposerGenericAssetFields({
  file,
  onFileChange,
}: {
  file: DownloadFileComposerState;
  onFileChange: (next: DownloadFileComposerState) => void;
}) {
  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/30 p-4">
      <div>
        <Type as="p" variant="body-strong">Downloadable file</Type>
        <Type as="p" variant="body" className="text-muted-foreground">
          CSV, TSV, TXT, and JSON files are scanned before publication. Locked delivery keeps plaintext available to the platform for rescanning.
        </Type>
      </div>
      <Input
        accept={DOWNLOAD_ACCEPT}
        onChange={(event) => {
          const next = event.target.files?.[0] ?? null;
          onFileChange({ upload: next, label: next?.name });
        }}
        type="file"
      />
      {file.upload ? <Type as="p" variant="caption" className="text-muted-foreground">{file.upload.name} · {file.upload.size.toLocaleString()} bytes</Type> : null}
      <Type as="p" variant="caption" className="text-muted-foreground">
        Public/free delivery is not enabled yet. This creator flow publishes locked goods on the simulated Base Sepolia USDC rail.
      </Type>
    </section>
  );
}
