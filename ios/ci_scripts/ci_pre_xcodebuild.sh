#!/bin/sh
set -e

echo ">>> Cleaning stale bundle outputs to avoid EPERM on re-write"

# Xcode Cloud uses /Volumes/workspace/DerivedData; CI_DERIVED_DATA_PATH may also be set
DERIVED_DATA="${CI_DERIVED_DATA_PATH:-/Volumes/workspace/DerivedData}"
BUNDLE_OUTPUT="$DERIVED_DATA/Build/Intermediates.noindex/ArchiveIntermediates/EisenhowerMatrixProductivity/BuildProductsPath/Release-iphoneos/main.jsbundle"

if [ -f "$BUNDLE_OUTPUT" ]; then
  echo "Removing existing main.jsbundle"
  rm -f "$BUNDLE_OUTPUT"
fi

echo ">>> Ensuring DerivedData build products directory is writable"
BUILD_PRODUCTS_DIR="$DERIVED_DATA/Build/Intermediates.noindex/ArchiveIntermediates/EisenhowerMatrixProductivity/BuildProductsPath/Release-iphoneos"
if [ -d "$BUILD_PRODUCTS_DIR" ]; then
  chmod -R u+w "$BUILD_PRODUCTS_DIR" 2>/dev/null || true
fi
