export const postCardType = {
  meta: "text-base leading-tight",
  body: "text-base leading-snug",
  title: "text-lg leading-snug",
  label: "text-base leading-tight",
  caption: "text-base leading-snug",
  stat: "text-base leading-tight",
} as const;

export const postCardTextWrap = "break-words [overflow-wrap:anywhere]" as const;
export const postCardReadableWidth = "w-full max-w-full sm:max-w-[72ch]" as const;
export const postCardBodyTextColor = "text-foreground/90" as const;
export const postCardCaptionTextColor = "text-foreground/80" as const;
