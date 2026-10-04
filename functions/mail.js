// SMTP settings shared by the code emails (auth.js) and feedback reports (feedback.js).
// Config lives in functions/.env; the password is the SMTP_PASS secret.
const { defineSecret, defineString, defineInt } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

const SMTP_HOST = defineString("SMTP_HOST", { default: "" });
const SMTP_PORT = defineInt("SMTP_PORT", { default: 465 });
const SMTP_USER = defineString("SMTP_USER", { default: "" });
const SMTP_PASS = defineSecret("SMTP_PASS");
const MAIL_FROM = defineString("MAIL_FROM", { default: "ARTICxAI <no-reply@articxai.com>" });

const mailReady = () => !!SMTP_HOST.value();
function transport() {
  const port = SMTP_PORT.value();
  return nodemailer.createTransport({
    host: SMTP_HOST.value(), port, secure: port === 465,
    auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
  });
}

module.exports = { SMTP_PASS, MAIL_FROM, mailReady, transport };
