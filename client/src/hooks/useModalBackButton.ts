import { useEffect, useRef } from "react";

/**
 * Intercepts the Android/iOS back button (and browser back) to close a modal dialog
 * instead of navigating away from the page.
 *
 * Uses a unique modal key stored in history.state to avoid reacting to
 * unrelated popstate events (file picker navigation, push permission dialog, etc.)
 */
export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const modalKey = useRef(`modal_${Math.random().toString(36).slice(2)}`);
  const historyRef = useRef<{ pushed: boolean; handler: ((e: PopStateEvent) => void) | null }>({
    pushed: false,
    handler: null,
  });
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (isOpen) {
      const key = modalKey.current;
      window.history.pushState({ modalKey: key }, "", window.location.href);
      historyRef.current.pushed = true;

      const onPopState = (e: PopStateEvent) => {
        // Only handle popstate events that correspond to OUR modal entry.
        // This prevents file picker navigation, push-permission dialogs,
        // or any other unrelated popstate from closing this dialog.
        if (e.state?.modalKey !== key) return;

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
