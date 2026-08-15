import * as React from "react";

import type { DownloadFileComposerState } from "./post-composer.types";
import { defaultDownloadFileState } from "./post-composer-config";

export function useDownloadFileComposerState(input: {
  file?: DownloadFileComposerState;
  onChange?: (next: DownloadFileComposerState) => void;
}) {
  const { file, onChange } = input;
  const [uncontrolledFileState, setUncontrolledFileState] = React.useState<DownloadFileComposerState>(
    () => defaultDownloadFileState(file),
  );
  const setFile = React.useCallback((next: DownloadFileComposerState) => {
    if (file === undefined) setUncontrolledFileState(next);
    onChange?.(next);
  }, [file, onChange]);
  return { file: file ?? uncontrolledFileState, setFile };
}
