#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: ./bump-version.sh <version>"
  echo "Example: ./bump-version.sh 1.2.0"
  exit 1
fi

VERSION="$1"

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be semver (e.g. 1.2.0)"
  exit 1
fi

OLD_VERSION=$(grep -m1 '"version"' package.json | sed 's/.*"\([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)".*/\1/')

step() {
  echo ""
  echo "[$1/6] $2"
}

echo "==========================================="
echo "  Archivio version bump: $OLD_VERSION -> v$VERSION"
echo "==========================================="

step 1 "Updating package.json"
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json
echo "  done"

step 2 "Updating frontend/package.json"
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" frontend/package.json
echo "  done"

step 3 "Updating src-tauri/Cargo.toml"
sed -i '' "s/^version = \"[^\"]*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml
echo "  done"

step 4 "Updating src-tauri/tauri.conf.json"
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json
echo "  done"

step 5 "Updating docs/index.html"
sed -i '' "s/v[0-9]*\.[0-9]*\.[0-9]*/v$VERSION/" docs/index.html
sed -i '' "s/Archivio_[0-9]*\.[0-9]*\.[0-9]*/Archivio_$VERSION/g" docs/index.html
echo "  done"

step 6 "Regenerating lock files"
npm install --prefix frontend >/dev/null 2>&1 && echo "  frontend lock: done"
npm install >/dev/null 2>&1 && echo "  root lock: done"

echo ""
echo "==========================================="
echo "  Summary"
echo "==========================================="
git --no-pager diff --stat
echo ""
read -p "Commit and tag as v$VERSION? [y/N] " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
  git add -A
  git commit -m "v$VERSION"
  git tag "v$VERSION"
  echo ""
  echo "Tag v$VERSION created."
  echo "Run: git push && git push --tags"
else
  echo "Aborted. Changes are staged but not committed."
fi
