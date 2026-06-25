import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { REQUIRED_TOAST } from "../constants/requiredToastMessages";

const EXIT_TOAST_ID = "press-again-to-exit";
const EXIT_WINDOW_MS = 2000;

/** Web parity with Android double-back-to-exit on home routes. */
export function useDoubleBackToExit(enabled: boolean) {
  const lastBackRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const onPopState = () => {
      const now = Date.now();
      if (now - lastBackRef.current < EXIT_WINDOW_MS) {
        toast.dismiss(EXIT_TOAST_ID);
        return;
      }
      lastBackRef.current = now;
      toast(REQUIRED_TOAST.PRESS_AGAIN_TO_EXIT, { id: EXIT_TOAST_ID, duration: 2000 });
      window.history.pushState({ gpExitGuard: true }, "");
    };

    window.history.pushState({ gpExitGuard: true }, "");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled]);
}
