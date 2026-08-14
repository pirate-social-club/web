import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

type FileStage = "choose" | "review" | "publish";

function FileComposerFlow() {
  const [stage, setStage] = React.useState<FileStage>("choose");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [access, setAccess] = React.useState<"locked" | "public">("locked");
  const [published, setPublished] = React.useState(false);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-6">
      <header>
        <p className="text-sm text-muted-foreground">Create post · Generic digital goods</p>
        <h1 className="text-3xl font-semibold">Publish a downloadable file</h1>
      </header>
      <ol className="grid grid-cols-3 gap-2 text-sm" aria-label="Publication steps">
        {(["choose", "review", "publish"] as const).map((step) => (
          <li key={step} className={`rounded-md border p-2 ${stage === step ? "border-primary bg-primary/10" : ""}`}>
            {step === "choose" ? "1 · Choose file" : step === "review" ? "2 · Review" : "3 · Publish"}
          </li>
        ))}
      </ol>
      {stage === "choose" ? (
        <section className="space-y-3 rounded-lg border p-5">
          <h2 className="font-medium">Upload a supported file</h2>
          <p className="text-sm text-muted-foreground">CSV, TSV, TXT, or JSON · maximum 50 MiB. Files are scanned before publication.</p>
          <input
            aria-label="Downloadable file"
            accept=".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,text/plain,application/json"
            className="block w-full rounded-md border p-3"
            type="file"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
          />
          <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={!fileName} onClick={() => setStage("review")} type="button">
            Continue
          </button>
        </section>
      ) : null}
      {stage === "review" ? (
        <section className="space-y-4 rounded-lg border p-5">
          <div><h2 className="font-medium">Review {fileName}</h2><p className="text-sm text-muted-foreground">Plaintext is retained by the platform for rescanning and moderation.</p></div>
          <fieldset className="space-y-2"><legend className="font-medium">Access</legend>
            {(["locked", "public"] as const).map((value) => <label className="flex gap-2 text-sm" key={value}><input checked={access === value} name="access" onChange={() => setAccess(value)} type="radio" />{value === "locked" ? "Paid / locked (recommended)" : "Free / public (launch gate)"}</label>)}
          </fieldset>
          {access === "locked" ? <p className="rounded-md bg-muted p-3 text-sm">Buyers receive a signed download after entitlement and enforcement checks pass.</p> : <p className="rounded-md bg-amber-100 p-3 text-sm text-amber-950">Public publication is disabled until egress accounting and abuse throttles are enabled.</p>}
          <div className="flex gap-2"><button className="rounded-md border px-4 py-2" onClick={() => setStage("choose")} type="button">Back</button><button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={() => setStage("publish")} type="button">Continue</button></div>
        </section>
      ) : null}
      {stage === "publish" ? (
        <section className="space-y-4 rounded-lg border p-5">
          {!published ? <><h2 className="font-medium">Ready to publish</h2><p className="text-sm text-muted-foreground">The worker will claim the clean blob, create the asset and enforcement rows, register Story metadata, then create the listing.</p><button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={() => setPublished(true)} type="button">Publish {access === "locked" ? "locked" : "free"} file</button></> : <><h2 className="font-medium text-emerald-700">Publication queued</h2><p className="text-sm text-muted-foreground">Your file is processing. It will become available only after every delivery gate is active.</p><button className="rounded-md border px-4 py-2" onClick={() => { setPublished(false); setStage("choose"); setFileName(null); }} type="button">Create another file</button></>}
        </section>
      ) : null}
    </main>
  );
}

const meta = { title: "Compositions/Posts/PostComposer/Composer/File", component: FileComposerFlow, parameters: { layout: "fullscreen" } } satisfies Meta<typeof FileComposerFlow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Flow: Story = { name: "File publication flow" };
