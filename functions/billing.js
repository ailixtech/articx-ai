/**
 * Billing through Stripe. Card details go straight from the browser to Stripe (Payment Element);
 * ARTICxAI only keeps the Stripe customer id, in billing/{uid} (server only, see firestore.rules).
 *
 * billingSummary()                      -> { ready, publishableKey, methods, invoices }
 * billingSetupIntent()                  -> { clientSecret, publishableKey }   (to save a new payment method)
 * billingSetDefault({ paymentMethodId }) -> {}                                 (used for future payments)
 * billingRemoveMethod({ paymentMethodId }) -> {}
 *
 * Setup:
 *   firebase functions:secrets:set STRIPE_SECRET_KEY        (sk_test_... on dev, sk_live_... on prod)
 *   STRIPE_PUBLISHABLE_KEY=pk_test_...                      in functions/.env.<project>
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const Stripe = require("stripe");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_PUBLISHABLE_KEY = defineString("STRIPE_PUBLISHABLE_KEY", { default: "" });

const OPTS = { region: "northamerica-northeast2", maxInstances: 10, invoker: "public", secrets: [STRIPE_SECRET_KEY] };
const PM_ID = /^pm_[A-Za-z0-9]{6,64}$/;

// Payments stay "not ready" until both Stripe keys are set for this project.
function ready() {
  return /^(sk|rk)_(test|live)_/.test(STRIPE_SECRET_KEY.value() || "") && /^pk_(test|live)_/.test(STRIPE_PUBLISHABLE_KEY.value());
}
function stripe() {
  if (!ready()) throw new HttpsError("failed-precondition", "Payments aren't set up yet.", { reason: "payments_not_ready" });
  return new Stripe(STRIPE_SECRET_KEY.value());
}
function account(req) {
  const uid = req.auth?.uid;
  if (!uid || req.auth.token.otp !== true) throw new HttpsError("unauthenticated", "Sign in first.");
  return { uid, email: req.auth.token.email || undefined };
}

// The account's Stripe customer id; created on first use when create is true.
async function customerId(s, { uid, email }, create) {
  const ref = getFirestore().doc(`billing/${uid}`);
  const snap = await ref.get();
  if (snap.get("customerId")) return snap.get("customerId");
  if (!create) return null;
  // The idempotency key stops two quick requests from creating two customers.
  const customer = await s.customers.create({ email, metadata: { uid } }, { idempotencyKey: `customer-${uid}` });
  await ref.set({ customerId: customer.id, createdAt: FieldValue.serverTimestamp() }, { merge: true });
  return customer.id;
}

// A saved payment method that belongs to this account's customer, or an error.
async function ownMethod(s, who, id) {
  if (!PM_ID.test(String(id || ""))) throw new HttpsError("invalid-argument", "Unknown payment method.");
  const customer = await customerId(s, who, false);
  const pm = customer && await s.paymentMethods.retrieve(id);
  if (!pm || pm.customer !== customer) throw new HttpsError("not-found", "Unknown payment method.");
  return { customer, pm };
}

function methodView(pm, defaultId) {
  const c = pm.card;
  return {
    id: pm.id,
    type: pm.type,
    brand: c ? c.brand : pm.type,
    last4: c ? c.last4 : (pm[pm.type] && pm[pm.type].last4) || "",
    expMonth: c ? c.exp_month : null,
    expYear: c ? c.exp_year : null,
    wallet: (c && c.wallet && c.wallet.type) || null,
    isDefault: pm.id === defaultId,
  };
}

function invoiceView(inv) {
  return {
    id: inv.id,
    number: inv.number || "",
    created: inv.created * 1000,
    total: inv.total,
    currency: inv.currency,
    status: inv.status,
    description: (inv.lines && inv.lines.data[0] && inv.lines.data[0].description) || "",
    url: inv.hosted_invoice_url || null,
    pdf: inv.invoice_pdf || null,
  };
}

exports.billingSummary = onCall(OPTS, async (req) => {
  const who = account(req);
  if (!ready()) return { ready: false, methods: [], invoices: [] };
  const s = stripe();
  const customer = await customerId(s, who, false);
  const base = { ready: true, publishableKey: STRIPE_PUBLISHABLE_KEY.value() };
  if (!customer) return { ...base, methods: [], invoices: [] };
  try {
    const [cust, pms, invs] = await Promise.all([
      s.customers.retrieve(customer),
      s.customers.listPaymentMethods(customer, { limit: 20 }),
      s.invoices.list({ customer, limit: 24 }),
    ]);
    const def = cust.invoice_settings && cust.invoice_settings.default_payment_method;
    const defaultId = typeof def === "string" ? def : def && def.id;
    return {
      ...base,
      methods: pms.data.map((pm) => methodView(pm, defaultId)),
      invoices: invs.data.filter((i) => i.status !== "draft").map(invoiceView),
    };
  } catch (e) {
    logger.error("billingSummary failed", e);
    throw new HttpsError("internal", "Billing details couldn't be loaded.");
  }
});

exports.billingSetupIntent = onCall(OPTS, async (req) => {
  const who = account(req);
  const s = stripe();
  const customer = await customerId(s, who, true);
  // No redirect-based methods, so saving always finishes inside the Settings window.
  const intent = await s.setupIntents.create({
    customer,
    usage: "off_session",
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    metadata: { uid: who.uid },
  });
  return { clientSecret: intent.client_secret, publishableKey: STRIPE_PUBLISHABLE_KEY.value() };
});

exports.billingSetDefault = onCall(OPTS, async (req) => {
  const who = account(req);
  const s = stripe();
  const { customer, pm } = await ownMethod(s, who, req.data && req.data.paymentMethodId);
  await s.customers.update(customer, { invoice_settings: { default_payment_method: pm.id } });
  return {};
});

exports.billingRemoveMethod = onCall(OPTS, async (req) => {
  const who = account(req);
  const s = stripe();
  const { pm } = await ownMethod(s, who, req.data && req.data.paymentMethodId);
  await s.paymentMethods.detach(pm.id);
  return {};
});
