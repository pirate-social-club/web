import * as React from "react";

import { getErrorMessage } from "@/lib/error-utils";
import { logger } from "@/lib/logger";
import { toast } from "@/components/primitives/sonner";
import {
  processingPostPollDelayMs,
  shouldContinueProcessingPostPolling,
} from "./processing-post-polling";

export function useProcessingPostPolling(input: {
  postId: string;
  postStatus: string | null | undefined;
  refreshPost: () => Promise<unknown>;
}): {
  processingTimedOut: boolean;
  refreshProcessingPost: () => Promise<void>;
} {
  const { postId, postStatus, refreshPost } = input;
  const [processingTimedOut, setProcessingTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (postStatus !== "processing") {
      setProcessingTimedOut(false);
      return undefined;
    }

    const startedAt = Date.now();
    let cancelled = false;
    let timeoutId: number | null = null;
    setProcessingTimedOut(false);
    const tick = async () => {
      try {
        await refreshPost();
      } catch (error) {
        logger.warn("[post-processing] refresh failed", {
          error,
          postId,
        });
      }
      if (cancelled) return;
      const elapsedMs = Date.now() - startedAt;
      if (!shouldContinueProcessingPostPolling(elapsedMs)) {
        setProcessingTimedOut(true);
        return;
      }
      timeoutId = window.setTimeout(() => {
        void tick();
      }, processingPostPollDelayMs(elapsedMs));
    };
    void tick();
    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [postId, postStatus, refreshPost]);

  const refreshProcessingPost = React.useCallback(async () => {
    // A timed-out post gets one explicit refresh; do not restart the bounded poll.
    try {
      await refreshPost();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not refresh this post."));
    }
  }, [refreshPost]);

  return { processingTimedOut, refreshProcessingPost };
}
