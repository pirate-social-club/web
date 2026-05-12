export function isRenderableImageSrc(src: string): boolean {
  const trimmed = src.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed) {
    return false;
  }

  if (
    normalized.startsWith("data:")
    || normalized.startsWith("blob:")
    || normalized.startsWith("http://")
    || normalized.startsWith("https://")
    || normalized.startsWith("/")
    || normalized.startsWith("./")
    || normalized.startsWith("../")
  ) {
    return true;
  }

  return !/^[a-z][a-z0-9+.-]*:/iu.test(trimmed);
}
