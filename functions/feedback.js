/**
 * Emails each thumbs-down report to the team (FEEDBACK_EMAIL in functions/.env).
 *
 * The app writes feedback/{id} (firestore.rules limits its shape); this trigger sends it on.
 * Thumbs-up ratings aren't emailed. Each account can trigger at most MAX_PER_HOUR emails;
 * reports past that are still stored, just not emailed.
 */
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { getFirestore } = require("firebase-admin/firestore");
const { SMTP_PASS, MAIL_FROM, mailReady, transport } = require("./mail");

const FEEDBACK_EMAIL = defineString("FEEDBACK_EMAIL", { default: "feedbacks@articxai.com" });
const MAX_PER_HOUR = 10;

// Keep in step with chat.feedback.reasons in web/src/i18n.
const REASONS = {
  bug: "Bug: something isn't working",
  inaccurate: "Not accurate",
  unhelpful: "Not helpful",
  context: "Wrong for Canada or the user's province",
  instructions: "Didn't follow the request",
  harmful: "Harmful or offensive",
  other: "Something else",
};

const clip = (t, n) => (t.length > n ? `${t.slice(0, n)}\n[… ${t.length - n} more characters]` : t);

// One counter per account per hour; false once the account is over the limit.
async function underLimit(uid) {
  const ref = getFirestore().doc(`throttle/feedback_${uid}_${new Date().toISOString().slice(0, 13)}`);
  return getFirestore().runTransaction(async (tx) => {
    const n = (await tx.get(ref)).get("count") || 0;
    if (n >= MAX_PER_HOUR) return false;
    tx.set(ref, { count: n + 1, updatedAt: new Date() }, { merge: true });
    return true;
  });
}

exports.emailFeedback = onDocumentCreated(
  { document: "feedback/{id}", region: "northamerica-northeast2", secrets: [SMTP_PASS], maxInstances: 3, retry: false },
  async (event) => {
    const f = event.data?.data();
    if (!f || f.rating !== "down") return;
    if (!mailReady()) { logger.warn("Feedback not emailed: SMTP isn't set up", { id: event.params.id }); return; }
    if (!(await underLimit(f.uid))) { logger.warn("Feedback email skipped: hourly limit", { uid: f.uid }); return; }

    const reason = REASONS[f.reason] || "Not given";
    const urgent = f.reason === "harmful" || f.reason === "bug";
    const subject = `${urgent ? "[Priority] " : ""}Maple feedback: ${reason}`;
    const text = [
      `Reason: ${reason}`,
      `Note: ${f.details || "(none)"}`,
      "",
      `Feedback id: ${event.params.id}`,
      `Account: ${f.uid}${f.chatId ? "" : " (guest or unsaved chat)"}`,
      `Chat id: ${f.chatId || "-"}`,
      `Time: ${new Date(event.time).toISOString()}`,
      "",
      "----- Question -----",
      clip(f.prompt || "", 4000),
      "",
      "----- Maple's reply -----",
      clip(f.reply || "", 12000),
    ].join("\n");

    try {
      await transport().sendMail({ from: MAIL_FROM.value(), to: FEEDBACK_EMAIL.value(), subject, text });
    } catch (e) {
      logger.error("Feedback email failed", { id: event.params.id, error: e.message });
    }
  }
);
