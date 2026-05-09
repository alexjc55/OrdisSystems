import { useEffect, useRef } from "react";

/**
 * Counter of pending suppressed popstate events.
 * Incremented by suppressedHistoryBack(), decremented inside onPopState
 * handlers when they decide to ignore the event (bubble phase, AFTER checks).
 */
let suppressCount = 0;

export function isPopstateSuppressed(): boolean {
  return suppressCount > 0;
}

/**
 * Call this instead of raw window.history.back() whenever you want to pop a
 * history entry that YOU pushed (modal open, overlay, etc.) so that other
 * useModalBackButton handlers don't misinterpret the resulting popstate as a
 * real user "back" press and close an unrelated modal.
 */
export function suppressedHistoryBack() {
  suppressCount++;
  window.history.back();
  // Decrement in BUBBLE phase (no capture:true) so modal handlers
  // run FIRST (they were registered earlier), see suppressCount > 0,
  // and return early BEFORE this listener decrements the counter.
  window.addEventListener(
    "popstate",
    () => {
      suppressCount = Math.max(0, suppressCount - 1);
    },
    { once: true }
  );
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

      const onPopState = (e: PopStateEvent) => {
        // Suppressed by suppressedHistoryBack() — ignore.
        if (suppressCount > 0) {
          return;
        }
        // We landed ON our {modal:true} entry, not past it.
        // This happens when something above us in the stack (e.g. cart sidebar)
        // called history.back() and we are now the top entry — stay open.
        if (e.state?.modal) {
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
