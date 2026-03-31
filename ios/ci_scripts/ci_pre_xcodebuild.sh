#!/bin/sh
set -e

echo ">>> Cleaning stale bundle outputs to avoid EPERM on re-write"
BUNDLE_OUTPUT="$CI_DERIVED_DATA_PATH/Build/Intermediates.noindex/ArchiveIntermediates/EisenhowerMatrixProductivity/BuildProductsPath/Release-iphoneos/main.jsbundle"

if [ -f "$BUNDLE_OUTPUT" ]; then
  echo "Removing existing main.jsbundle"
  rm -f "$BUNDLE_OUTPUT"
fi

echo ">>> Ensuring DerivedData build products directory is writable"
BUILD_PRODUCTS_DIR="$CI_DERIVED_DATA_PATH/Build/Intermediates.noindex/ArchiveIntermediates/EisenhowerMatrixProductivity/BuildProductsPath/Release-iphoneos"
mkdir -p "$BUILD_PRODUCTS_DIR"
chmod -R u+w "$BUILD_PRODUCTS_DIR" 2>/dev/null || true
