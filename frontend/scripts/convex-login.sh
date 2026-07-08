#!/bin/bash
# Run in your Mac Terminal to connect this app to Convex cloud.
set -e
cd "$(dirname "$0")/.."

echo "Opening Convex login in your browser..."
open "https://dashboard.convex.dev/auth" 2>/dev/null || true

echo ""
echo "1) Log in in the browser, then complete login here:"
npx convex login

echo ""
echo "2) Link to existing project (choose silent-ibis-390):"
npx convex dev --configure existing

echo ""
echo "3) Set R2 credentials on cloud deployment:"
npx convex env set R2_ACCOUNT_ID 189e3e8d6addc8e9f82fb255d831fddb
npx convex env set R2_ACCESS_KEY_ID 0f33afd66f4ec76799c54ceb5c907ed0
npx convex env set R2_SECRET_ACCESS_KEY "$(grep R2_SECRET_ACCESS_KEY .env.local | cut -d= -f2-)"
npx convex env set R2_BUCKET klbmedia
npx convex env set R2_ENDPOINT https://189e3e8d6addc8e9f82fb255d831fddb.r2.cloudflarestorage.com
npx convex env set R2_PUBLIC_BASE_URL https://klbmedia.189e3e8d6addc8e9f82fb255d831fddb.r2.cloudflarestorage.com
npx convex env set TRANSCODING_ENABLED false
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://placeholder.clerk.accounts.dev

echo ""
echo "4) Start dev (uses cloud Convex):"
echo "   npx convex dev"
echo ""
echo "Dashboard: https://dashboard.convex.dev/d/silent-ibis-390"
echo "HTTP API:  https://silent-ibis-390.convex.site"
