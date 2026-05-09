import { useEffect, useRef } from "react";

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
        window.history.back();
      }
    }
  }, [isOpen]);
}
