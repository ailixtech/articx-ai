// Firebase is loaded only by the chat page. The web config is public and comes
// from Firebase Hosting (/__/firebase/init.json), so it always matches the
// project the site is deployed to.
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { CONFIG } from "../config";

let ready = null;

export function loadFirebase() {
  ready ??= fetch("/__/firebase/init.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error(`App config request failed (${r.status})`);
      return r.json();
    })
    .then((config) => {
      const app = initializeApp(config);
      return {
        auth: getAuth(app),
        db: getFirestore(app),
        fns: getFunctions(app, CONFIG.functionRegion),
        projectId: config.projectId,
        config, // for a second app instance (Settings > change password)
      };
    })
    .catch((e) => { ready = null; throw e; });
  return ready;
}
