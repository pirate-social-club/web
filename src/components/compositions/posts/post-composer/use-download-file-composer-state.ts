import * as React from "react";

import type { DownloadFileComposerState } from "./post-composer.types";
import { defaultDownloadFileState } from "./post-composer-config";

export function useDownloadFileComposerState(input: {
  file?: DownloadFileComposerState;
  onChange?: (next: DownloadFileComposerState) => void;
}) {
  const [uncontrolledFileState, setUncontrolledFileState] = React.useState<DownloadFileComposerState>(
    () => defaultDownloadFileState(input.file),
  );
  const setFile = React.useCallback((next: DownloadFileComposerState) => {
    if (input.file === undefined) setUncontrolledFileState(next);
    input.onChange?.(next);
  }, [input.file, input.onChange]);
  return { file: input.file ?? uncontrolledFileState, setFile };
}
