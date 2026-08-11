const POST_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const POST_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function inferredPostImageMimeType(filename: string): string | null {
  const normalized = filename.trim().toLowerCase();
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".gif")) return "image/gif";
  if (normalized.endsWith(".avif")) return "image/avif";
  return null;
}

export function assertPostImageFile(file: File): void {
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error("The image is empty.");
  }
  if (file.size > POST_IMAGE_MAX_BYTES) {
    throw new Error("The image exceeds the 20MB limit.");
  }

  const declaredMimeType = file.type.trim().toLowerCase();
  const resolvedMimeType = !declaredMimeType || declaredMimeType === "application/octet-stream"
    ? inferredPostImageMimeType(file.name)
    : declaredMimeType;
  if (!resolvedMimeType || !POST_IMAGE_MIME_TYPES.has(resolvedMimeType)) {
    throw new Error("Choose a JPEG, PNG, WebP, GIF, or AVIF image.");
  }
}
