#!/bin/sh
set -e

echo ">>> Installing Node.js via nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 22
nvm use 22

echo ">>> Installing cmake (required by Hermes)"
brew install cmake

echo ">>> Installing npm dependencies"
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

echo ">>> Installing CocoaPods"
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install
