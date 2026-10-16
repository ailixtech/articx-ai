import { useEffect, useRef, useState } from "react";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { sessionDoc, swapToken } from "./account";

const TOUCH_EVERY_MS = 60 * 60 * 1000;

// This browser's row in Settings > Active sessions. Returns its id once known.
// - Sessions from before tracking get a row (claimSession swaps in a token that carries the id).
// - "Updated" is bumped at most once an hour while the app is open.
// - If the row disappears (signed out from another device), this browser signs out too.
export function useSession(fb, uid) {
  const [sid, setSid] = useState(null);
  const claiming = useRef(false);

  useEffect(() => {
    setSid(null);
    if (!fb || !uid) return;
    return onIdTokenChanged(fb.auth, async (u) => {
      if (!u || u.uid !== uid) return;
      const { claims } = await u.getIdTokenResult();
      if (claims.otp !== true) return;
      if (claims.sid) return setSid(claims.sid);
      if (claiming.current) return;
      claiming.current = true;
      swapToken(fb, "claimSession").catch((e) => console.error("Session check failed:", e));
    });
  }, [fb, uid]);

  useEffect(() => {
    if (!sid) return;
    return onSnapshot(sessionDoc(fb, uid, sid), { includeMetadataChanges: false }, (snap) => {
      if (snap.metadata.fromCache) return;
      if (!snap.exists()) { signOut(fb.auth); return; }
      const at = snap.get("updatedAt")?.toMillis?.() ?? Date.now();
      if (Date.now() - at > TOUCH_EVERY_MS) updateDoc(snap.ref, { updatedAt: serverTimestamp() }).catch(() => {});
    }, () => {});
  }, [fb, uid, sid]);

  return sid;
}
