"use client";

import * as React from "react";

export const VideoHomeChromeContext = React.createContext<React.Dispatch<React.SetStateAction<boolean>> | null>(null);

/**
 * Lets the Home route opt into media chrome only after it has resolved to the video surface.
 * Loading, empty, and error fallbacks therefore retain the normal app header.
 */
export function useVideoHomeChrome(active: boolean): void {
  const setActive = React.useContext(VideoHomeChromeContext);

  React.useLayoutEffect(() => {
    if (!setActive) return;
    setActive(active);
    return () => setActive(false);
  }, [active, setActive]);
}
