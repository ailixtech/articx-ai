/**
 * Public share links for chats.
 *
 * shareChat({ chatId }) copies the chat as it is now into shares/{shareId}, which anyone
 * with the link can read (firestore.rules). Sharing again refreshes the same link.
 * shareChat({ chatId, stop: true }) deletes the link.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { randomBytes } = require("node:crypto");

const OPTS = { region: "northamerica-northeast2", maxInstances: 10, invoker: "public" };
const MAX_MESSAGES = 200;
const MAX_BYTES = 800_000; // Firestore documents top out at 1 MiB

exports.shareChat = onCall(OPTS, async (req) => {
  const uid = req.auth?.uid;
  if (!uid || req.auth.token.otp !== true) throw new HttpsError("unauthenticated", "Sign in to share chats.");
  const chatId = String(req.data?.chatId || "");
  if (!/^[A-Za-z0-9]{1,64}$/.test(chatId)) throw new HttpsError("invalid-argument", "Unknown chat.");

  const db = getFirestore();
  const chatRef = db.doc(`users/${uid}/chats/${chatId}`);
  const chat = await chatRef.get();
  if (!chat.exists) throw new HttpsError("not-found", "Unknown chat.");
  const oldId = chat.get("shareId");

  if (req.data?.stop) {
    if (oldId) await db.doc(`shares/${oldId}`).delete();
    await chatRef.update({ shareId: FieldValue.delete() });
    return { id: null };
  }

  const snap = await chatRef.collection("messages").orderBy("createdAt").limit(MAX_MESSAGES).get();
  const messages = [];
  let bytes = 0;
  for (const d of snap.docs) {
    const m = { role: d.get("role"), content: String(d.get("content") || "") };
    bytes += Buffer.byteLength(m.content);
    if (bytes > MAX_BYTES) break;
    messages.push(m);
  }
  if (!messages.length) throw new HttpsError("failed-precondition", "This chat has no messages yet.");

  const id = oldId || randomBytes(12).toString("base64url");
  await db.doc(`shares/${id}`).set({ uid, title: chat.get("title") || "", messages, createdAt: FieldValue.serverTimestamp() });
  if (!oldId) await chatRef.update({ shareId: id });
  return { id };
});
