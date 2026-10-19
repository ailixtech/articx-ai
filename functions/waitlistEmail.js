/**
 * Waitlist thank-you email and unsubscribe.
 *
 * welcomeWaitlist: runs when a new waitlist/{id} document is created (functions/waitlist.js). It gives the
 * sign-up a random unsubscribeToken, then emails the "You're on the list" message in the person's language
 * (en/fr). Runs after the sign-up is saved, so a mail problem never fails the form; failures are only logged.
 * A second sign-up with the same email creates nothing, so nobody gets the email twice.
 *
 * waitlistUnsubscribe (POST /api/unsubscribe, a Hosting rewrite; articx.com calls it cross-origin, cors.js):
 *   { token, action: "unsubscribe" | "resubscribe" }  → { ok, firstName }
 *   Also answers RFC 8058 one-click unsubscribes (Gmail/Yahoo "Unsubscribe" button), which POST
 *   "List-Unsubscribe=One-Click" to ?token=… from the List-Unsubscribe header.
 *   Unsubscribing sets status "unsubscribed" (the invite sender must skip these); resubscribing sets "waiting".
 *   GET does nothing, so link scanners that open the URL never unsubscribe anyone.
 *
 * The unsubscribe page is apps/articx/src/pages/Unsubscribe.jsx (articx.com/unsubscribe?token=…).
 * Sender: WAITLIST_FROM (articx.com must be a verified sending domain in ZeptoMail). Replies go to WAITLIST_REPLY_TO.
 */
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { randomBytes } = require("node:crypto");
const { SMTP_PASS, mailReady, transport } = require("./mail");
const { cors } = require("./cors");
const { HTTP_OPTIONS, str } = require("./shared");
const { renderWaitlistEmail } = require("./waitlistEmailTemplate");

const WAITLIST_FROM = defineString("WAITLIST_FROM", { default: "Articx AI <noreply@articx.com>" });
const WAITLIST_REPLY_TO = defineString("WAITLIST_REPLY_TO", { default: "support@articx.com" });
const API = "https://articx-ai.web.app";

exports.welcomeWaitlist = onDocumentCreated(
  { document: "waitlist/{id}", region: HTTP_OPTIONS.region, maxInstances: 3, secrets: [SMTP_PASS] },
  async (event) => {
    const snap = event.data;
    const d = snap?.data();
    if (!d?.email) return;
    // The token is saved even when email isn't configured yet, so every sign-up can unsubscribe later.
    const token = d.unsubscribeToken || randomBytes(24).toString("base64url");
    if (!d.unsubscribeToken) await snap.ref.update({ unsubscribeToken: token });

    // deploy-phase1.sh stores "not-configured" for secrets prod doesn't have yet.
    if (!mailReady() || SMTP_PASS.value() === "not-configured") {
      return logger.warn("Email not configured; skipping waitlist thank-you", { id: event.params.id });
    }
    const { subject, html, text } = renderWaitlistEmail({ firstName: d.firstName, language: d.language, token });
    const oneClick = `${API}/api/unsubscribe?token=${encodeURIComponent(token)}`;
    try {
      await transport().sendMail({
        from: WAITLIST_FROM.value(),
        to: d.email,
        replyTo: WAITLIST_REPLY_TO.value(),
        subject,
        text,
        html,
        headers: {
          // Gmail/Yahoo show their own "Unsubscribe" button from these (RFC 2369 + RFC 8058 one-click).
          "List-Unsubscribe": `<${oneClick}>, <mailto:${WAITLIST_REPLY_TO.value()}?subject=Unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      await snap.ref.update({ welcomeSentAt: FieldValue.serverTimestamp() });
    } catch (e) {
      logger.error("Waitlist thank-you email failed", { id: event.params.id, error: e.message });
    }
  },
);

exports.waitlistUnsubscribe = onRequest(HTTP_OPTIONS, async (req, res) => {
  if (cors(req, res, "POST, OPTIONS")) return;
  res.set("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });

  const b = req.body && typeof req.body === "object" ? req.body : {};
  const token = str(b.token, 100) || str(req.query.token, 100);
  // One-click unsubscribes from mail apps arrive as a form post: List-Unsubscribe=One-Click
  const action = b.action === "resubscribe" ? "resubscribe" : "unsubscribe";
  if (!token) return res.status(400).json({ error: "token" });

  try {
    const db = getFirestore();
    const found = await db.collection("waitlist").where("unsubscribeToken", "==", token).limit(1).get();
    if (found.empty) return res.status(404).json({ error: "token" });
    const doc = found.docs[0];
    await doc.ref.update(
      action === "unsubscribe"
        ? { status: "unsubscribed", unsubscribedAt: FieldValue.serverTimestamp() }
        : { status: "waiting", unsubscribedAt: FieldValue.delete(), resubscribedAt: FieldValue.serverTimestamp() },
    );
    return res.json({ ok: true, firstName: doc.get("firstName") || "" });
  } catch (e) {
    logger.error("Waitlist unsubscribe failed", { action, error: e.message });
    return res.status(500).json({ error: "server" });
  }
});

