import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { loadFirebase } from "../lib/firebase";
import { accountStep } from "./account";

// phase: "loading" | "guest" | "step" (signed in, still needs the code/profile) | "ready"
// Guests (including anonymous sessions used for the free messages) have user = null.
export function useAccount() {
  const [fb, setFb] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [state, setState] = useState({ phase: "loading", step: null, user: null });
  const seq = useRef(0);
  const profileOk = useRef(null);

  useEffect(() => { loadFirebase().then(setFb, setLoadError); }, []);

  const apply = useCallback(async (u) => {
    const n = ++seq.current;
    const real = u && !u.isAnonymous ? u : null;
    const step = real ? await accountStep(fb, real, profileOk.current).catch(() => "code") : null;
    if (n !== seq.current) return;
    if (!real) setState({ phase: "guest", step: null, user: null });
    else if (step) setState({ phase: "step", step, user: null });
    else setState({ phase: "ready", step: null, user: real, at: Date.now() });
  }, [fb]);

  useEffect(() => (fb ? onAuthStateChanged(fb.auth, apply) : undefined), [fb, apply]);

  const refresh = useCallback(() => apply(fb.auth.currentUser), [fb, apply]);
  const markProfileOk = useCallback((uid) => { profileOk.current = uid; }, []);
  return { fb, loadError, ...state, refresh, markProfileOk };
}
