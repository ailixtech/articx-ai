#!/bin/bash
# Builds the company site for articx.com (hosted at WHC) as one zip to upload.
#   bash scripts/build-whc.sh   →  build/articx-com-<date>.zip
# Upload: WHC cPanel > File Manager > public_html > Upload the zip > Extract (overwrite) > delete the zip.
# The waitlist form and counter call prod Firebase (https://articx-ai.web.app/api/...), so prod must be
# deployed first (bash scripts/deploy-phase1.sh). Chat links on articx.com go to the waitlist.
set -e
cd "$(dirname "$0")/.."
npm --prefix web run build
OUT=build/whc/public_html
rm -rf build/whc && mkdir -p "$OUT"
cp -R web/dist/. "$OUT/"
cp scripts/whc.htaccess "$OUT/.htaccess"
[ -d "$OUT/assets" ] && cp scripts/whc-assets.htaccess "$OUT/assets/.htaccess"
ZIP="build/articx-com-$(date +%Y-%m-%d-%H%M).zip"
(cd "$OUT" && zip -qr "../../../$ZIP" . -x ".DS_Store")
echo "Ready: $ZIP  ($(du -h "$ZIP" | cut -f1))"
echo "Upload it to WHC cPanel > File Manager > public_html, then Extract."
