#!/usr/bin/env bash
#
# Deploy Pace to production (www.labrarf.com/pace-calculator) and verify the exact
# committed build is live.
#
# Pace is served same-origin out of the portfolio repo rather than through a
# cross-origin iframe. Everything the app knows lives in localStorage, and
# browsers partition or block storage for third-party frames, so a log written
# on labrarf.com had to be the same log the app reads back.
#
# Flow:
#   1. Refuse to deploy a dirty tree, so prod carries a real commit SHA.
#   2. Build (stamps HEAD's SHA into dist/version.json).
#   3. rsync dist/ into the portfolio repo, then commit + push it (GitHub Pages).
#   4. Poll /pace-calculator/version.json until prod reports HEAD, or time out.
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORTFOLIO_DIR="$(cd "$APP_DIR/../../Portfolio-Website" && pwd)"
SITE_URL="https://www.labrarf.com/pace-calculator"

cd "$APP_DIR"

if [ -n "$(git status --porcelain)" ]; then
  echo "✗ Working tree is dirty. Commit first so prod carries a clean commit SHA."
  git status --short
  exit 1
fi

EXPECTED="$(git rev-parse --short HEAD)"
echo "→ Deploying commit $EXPECTED"

npm run build

rsync -a --delete dist/ "$PORTFOLIO_DIR/pace-calculator/"

cd "$PORTFOLIO_DIR"
if [ -n "$(git status --porcelain pace-calculator/)" ]; then
  git add pace-calculator/
  git commit -m "Deploy Pace $EXPECTED"
  git push
else
  echo "→ Portfolio already in sync (nothing to commit)"
fi

echo "→ Waiting for $SITE_URL to report $EXPECTED ..."
for i in $(seq 1 30); do
  # version.json is pretty-printed, so the pattern has to tolerate the space
  # after the colon. Matching '"commit":"' exactly never hits and the poll
  # silently times out on a deploy that actually succeeded.
  LIVE="$(curl -fsS "$SITE_URL/version.json?cb=$(date +%s%N)" 2>/dev/null \
    | grep -o '"commit"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4 || true)"
  if [ "$LIVE" = "$EXPECTED" ]; then
    echo "✓ $EXPECTED is live at $SITE_URL"
    exit 0
  fi
  echo "  attempt $i/30: prod serving '${LIVE:-?}' — retrying in 10s"
  sleep 10
done

echo "✗ Timed out: prod never reported $EXPECTED (GitHub Pages may still be building, re-run to re-check)."
exit 1
