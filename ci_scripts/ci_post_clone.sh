#!/bin/sh
set -e

# Write env vars (set in Xcode Cloud workflow) to .env.local for Metro/Expo
cat > "$CI_PRIMARY_REPOSITORY_PATH/.env.local" <<EOF
EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_KEY=$EXPO_PUBLIC_SUPABASE_KEY
EOF

# Install dependencies
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci
