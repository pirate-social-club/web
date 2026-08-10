const MP4_HEADER_BYTES = 16;
const MAX_TOP_LEVEL_BOXES = 1_024;

function isMp4(file: File): boolean {
  return file.type.toLowerCase() === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
}

function readUint64(view: DataView, offset: number): number | null {
  const value = view.getBigUint64(offset);
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : null;
}

async function readBoxHeader(file: File, offset: number): Promise<{
  size: number;
  type: string;
} | null> {
  const bytes = await file.slice(offset, Math.min(file.size, offset + MP4_HEADER_BYTES)).arrayBuffer();
  if (bytes.byteLength < 8) return null;

  const view = new DataView(bytes);
  const type = String.fromCharCode(
    view.getUint8(4),
    view.getUint8(5),
    view.getUint8(6),
    view.getUint8(7),
  );
  const compactSize = view.getUint32(0);
  if (compactSize === 0) return { size: file.size - offset, type };
  if (compactSize !== 1) return compactSize >= 8 ? { size: compactSize, type } : null;
  if (bytes.byteLength < MP4_HEADER_BYTES) return null;
  const extendedSize = readUint64(view, 8);
  return extendedSize != null && extendedSize >= MP4_HEADER_BYTES
    ? { size: extendedSize, type }
    : null;
}

export async function hasProgressiveMp4Layout(file: File): Promise<boolean | null> {
  if (!isMp4(file)) return null;

  let offset = 0;
  for (let index = 0; offset < file.size && index < MAX_TOP_LEVEL_BOXES; index += 1) {
    const box = await readBoxHeader(file, offset);
    if (!box || box.size > file.size - offset) return null;
    if (box.type === "moov") return true;
    if (box.type === "mdat") return false;
    offset += box.size;
  }
  return null;
}

export async function assertProgressiveMp4Layout(file: File): Promise<void> {
  if (await hasProgressiveMp4Layout(file) === false) {
    throw new Error(
      "Optimize this MP4 for web playback (fast start) before uploading it.",
    );
  }
}
