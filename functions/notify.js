/**
 * Emails the team about each new company-site form submission: careers, AI Platform early access,
 * contact messages, feedback and product update sign-ups. Runs after the document is saved, so a mail problem
 * never fails the visitor's submission; failures are only logged.
 *
 * Uses the same ZeptoMail SMTP setup as the code emails (mail.js: SMTP_* in .env, SMTP_PASS secret).
 * NOTIFY_FROM picks the sender; NOTIFY_CAREERS_EMAIL (careers) and NOTIFY_EMAIL (everything else) the inbox. Reply-To is the visitor, so
 * answering the email goes straight to them. articx.com must be a verified sending domain in ZeptoMail.
 */
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { getStorage } = require("firebase-admin/storage");
const { SMTP_PASS, mailReady, transport } = require("./mail");

const NOTIFY_FROM = defineString("NOTIFY_FROM", { default: "Articx <noreply@articx.com>" });
const NOTIFY_EMAIL = defineString("NOTIFY_EMAIL", { default: "support@articx.com" });
// Career applications go to their own inbox; every other form goes to NOTIFY_EMAIL.
const NOTIFY_CAREERS_EMAIL = defineString("NOTIFY_CAREERS_EMAIL", { default: "hello@articx.com" });

const TOPIC_LABELS = { general: "General question", partnership: "Partnership", press: "Press" };
const FEEDBACK_LABELS = {
  bug: "Bug report",
  idea: "Feature idea",
  product: "Product feedback",
  website: "Website problem",
  accessibility: "Accessibility",
  content: "Content or translation error",
  other: "Other",
};

// For each collection: the subject line and the fields to list, as [label, value].
const KINDS = {
  careers: {
    subject: (d) => `[Careers] ${d.name} (${d.area})`,
    rows: (d) => [
      ["Name", d.name],
      ["Email", d.email],
      ["Area", d.area],
      ["Province / territory", d.province],
      ["Language", d.language],
      ["Message", d.message],
      ["Work or project link", d.link || "(not given)"],
      ["Résumé", d.resume ? `${d.resume.name} (attached; stored at ${d.resume.path})` : "(not given)"],
    ],
  },
  platform: {
    subject: (d) => `[AI Platform] Early access request from ${d.name}, ${d.company}`,
    rows: (d) => [
      ["Name", d.name],
      ["Email", d.email],
      ["Company", d.company],
      ["Role", d.role || "(not given)"],
      ["Team size", d.teamSize],
      ["Language", d.language],
      ["What they want to build", d.useCase],
    ],
  },
  contact: {
    subject: (d) => `[Contact: ${TOPIC_LABELS[d.topic] || d.topic}] ${d.name}${d.organization ? `, ${d.organization}` : ""}`,
    rows: (d) => [
      ["Topic", TOPIC_LABELS[d.topic] || d.topic],
      ["Name", d.name],
      ["Email", d.email],
      ["Organization", d.organization || "(not given)"],
      ["Language", d.language],
      ["Message", d.message],
    ],
  },
  siteFeedback: {
    subject: (d) => `[Feedback: ${FEEDBACK_LABELS[d.kind] || d.kind}] ${d.message.slice(0, 60)}${d.message.length > 60 ? "…" : ""}`,
    rows: (d) => [
      ["Type", FEEDBACK_LABELS[d.kind] || d.kind],
      ["Page", d.page || "(unknown)"],
      ["Name", d.name || "(not given)"],
      ["Email", d.email || "(not given, no reply possible)"],
      ["Language", d.language],
      ["Feedback", d.message],
    ],
  },
  updates: {
    subject: (d) => `[Updates] New product news sign-up: ${d.email}`,
    rows: (d) => [
      ["Email", d.email],
      ["First name", d.firstName || "(not given)"],
      ["Language", d.language],
    ],
  },
};

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function render(kind, d, id) {
  const rows = [...KINDS[kind].rows(d), ["Reference", `${kind}/${id}`]];
  const text = rows.map(([k, v]) => `${k}: ${v ?? ""}`).join("\n\n");
  const html =
    `<table style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td>` +
          `<td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
      )
      .join("") +
    `</table>`;
  return { text, html };
}

function notifier(kind) {
  return onDocumentCreated(
    { document: `${kind}/{id}`, region: "northamerica-northeast2", maxInstances: 3, secrets: [SMTP_PASS] },
    async (event) => {
      // deploy-phase1.sh stores "not-configured" for secrets prod doesn't have yet.
      if (!mailReady() || SMTP_PASS.value() === "not-configured") {
        return logger.warn("Email not configured; skipping notification", { kind, id: event.params.id });
      }
      const d = event.data?.data() || {};
      const { text, html } = render(kind, d, event.params.id);
      // Career applications may carry a résumé in Cloud Storage: attach it so it's in the inbox too.
      const attachments = [];
      if (d.resume?.path) {
        try {
          const [content] = await getStorage().bucket().file(d.resume.path).download();
          attachments.push({ filename: d.resume.name, content, contentType: d.resume.type });
        } catch (e) {
          logger.error("Could not attach résumé", { id: event.params.id, error: e.message });
        }
      }
      try {
        await transport().sendMail({
          from: NOTIFY_FROM.value(),
          to: kind === "careers" ? NOTIFY_CAREERS_EMAIL.value() : NOTIFY_EMAIL.value(),
          replyTo: d.email || undefined,
          subject: KINDS[kind].subject(d),
          text,
          html,
          attachments,
        });
      } catch (e) {
        logger.error("Notification email failed", { kind, id: event.params.id, error: e.message });
      }
    },
  );
}

exports.notifyCareers = notifier("careers");
exports.notifyPlatform = notifier("platform");
exports.notifyContact = notifier("contact");
exports.notifyUpdates = notifier("updates");
exports.notifySiteFeedback = notifier("siteFeedback");
