interface IconProps {
  class?: string;
}

export function IconX(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function IconArrowUp(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 5v14M19 12l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function IconChatCircle(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect height="14" rx="1.5" width="4" x="6" y="5" />
      <rect height="14" rx="1.5" width="4" x="14" y="5" />
    </svg>
  );
}

export function IconMusicNote(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9 18V5l12-2v13" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="13" height="13" x="9" y="9" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
