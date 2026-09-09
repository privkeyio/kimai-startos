# Updating Kimai

## The short version

```sh
./scripts/check-update.sh           # is there a new release, and is its image usable?
./scripts/check-update.sh --apply   # rewrite the two pinned files
# then: write releaseNotes by hand, and `make x86`
```

The script automates the mechanical parts of everything below: it reads the tag
list (not the unreliable "Latest" badge), skips prereleases, confirms the image
was actually published, confirms it ships both architectures, and confirms the
bare version tag still resolves to the Apache build. It refuses to apply a bump
if any of those fail.

It deliberately does **not** write release notes — those need a human reading
the changelog. The rest of this file is the manual procedure and the reasoning
behind each check; read it when the script reports a failure, or before a minor
or major jump.

## Where the version lives

Two places, and they must move together:

| File | Field |
| --- | --- |
| `startos/manifest/index.ts` | `images.kimai.source.dockerTag` |
| `startos/versions/current.ts` | `version` (`<upstream>:<package revision>`) and `releaseNotes` |

The package version is `<upstream version>:<revision>`. Bumping Kimai resets the revision to `0`; a packaging-only change keeps the upstream version and increments the revision.

## Finding the newest release

Read the tag list, not the GitHub "Latest" badge — it is unreliable in both directions.

```sh
# Upstream releases
gh api repos/kimai/kimai/tags --jq '.[].name' | head

# Confirm the image tag actually exists and is multi-arch before pinning it
curl -s https://hub.docker.com/v2/repositories/kimai/kimai2/tags/<version> \
  | jq '{name, arch: [.images[].architecture]}'
```

A release existing does not mean the image was published. Verify the exact tag resolves and ships both `amd64` and `arm64`; if the newest release has no usable image, target the newest one that does and say so in the pull request.

## Which tag to pin

Pin the bare version tag (e.g. `kimai/kimai2:2.66.0`). That tag is the **Apache** flavor — it shares a digest with `apache`, `stable`, and `2`. Do not pin `latest` or `fpm`: those are the PHP-FPM build, which ships no web server and would need an nginx sidecar.

Confirm the flavor after a bump, since upstream's tagging has changed before:

```sh
for t in <version> apache latest fpm; do
  printf '%-10s ' "$t"
  curl -s https://hub.docker.com/v2/repositories/kimai/kimai2/tags/$t | jq -r .digest
done
```

The new version's digest must match `apache`, not `latest`.

## Bumping MySQL

`DB_SERVER_VERSION` in `startos/utils.ts` must match the tag of the `mysql` image in the manifest. Doctrine uses it to select the SQL platform, so a mismatch produces subtly wrong DDL rather than an error. Change both in the same commit.

Backups take a logical dump rather than copying the data directory, so a MySQL major bump does not strip users of their backups.

## Scrutiny by size of jump

| Jump | What it needs |
| --- | --- |
| Patch | Bump, verify the build, move on. |
| Minor | Read the full changelog for deprecations and behavior changes. |
| Major | Read the changelog, release notes, and the [upgrade guide](https://www.kimai.org/documentation/updates.html). Check whether a package data migration is needed. |

Kimai runs its own schema migrations from `kimai:install` inside the image's entrypoint on every start, so ordinary upstream upgrades need no migration in `startos/versions/`. A package migration is only needed when *this package's* stored state changes shape — for example a new field in `store.json` that existing installs must be given.

## Things to re-check after a bump

- `.docker/000-default.conf` in the upstream repo still `PassEnv`s `TRUSTED_PROXIES`, `DATABASE_URL`, `APP_SECRET`, `MAILER_URL`, and `MAILER_FROM`. If that list changes, the environment this package sets may stop reaching PHP.
- `.docker/entrypoint.sh` still parses `DATABASE_URL` with `awk -F '[/:@]'` (which is why the generated password is alphanumeric) and still honors a user-supplied `APP_SECRET`.
- Apache still listens on 8001 (`uiPort` in `startos/utils.ts`).
- `kimai:user:create` and `kimai:user:password` still take the argument order the `apply-admin-credentials` oneshot uses.

## Verify

`tsc` passing is not evidence the service works. Install the built package, confirm both health checks go green, sign in with the admin credentials, record a timesheet entry, and restart to confirm it persisted.
