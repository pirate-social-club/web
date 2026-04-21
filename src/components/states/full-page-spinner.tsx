import { Spinner } from "@/components/primitives/spinner";

export function FullPageSpinner() {
  return (
    <section className="flex min-w-0 flex-1 items-center justify-center py-20">
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    </section>
  );
}
