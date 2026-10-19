/**
 * The waitlist thank-you email (en/fr), sent by welcomeWaitlist in waitlistEmail.js.
 * Inline styles only: Gmail and Outlook drop <style> rules and class names.
 * Preview: node -e 'const {renderWaitlistEmail:r}=require("./waitlistEmailTemplate");require("fs").writeFileSync("/tmp/w.html",r({firstName:"Sarah",language:"en",token:"x"}).html)'
 */
const SITE = "https://articx.com";
const LOGO = `${SITE}/apple-touch-icon.png`; // black Articx mark on white, 180×180

const COPY = {
  en: {
    subject: "You're on the Articx AI waitlist",
    preheader: "Thanks for joining the Articx AI waitlist. We'll let you know as soon as your spot opens up.",
    label: "Waitlist confirmed",
    title: (name) => `You're on the list, ${name}.`,
    intro: "Thanks for signing up for early access to Articx AI. We'll email you as soon as your spot is ready.",
    nextTitle: "What happens next",
    steps: [
      "We'll send your invite to this email address when your spot opens.",
      "As a beta member, you’ll get a discount after our public launch.",
      "Questions or a use case in mind? Click [Support] and send us a message.",
    ],
    signoff: "Talk soon,",
    team: "The Articx AI Team",
    why: "You're receiving this because you joined the Articx AI waitlist at",
    support: "Support",
    privacy: "Privacy Policy",
    terms: "Terms",
    unsubscribe: "Unsubscribe",
  },
  fr: {
    subject: "Vous êtes sur la liste d’attente d’Articx AI",
    preheader: "Merci de vous être inscrit à la liste d’attente d’Articx AI. Nous vous écrirons dès que votre place sera prête.",
    label: "Inscription confirmée",
    title: (name) => `Vous êtes sur la liste, ${name}.`,
    intro: "Merci de vous être inscrit pour l’accès anticipé à Articx AI. Nous vous écrirons dès que votre place sera prête.",
    nextTitle: "La suite",
    steps: [
      "Nous enverrons votre invitation à cette adresse courriel dès que votre place sera prête.",
      "En tant que membre bêta, vous profiterez d’un rabais après notre lancement public.",
      "Une question ou un projet en tête? Cliquez sur [Soutien] pour nous écrire.",
    ],
    signoff: "À bientôt,",
    team: "L’équipe Articx AI",
    why: "Vous recevez ce courriel parce que vous vous êtes inscrit à la liste d’attente d’Articx AI sur",
    support: "Soutien",
    privacy: "Politique de confidentialité",
    terms: "Conditions",
    unsubscribe: "Se désabonner",
  },
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// The email as { subject, html, text, unsubscribeUrl }.
function renderWaitlistEmail({ firstName, language, token }) {
  const t = COPY[language] || COPY.en;
  const name = firstName || "";
  const title = name ? t.title(name) : t.title("").replace(/, \./, ".");
  const unsubscribeUrl = `${SITE}/unsubscribe?token=${encodeURIComponent(token)}`;
  const link = (href, label) => `<a href="${esc(href)}" style="color:#6b7280;text-decoration:underline;">${esc(label)}</a>`;
  const step = (n, text, last) => `
                            <tr>
                              <td width="34" valign="top" style="padding:0 0 ${last ? 0 : 14}px 0;">
                                <div style="width:24px;height:24px;line-height:24px;border-radius:12px;background-color:#111111;color:#ffffff;font-size:13px;font-weight:700;text-align:center;">${n}</div>
                              </td>
                              <td valign="top" style="padding:2px 0 ${last ? 0 : 14}px 0;font-size:15px;line-height:22px;color:#4b5563;">${esc(text).replace(/\[([^\]]+)\]/, (_, w) => `<a href="${SITE}/?feedback" style="color:#111111;font-weight:600;text-decoration:underline;">${w}</a>`)}</td>
                            </tr>`;

  const html = `<!DOCTYPE html>
<html lang="${language === "fr" ? "fr" : "en"}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${esc(t.subject)}</title>
  <!--[if mso]><style>table,td,div,p,a,h1,span{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .h1 { font-size: 28px !important; line-height: 36px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(t.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:24px 8px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;">

          <tr>
            <td class="px" style="padding:16px 48px 0 48px;font-family:${FONT};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <a href="${SITE}" style="text-decoration:none;"><img src="${LOGO}" width="32" height="32" alt="Articx AI" style="display:block;border:0;" /></a>
                  </td>
                  <td valign="middle">
                    <a href="${SITE}" style="font-size:20px;font-weight:700;color:#111111;letter-spacing:-0.3px;text-decoration:none;">Articx AI</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height:40px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <tr>
            <td class="px" style="padding:0 48px;font-family:${FONT};">
              <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">${esc(t.label)}</p>
              <h1 class="h1" style="margin:0 0 16px 0;font-size:34px;line-height:42px;font-weight:700;color:#111111;letter-spacing:-0.6px;">${esc(title)}</h1>
              <p style="margin:0;font-size:15px;line-height:24px;color:#6b7280;">${esc(t.intro)}</p>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:28px 48px 0 48px;font-family:${FONT};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb;border-radius:12px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 16px 0;font-size:15px;font-weight:600;color:#111111;">${esc(t.nextTitle)}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${t.steps.map((s, i) => step(i + 1, s, i === t.steps.length - 1)).join("")}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:28px 48px 0 48px;font-family:${FONT};">
              <p style="margin:0;font-size:15px;line-height:24px;color:#4b5563;">${esc(t.signoff)}<br /><span style="color:#111111;font-weight:600;">${esc(t.team)}</span></p>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:32px 48px 0 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #e5e7eb;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:20px 48px 24px 48px;font-family:${FONT};font-size:12px;line-height:20px;color:#9ca3af;">
              ${esc(t.why)} <a href="${SITE}" style="color:#9ca3af;text-decoration:underline;">articx.com</a>.<br />
              Articx Inc. &middot; Toronto, Ontario M1B 6K3, Canada<br />
              <span style="display:inline-block;padding-top:8px;">
                ${link(`${SITE}/?feedback`, t.support)} &nbsp;&middot;&nbsp;
                ${link(`${SITE}/privacy`, t.privacy)} &nbsp;&middot;&nbsp;
                ${link(`${SITE}/terms`, t.terms)} &nbsp;&middot;&nbsp;
                ${link(unsubscribeUrl, t.unsubscribe)}
              </span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    t.label.toUpperCase(),
    "",
    title,
    "",
    t.intro,
    "",
    `${t.nextTitle}:`,
    ...t.steps.map((s, i) => `${i + 1}. ${s.replace(/\[([^\]]+)\]/, `$1 (${SITE}/?feedback)`)}`),
    "",
    t.signoff,
    t.team,
    "",
    "—",
    `${t.why} articx.com.`,
    "Articx Inc. · Toronto, Ontario M1B 6K3, Canada",
    `${t.support}: ${SITE}/?feedback`,
    `${t.privacy}: ${SITE}/privacy`,
    `${t.terms}: ${SITE}/terms`,
    `${t.unsubscribe}: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject: t.subject, html, text, unsubscribeUrl };
}

module.exports = { renderWaitlistEmail, SITE };
