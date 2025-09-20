#!/usr/bin/env bash
set -euo pipefail

BUCKET="numerosnumerosnumeros.com"
DISTRIBUTION_ID="E1O53F8BONKSX9"
BUILD_DIR="./dist"

echo "▶️ Running build..."
npm run build

echo "▶️ Uploading no-cache assets..."
aws s3 sync "$BUILD_DIR" "s3://$BUCKET" \
  --exact-timestamps \
  --delete \
  --exclude "*" \
  --include "*.html" \
  --include "robots.txt" \
  --include "sitemap.xml" \
  --cache-control "no-cache, must-revalidate"

echo "▶️ Uploading long-lived cache assets..."
aws s3 sync "$BUILD_DIR" "s3://$BUCKET" \
  --exact-timestamps \
  --delete \
  --exclude "*.html" \
  --exclude "robots.txt" \
  --exclude "sitemap.xml" \
  --cache-control "public, max-age=31536000, immutable"

echo "▶️ Creating CloudFront invalidation..."
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"

echo "✅ Deployment complete!"
