# TODO — Kimai on StartOS

The package is written and builds. What remains is verification against a real
install, which is the only thing that proves any of it works.

## Verify on a StartOS box

Verified on the first install (2026-09-09), from the service log:

- [x] Sideloaded and started. MySQL initialized its datadir and created the
      `kimai` database; Kimai's entrypoint ran 79 migrations in ~51s, warmed the
      cache, and Apache came up.
- [x] `DATABASE_URL` parsed correctly by the entrypoint's `awk` (user, host,
      port, and database all recovered) — the alphanumeric password constraint
      holds.
- [x] `APP_SECRET` from `store.json` was accepted (`ensureAppSecret` took the
      user-supplied branch and returned immediately, rather than generating one).
- [x] The image's own `ADMINPASS` path stayed inert, as intended.
- [x] `apply-admin-credentials` ran after the daemon went healthy and reported
      `Success! Created user: admin`.

- [x] Signed in through the browser with the credentials from **Set Admin
      Password**. Kimai's post-login redirect came back as `https://`, so
      `TRUSTED_PROXIES` is correctly trusting the StartOS proxy — no mixed
      content, no redirect loop.

- [x] The `kimai:user:password` fallback branch ran (2026-09-09, during the data
      import): `create` failed on the pre-existing `admin`, and the fallback
      reported `Changed password for user "admin"`.
- [x] Importing another instance's database works. A 2.65 dump loaded into this
      package upgraded cleanly on the next start — `kimai:install` applied the
      single pending migration. Imported users kept their password hashes and
      their TOTP enrollments: a 2FA login succeeded afterwards, confirming
      `totp_secret` is not derived from `APP_SECRET` and survives a move between
      instances. Timesheets, customers, and projects all verified present.

Still to confirm:

- [ ] Sign in with a rotated password (the apply succeeded; the resulting
      credential has not been used to log in yet).
      Only the `kimai:user:create` branch has executed so far; the
      `kimai:user:password` fallback runs only once the account already exists,
      so it remains untested.
- [ ] Confirm no mixed-content or redirect-loop errors in the browser console,
      which is what a wrong `TRUSTED_PROXIES` would look like. Check that
      Kimai's own links come back as `https://`.
- [ ] Record a timesheet entry, restart the service, confirm it survived.
- [ ] Generate an invoice, then restart and confirm it is still listed — this is
      what the full `/opt/kimai/var` mount is for, and the narrower upstream
      mount would fail it.

## Design flaw: the oneshot rewrites an existing admin password on every start

`apply-admin-credentials` runs `kimai:user:create admin ...`, falling back to
`kimai:user:password admin ...`, on **every** service start. That is correct for
a fresh install, but wrong whenever the database already contains an `admin`
user that this package did not create — after importing another instance's data,
or after a restore from a backup taken elsewhere. In those cases the package
silently resets that account's password on the next restart.

Surfaced 2026-09-09 while migrating live data from another Kimai instance whose
database contained its own `admin`.

The fix is not simply "create only if missing": that would break the rotation
path, since `kimai:user:password` is what makes re-running **Set Admin Password**
work. It also can't move wholesale into the action, because the action is
reachable from a critical task on a fresh install, and a critical task suppresses
the Start control — an action gated on `only-running` would deadlock.

A cosmetic consequence of the same design: on every start where `admin` already
exists, the logs show two `[ERROR]` lines from the failed `kimai:user:create`
before the successful fallback. Nothing is wrong, but it reads like a failure.
Fixing the re-apply below removes the noise too.

- [ ] Apply the password only when it has actually changed, rather than on every
      start. The obstacle is that the oneshot runs inside a container and cannot
      write back to `store.json`, so the "last applied" marker needs somewhere
      else to live — a file on the `main` volume that both the oneshot and
      `setupMain` can see is the most likely shape.

## Verify backup and restore

- [ ] Take a backup, then restore to a clean install. Confirm timesheets (from
      the MySQL dump), invoices (from `main`), and the admin password (from
      `startos`/`store.json`) all come back.

## SMTP

- [ ] Run **Configure SMTP** against a real provider and confirm Kimai sends a
      test mail (`kimai:mail:test` inside the container). The `MAILER_URL` DSN
      is built from the SDK's SMTP shape and has not been exercised — in
      particular confirm `smtps://` vs `smtp://` maps correctly to your
      provider's implicit-TLS vs STARTTLS port.

## Before submitting to the community registry

- [ ] Set `packageRepo` in `startos/manifest/index.ts` to the repository this
      actually lives in (currently points at `Start9-Community/kimai-startos`).
- [ ] Confirm the CI workflows in `.github/workflows/` target the branch this
      repo actually uses.
- [ ] Have the translations in `startos/i18n/dictionaries/translations.ts`,
      `startos/manifest/i18n.ts`, and `startos/versions/current.ts` reviewed by
      a speaker of each language.
