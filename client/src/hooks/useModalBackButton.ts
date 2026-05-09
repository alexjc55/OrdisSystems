import { useEffect, useRef } from "react";

/**
 * Counter of pending suppressed popstate events.
 * Incremented by suppressedHistoryBack(), decremented by each onPopState handler
 * that decides to ignore the event (so the decrement happens inside the same
 * bubble-phase handler that checked the flag, before any other listener).
 */
let suppressCount = 0;

// ─── DEV-ONLY DIAGNOSTICS ────────────────────────────────────────────────────
// Intercept history.back() and all popstate events to trace the exact call
// chain that closes a modal unexpectedly. Remove before production release.
if (import.meta.env.DEV && typeof window !== "undefined") {
  // Override history.back with a logged version
  const _origBack = window.history.back.bind(window.history);
  (window.history as any).back = function tracedBack() {
    console.error(
      `%c[🔴 history.back() called] suppressCount=${suppressCount}`,
      "color:red;font-weight:bold",
      new Error("history.back stack").stack
    );
    return _origBack();
  };

  // Log every popstate in capture phase (runs before any bubble handler)
  window.addEventListener(
    "popstate",
    (e) => {
      console.error(
        `%c[🔴 popstate fired] state=${JSON.stringify(e.state)}  suppressCount=${suppressCount}`,
        "color:red;font-weight:bold",
        new Error("popstate stack").stack
      );
    },
    { capture: true }
  );
}
// ─────────────────────────────────────────────────────────────────────────────

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
  // Fallback decrement: fires in bubble phase AFTER all modal handlers have run.
  // Each modal handler decrements suppressCount itself when it suppresses; this
  // fallback handles the case where no modal handler is registered (all modals
  // are closed at the time of the back() call).
  window.addEventListener(
    "popstate",
    () => {
      if (suppressCount > 0) {
        suppressCount--;
      }
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
        if (import.meta.env.DEV) {
          console.warn(
            `%c[useModalBackButton] onPopState fired. suppressCount=${suppressCount}, e.state=${JSON.stringify(e.state)}`,
            "color:orange;font-weight:bold"
          );
        }
        // This popstate was generated programmatically by suppressedHistoryBack().
        // Consume the token here so the fallback listener doesn't double-decrement.
        if (suppressCount > 0) {
          suppressCount--;
          return;
        }
        // We landed ON our {modal:true} entry (not past it).
        // This happens when something that was stacked on top of us (e.g. another
        // modal or cart sidebar) went back one step – we should stay open.
        if (e.state?.modal) {
          return;
        }
        if (import.meta.env.DEV) {
          console.error(
            "%c[useModalBackButton] ← Closing modal due to unsuppressed popstate!",
            "color:red;font-weight:bold"
          );
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
