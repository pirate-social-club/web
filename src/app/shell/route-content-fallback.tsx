import { Spinner } from "@/components/primitives/spinner";

export function RouteContentFallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center" aria-busy="true">
      <Spinner className="size-6" />
    </div>
  );
}
