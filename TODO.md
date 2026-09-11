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

- [x] The reactive rotation loop works. Running **Set Admin Password** wrote
      store.json, which fired `.const() triggered` -> `Restarting service...`,
      and the oneshot re-applied the new credential on the way back up. The
      whole path is automatic; the user does not restart anything by hand.
- [x] Imported data verified through the UI: timesheets, calendar, reporting,
      export, customers, projects, activities, teams and the doctor page all
      render without error, and a 2FA-enabled imported user logged in twice.

- [x] Signed in as `admin` with a rotated password. Both branches of the
      credential design are now exercised against a running service: first-set
      via `kimai:user:create` on a fresh install, and rotation via
      `kimai:user:password` on an account this package did not create.
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

## Admin password re-apply fixed (2026-09-11)

`apply-admin-credentials` ran `kimai:user:create admin ...`, falling back to
`kimai:user:password admin ...`, on **every** service start. That was correct for
a fresh install, but wrong whenever the database already contained an `admin`
user that this package did not create — after importing another instance's data,
or after a restore from a backup taken elsewhere. In those cases the package
silently reset that account's password on the next restart.

Surfaced 2026-09-09 while migrating live data from another Kimai instance whose
database contained its own `admin`.

Fixed by making the oneshot conditional rather than unconditional. It hashes
`user:email:password`, compares against `var/data/.startos-admin-applied` on the
`main` volume, and exits early when they match. Rotation still works, because a
new password is a new hash. The marker is backed up with the volume, so it stays
in agreement with the `store.json` that holds the password. A marker that cannot
be written logs a warning and succeeds anyway, degrading to the old
re-apply-every-start behaviour rather than failing a start.

- [x] Apply the password only when it has actually changed, rather than on every
      start.
- [x] The `[ERROR]` noise goes away with it: the failing `kimai:user:create` now
      runs only on a genuine rotation, not on every start.
- [x] Verified on the box against the live install, which carries an imported
      `admin` this package did not create (2026-09-11). Three starts of
      `2.66.0:2`, from the service log:

      | Start | Credentials | apply-admin-credentials |
      | --- | --- | --- |
      | 11:50, first after the upgrade | unchanged, no marker yet | applied once |
      | 11:52, plain restart | unchanged, marker matches | logged nothing |
      | 11:54, after Set Admin Password | changed | applied |

      The 11:52 start is the fix: the imported account was left alone, and the
      two `[ERROR]` lines are gone with it. The 11:54 start confirms rotation
      still works — `.const() triggered` -> `Restarting service...` ->
      `Changed password for user "admin"`. No marker-write warning appeared on
      any start, so `var/data` is writable by the oneshot as expected.
- [ ] Confirm by hand that the rotated password actually signs in, and that a
      further restart after the rotation is silent again.

## Restore bug found and fixed (2026-09-09)

Testing an actual uninstall-and-restore surfaced a defect that would have hit
every user of this package, in the worst possible way: the restore reported
success, the data was fully intact, and the service was nevertheless
permanently stuck, with the real error visible only by attaching to the
container.

`withMysqlDump`'s restore builds the datadir and loads the dump itself, so the
image entrypoint skips user setup and never creates `root@%`. The restored
datadir has only `root@localhost` (socket-only), while Kimai connects over TCP
to 127.0.0.1 — hence `ERROR 1130 (HY000): Host '127.0.0.1' is not allowed to
connect to this MySQL server`. The `mysql` readiness check was also TCP, so it
could never pass, and `kimai` never launched.

Fixed by moving the readiness check to the socket and adding the idempotent
`ensure-db-access` oneshot between the database and Kimai. See README —
"The restored datadir has a different account layout".

- [x] Re-ran the uninstall-and-restore test against 2.66.0:1 (2026-09-10). The
      service came up unattended with no manual intervention. The two runs
      distinguish themselves cleanly: updating over an existing install logged
      `[Warning] ... CREATE USER IF NOT EXISTS but they already exist:
      'root'@'%'` and did nothing, while the restore logged no warning at all —
      it created the account, because a restored datadir genuinely lacks it.
      `dbtest.php` then connected over TCP to 127.0.0.1 (the call that failed
      before the fix) and `kimai:install` reported `Already at the latest
      version`.

      Note for future testing: a restore reinstalls the package version stored
      in the backup, so testing a fix requires a backup taken *after* that fix
      is installed. Restoring an older backup replays the older code.
- [ ] Report the asymmetry to Start9. `withMysqlDump` restores a datadir whose
      account layout differs from what the official mysql image produces on a
      fresh init, which every package using it will hit. Worth a PR against
      start-technologies rather than each package working around it.

## Verify backup and restore

- [x] Backed up, uninstalled, and restored to a clean install (2026-09-10).
      All 108 timesheets came back from the MySQL dump, all four users with
      their password hashes and TOTP enrollments, and the schema restored at
      the current migration version. Verified over TCP, which is the path that
      matters — see the restore bug above.

## SMTP

- [ ] Run **Configure SMTP** against a real provider and confirm Kimai sends a
      test mail (`kimai:mail:test` inside the container). The `MAILER_URL` DSN
      is built from the SDK's SMTP shape and has not been exercised — in
      particular confirm `smtps://` vs `smtp://` maps correctly to your
      provider's implicit-TLS vs STARTTLS port.

## Before submitting to the community registry

- [x] `packageRepo` points at github.com/wksantiago/kimai-startos.
- [x] CI workflows target `master`, which is this repo's default branch.
- [ ] If this is ever transferred to Start9-Community, update `packageRepo`
      again — the manifest URL is not derived from the git remote.
- [ ] Have the translations in `startos/i18n/dictionaries/translations.ts`,
      `startos/manifest/i18n.ts`, and `startos/versions/current.ts` reviewed by
      a speaker of each language.
