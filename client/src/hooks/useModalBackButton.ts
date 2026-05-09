import { useEffect, useRef } from "react";

// Global flag to suppress popstate events fired by our own history.back() calls.
// When a modal closes and calls history.back(), we briefly ignore the resulting
// popstate so it doesn't accidentally close another modal that just opened.
let suppressNextPopstate = false;

/**
 * Intercepts the Android/iOS back button (and browser back) to close a modal dialog
 * instead of navigating away from the page.
 *
 * - On open:  pushes a history entry so the back button has something to pop.
 * - On back:  the handler fires, closes the modal; browser already navigated back.
 * - On close via button/X: removes the listener then calls history.back() to pop
 *   the pushed entry, keeping the history stack clean.
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
        // Skip if this popstate was caused by another modal's cleanup history.back()
        if (suppressNextPopstate) return;
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
        // Suppress the popstate this back() will generate so other open modals
        // don't accidentally receive and react to it.
        suppressNextPopstate = true;
        window.history.back();
        // Clear the flag after a short delay (popstate is always async)
        setTimeout(() => { suppressNextPopstate = false; }, 200);
      }
    }
  }, [isOpen]);
}
