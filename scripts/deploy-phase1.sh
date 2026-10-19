#!/bin/bash
# Phase 1 launch (articx.com + waitlist) on the PROD project. Chat stays off (functions/.env.articx-ai).
#   bash scripts/deploy-phase1.sh
# Firebase checks every secret in the functions folder on each deploy, even for functions that don't use them,
# (topics and starters are deployed too because Hosting rewrites point at them.)
# so any secret prod doesn't have yet gets a placeholder value ("not-configured") — real values come in phase 2.
set -e
cd "$(dirname "$0")/.."
firebase use prod
TMP=$(mktemp)
printf 'not-configured' > "$TMP"
for S in MODEL_API_URL MODEL_API_KEY SMTP_PASS STRIPE_SECRET_KEY TAVILY_API_KEY TRAINING_EXPORT_KEY; do
  if firebase functions:secrets:access "$S" >/dev/null 2>&1; then echo "secret $S: already set"
  else echo "secret $S: placeholder"; firebase functions:secrets:set "$S" --data-file "$TMP" --force >/dev/null; fi
done
rm -f "$TMP"
firebase deploy --only firestore:rules,firestore:indexes,functions:waitlist,functions:countWaitlist,functions:welcomeWaitlist,functions:waitlistUnsubscribe,functions:careers,functions:platform,functions:updates,functions:contact,functions:siteFeedback,functions:notifySiteFeedback,functions:notifyCareers,functions:notifyPlatform,functions:notifyContact,functions:notifyUpdates,functions:deleteCareerResume,functions:topics,functions:starters,hosting
echo
echo "Done. Test: https://articx.com/waitlist (sign up twice with the same email), and https://articx.com/chat should land on the waitlist."
firebase use dev >/dev/null && echo "(switched back to dev)"
