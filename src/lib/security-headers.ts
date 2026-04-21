export const X_FRAME_OPTIONS_HEADER = "X-Frame-Options";
export const X_FRAME_OPTIONS_DENY = "DENY";

export function applyFrameDenyHeader(headers: Headers): void {
  headers.set(X_FRAME_OPTIONS_HEADER, X_FRAME_OPTIONS_DENY);
}
