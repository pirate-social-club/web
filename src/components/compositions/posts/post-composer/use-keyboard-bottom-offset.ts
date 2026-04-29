import * as React from "react";

export function useKeyboardBottomOffset() {
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const activeViewport: VisualViewport = viewport;

    function updateOffset() {
      const next = Math.max(
        0,
        window.innerHeight - activeViewport.height - activeViewport.offsetTop,
      );
      setOffset(next);
    }

    updateOffset();
    activeViewport.addEventListener("resize", updateOffset);
    activeViewport.addEventListener("scroll", updateOffset);
    return () => {
      activeViewport.removeEventListener("resize", updateOffset);
      activeViewport.removeEventListener("scroll", updateOffset);
    };
  }, []);

  return offset;
}
