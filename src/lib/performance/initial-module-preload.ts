export const OPTIONAL_INITIAL_PRELOAD_CHUNKS = [
  {
    token: "self-verification-modal-",
    source: "src/components/compositions/verification/self-verification-modal/self-verification-modal.tsx",
  },
  {
    token: "zkpassport-verification-modal-",
    source: "src/components/compositions/verification/zkpassport-verification-modal/zkpassport-verification-modal.tsx",
  },
  {
    token: "altcha-pow-widget-",
    source: "src/components/compositions/verification/altcha-pow-widget/altcha-pow-widget.tsx",
  },
  {
    token: "video-experience-overlay-",
    source: "src/app/video-experience/video-experience-overlay.tsx",
  },
] as const;

export function resolveInitialModulePreloadDependencies(dependencies: string[]): string[] {
  return dependencies.filter((dependency) =>
    !OPTIONAL_INITIAL_PRELOAD_CHUNKS.some(({ token }) => dependency.includes(token))
  );
}
