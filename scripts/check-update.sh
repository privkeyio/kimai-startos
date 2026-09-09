#!/usr/bin/env bash
#
# Check whether a newer Kimai release is available, verify its Docker image is
# actually usable, and optionally apply the version bump.
#
#   ./scripts/check-update.sh            # report only
#   ./scripts/check-update.sh --apply    # also rewrite the two pinned files
#
# The checks here exist because each one has a real failure mode behind it; see
# UPDATING.md. In particular a release can exist with no published image, and
# the bare version tag must resolve to the *Apache* image, not PHP-FPM.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$REPO_ROOT/startos/manifest/index.ts"
VERSIONS="$REPO_ROOT/startos/versions/current.ts"

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

for tool in curl jq; do
  command -v "$tool" >/dev/null || { echo "error: $tool is required" >&2; exit 1; }
done

hub() { curl -fsS "https://hub.docker.com/v2/repositories/kimai/kimai2/tags/$1" 2>/dev/null; }

# --- current state -----------------------------------------------------------

current_tag=$(grep -oP "dockerTag: 'kimai/kimai2:\K[^']+" "$MANIFEST")
current_pkg=$(grep -oP "version: '\K[^']+" "$VERSIONS")
current_upstream="${current_pkg%%:*}"
current_rev="${current_pkg##*:}"

echo "Pinned image:   kimai/kimai2:$current_tag"
echo "Package version: $current_pkg"
echo

# --- newest upstream release -------------------------------------------------

# Read the tag list rather than the "Latest" release badge, which is unreliable
# in both directions. Stable releases only (no -beta / -rc suffixes).
latest=$(curl -fsS "https://api.github.com/repos/kimai/kimai/tags?per_page=50" \
  | jq -r '.[].name' \
  | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' \
  | sort -V | tail -1)

if [ -z "$latest" ]; then
  echo "error: could not read upstream tags" >&2
  exit 1
fi

echo "Newest upstream release: $latest"

if [ "$latest" = "$current_upstream" ]; then
  echo
  echo "Already on the newest release. Nothing to do."
  echo "(To reship the same upstream version, bump the revision:"
  echo " $current_upstream:$current_rev -> $current_upstream:$((current_rev + 1)).)"
  exit 0
fi

echo

# --- verify the image before trusting the release ----------------------------

echo "Verifying kimai/kimai2:$latest ..."

if ! tag_json=$(hub "$latest"); then
  echo "  FAIL: no image published for $latest yet."
  echo "  The release exists but the image does not. Wait, or pin the newest"
  echo "  release that does have one."
  exit 1
fi

arches=$(echo "$tag_json" | jq -r '[.images[].architecture] | unique | join(", ")')
echo "  architectures: $arches"

for required in amd64 arm64; do
  echo "$arches" | grep -q "$required" || {
    echo "  FAIL: image does not ship $required; StartOS needs amd64 and arm64."
    exit 1
  }
done

# The bare version tag must be the Apache build. `latest`/`fpm` are PHP-FPM,
# which has no web server and would need an nginx sidecar.
new_digest=$(echo "$tag_json" | jq -r .digest)
apache_digest=$(hub apache | jq -r .digest)

if [ "$new_digest" != "$apache_digest" ]; then
  echo "  FAIL: $latest does not match the 'apache' tag."
  echo "        $latest -> $new_digest"
  echo "        apache  -> $apache_digest"
  echo "  Upstream's tagging may have changed. Check which tag is the Apache"
  echo "  build before pinning (see UPDATING.md)."
  exit 1
fi
echo "  matches the 'apache' tag (correct variant)"
echo

# --- report / apply ----------------------------------------------------------

new_pkg="$latest:0"

if [ "$APPLY" -eq 0 ]; then
  cat <<EOF
Update available: $current_upstream -> $latest

To apply:
  ./scripts/check-update.sh --apply

That rewrites:
  startos/manifest/index.ts   dockerTag -> kimai/kimai2:$latest
  startos/versions/current.ts version   -> $new_pkg

Then, by hand:
  - Write releaseNotes in startos/versions/current.ts for every locale.
    Changelog: https://github.com/kimai/kimai/compare/$current_upstream...$latest
  - For a minor or major jump, read the changelog for behavior changes, and
    re-check the upstream details UPDATING.md lists (the PassEnv list, the
    entrypoint's DATABASE_URL parsing, the Apache port).

Then: make x86 && sideload the result.
EOF
  exit 0
fi

sed -i "s|dockerTag: 'kimai/kimai2:$current_tag'|dockerTag: 'kimai/kimai2:$latest'|" "$MANIFEST"
sed -i "s|version: '$current_pkg'|version: '$new_pkg'|" "$VERSIONS"

echo "Applied:"
echo "  startos/manifest/index.ts   -> kimai/kimai2:$latest"
echo "  startos/versions/current.ts -> $new_pkg"
echo
echo "STILL TO DO BY HAND:"
echo "  Update releaseNotes in startos/versions/current.ts (all five locales)."
echo "  Changelog: https://github.com/kimai/kimai/compare/$current_upstream...$latest"
echo
echo "Then: make x86"
