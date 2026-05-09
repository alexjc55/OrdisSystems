import { useEffect, useRef } from "react";

// Global flag to suppress popstate events fired by our own history.back() calls.
let suppressNextPopstate = false;

/**
 * Call this instead of raw window.history.back() whenever you want to pop a
 * history entry that YOU pushed (modal open, overlay, etc.) so that other
 * useModalBackButton handlers don't misinterpret the resulting popstate as a
 * real user "back" press and close an unrelated modal.
 */
export function suppressedHistoryBack() {
  suppressNextPopstate = true;
  window.history.back();
  setTimeout(() => { suppressNextPopstate = false; }, 500);
}

/**
 * Intercepts the Android/iOS back button (and browser back) to close a modal
 * dialog instead of navigating away from the page.
 */
export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const historyRef = useRef<{ pushed: boolean; handler: ((e: PopStateEvent) => void) | null }>({
    pushed: false,
    handler: null,
  });
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ modal: true }, "", window.location.href);
      historyRef.current.pushed = true;

      const onPopState = () => {
        if (suppressNextPopstate) {
          return;
        }
        historyRef.current.pushed = false;
        historyRef.current.handler = null;
        window.removeEventListener("popstate", onPopState);
        onCloseRef.current();
      };

      window.addEventListener("popstate", onPopState);
      historyRef.current.handler = onPopState;

      return () => {
        window.removeEventListener("popstate", onPopState);
      };
    } else {
      const { pushed, handler } = historyRef.current;
      if (handler) {
        window.removeEventListener("popstate", handler);
        historyRef.current.handler = null;
      }
      if (pushed) {
        historyRef.current.pushed = false;
        suppressedHistoryBack();
      }
    }
  }, [isOpen]);
}
