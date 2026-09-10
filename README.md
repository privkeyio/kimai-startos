<p align="center">
  <img src="icon.png" alt="Kimai Logo" width="21%">
</p>

# Kimai on StartOS

> **Upstream docs:** <https://www.kimai.org/documentation/>
>
> Everything not listed in this document should behave the same as upstream
> Kimai. If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable.

[Kimai](https://github.com/kimai/kimai) is a self-hosted time-tracking application for freelancers, agencies, and companies. This package runs the official Apache image alongside a MySQL sidecar, provisions the initial super-admin, and wires Kimai's mailer into StartOS's SMTP settings.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions (StartOS UI)](#actions-startos-ui)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Contributing](#contributing)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

| | |
| --- | --- |
| Kimai image | Upstream `kimai/kimai2`, unmodified |
| MySQL image | Upstream `mysql`, unmodified |
| Architectures | `x86_64`, `aarch64` |
| Entrypoint | Both images use `sdk.useEntrypoint()` |

The Kimai image is published in two flavors under different tags. This package pins the **Apache** flavor, which bundles its own web server listening on port 8001. The `latest`/`fpm` tags are PHP-FPM only and would require an additional nginx sidecar; they are deliberately not used.

Kimai's entrypoint waits for the database, runs `kimai:install` (schema creation and migrations, idempotent), then execs Apache in the foreground. That behavior is unchanged — this package only supplies its environment.

## Volume and Data Layout

| Volume | Mount point | Contents |
| --- | --- | --- |
| `main` | `/opt/kimai/var` | Invoices, exports, invoice/export templates, plugins, the generated app secret, logs |
| `mysql` | `/var/lib/mysql` | MySQL data directory |
| `startos` | — | `store.json`: generated secrets and SMTP settings |

The upstream Docker Compose example mounts only `var/data` and `var/plugins`. This package mounts the whole `/opt/kimai/var` directory instead, which is what the image itself declares as a `VOLUME`. The narrower mount silently discards generated invoices, exports, and custom templates on restart.

Both subcontainers share a network namespace, so Kimai reaches MySQL over `127.0.0.1`.

## Installation and First-Run Flow

1. On install, the package generates a MySQL root password and Symfony `APP_SECRET` into `store.json`.
2. A **critical task** is raised pointing at the **Set Admin Password** action. Kimai ships with no accounts, so this must be run before anyone can sign in.
3. On first start, MySQL initializes its data directory and Kimai's entrypoint builds the schema. This is the slow part — several minutes is normal.
4. Once Kimai is healthy, an `apply-admin-credentials` oneshot runs `kimai:user:create`, falling back to `kimai:user:password`, to provision or update the `admin` super-admin.

Upstream's `ADMINPASS`/`ADMINMAIL` variables are deliberately **not** used. They only feed `kimai:user:create`, which fails once the account exists — enough to set a password, never to rotate one. The oneshot covers both cases with a single code path, and re-runs harmlessly on every start.

The admin account is created with the non-routable address `admin@kimai.local`. Kimai requires an email-shaped value; nothing is ever sent to it. Change it inside Kimai if you want password-reset emails to reach you.

## Configuration Management

| StartOS-Managed | Upstream-Managed |
| --- | --- |
| `DATABASE_URL`, `APP_SECRET`, `APP_ENV`, `TRUSTED_PROXIES`, `MAILER_URL`, `MAILER_FROM` | Everything inside Kimai's own admin UI: users, teams, customers, projects, activities, rates, invoice and export templates, plugins |

`TRUSTED_PROXIES` is set to the private address ranges. StartOS terminates TLS at the edge and forwards plain HTTP with `X-Forwarded-Proto: https`; Symfony ignores those headers unless the sender is a trusted proxy, and if it ignores them Kimai emits absolute `http://` URLs that the browser blocks as mixed content.

`TRUSTED_HOSTS` is intentionally left unset (Symfony's default: allow any host). StartOS serves each service on several addresses at once — `.local`, LAN IP, and any address the user adds — and pinning a single hostname would break every other one.

## Network Access and Interfaces

| Interface | Internal port | Protocol | Purpose |
| --- | --- | --- | --- |
| Web Interface (`ui`) | 8001 | HTTP | Kimai's web UI and its REST API (under `/api`) |

The interface is bound with `protocol: 'http'`, so StartOS adds `X-Forwarded-*` headers and terminates TLS itself. Which addresses it is reachable on is the user's choice, made from the service's Interfaces tab.

## Actions (StartOS UI)

### Set Admin Password (`set-admin-password`)

- **Purpose**: Generates a random 22-character password for the `admin` account, stores it, and returns it once. Covers both the initial credential and later rotation.
- **Visibility**: Enabled
- **Availability**: Any status
- **Inputs**: None
- **Outputs**: Username and password (password masked and copyable)

Writing the password to `store.json` re-runs `setupMain`, which restarts the daemons and re-runs the oneshot that pushes the new password into Kimai.

### Configure SMTP (`configure-smtp`)

- **Purpose**: Sets Kimai's mailer. Supports disabled, StartOS system SMTP, and custom providers.
- **Visibility**: Enabled
- **Availability**: Any status
- **Inputs**: The SDK's standard SMTP input spec
- **Outputs**: None

The stored selection is rendered into a Symfony Mailer DSN for `MAILER_URL` — `smtps://` for implicit TLS, `smtp://` for STARTTLS, `null://null` when disabled. Credentials are percent-encoded.

## Backups and Restore

The database is backed up as a **logical dump** (`sdk.Backups.withMysqlDump`), not as a copy of the MySQL data directory — a raw datadir is only restorable by the exact server version that wrote it, while a dump survives an upstream MySQL bump.

Also included:

- `main` — invoices, exports, custom templates, plugins
- `startos` — `store.json`, which holds the database password the restore needs to load the dump back in

The `mysql` volume itself is not copied; it is rebuilt from the dump on restore.

### The restored datadir has a different account layout

A restore does not produce the same MySQL state as a fresh install, and the difference is load-bearing.

On a fresh install the image's entrypoint initializes the datadir and creates **`root@%`**, honouring `MYSQL_ROOT_HOST` (default `%`). On a restore, `sdk.Backups.withMysqlDump` builds the datadir itself and loads the dump into it, so the entrypoint finds a populated datadir and skips user setup entirely. The only account that exists is **`root@localhost`**, which is reachable over the unix socket but *not* over TCP.

Kimai connects over TCP to `127.0.0.1`. Left alone, a restore therefore comes up with the data fully intact and the service permanently stuck, failing with `ERROR 1130 (HY000): Host '127.0.0.1' is not allowed to connect to this MySQL server` — visible only by attaching to the container.

Two things in `main.ts` handle this:

1. The `mysql` daemon's readiness check connects over the **socket**. A TCP check could never pass on a restored datadir, and since `kimai` is gated on that check, the whole service would hang.
2. The **`ensure-db-access`** oneshot runs after the database is ready and before Kimai starts, creating `root@%` if it is missing. It is a no-op on a fresh install and a repair on a restored one, and the `kimai` daemon lists it in `requires`.

This was found by testing an actual restore, and the fix was verified by a second one; neither is theoretical. The underlying asymmetry arguably belongs in the SDK, but the package cannot depend on that.

> [!IMPORTANT]
> A restore reinstalls the package version recorded in the backup, not the version currently installed. Testing any packaging fix through a restore therefore requires a backup taken *after* that fix is installed — restoring an older backup replays the older code and reproduces the old behaviour.

## Health Checks

| Check | Displayed as | Behavior |
| --- | --- | --- |
| `mysql` daemon | Database | Runs `SELECT 1` over the **unix socket**, not TCP — see [Backups and Restore](#backups-and-restore) for why. Reports `loading` while initializing, distinguishing a brand-new datadir from a restart. |
| `kimai` daemon | Web Interface | `checkPortListening` on the UI port, with a 5-minute grace period. Apache only binds after migrations finish, so a shorter grace period would flash red during legitimate work. |
| `email` | Email | Reports `disabled` with a pointer to the Configure SMTP action when no mailer is set, `success` otherwise. |

## Dependencies

None.

## Limitations and Differences

1. **`DEFAULT_URI` cannot be set.** The image's Apache vhost passes a fixed list of environment variables through to PHP (`.docker/000-default.conf`), and `DEFAULT_URI` is not on it. It only affects absolute URLs built outside a web request (some CLI-generated links); URLs generated while serving a request use the real request context and are correct.
2. **`TRUSTED_HOSTS` is not set**, by design — see [Configuration Management](#configuration-management). Host-header validation is therefore not enforced at the application layer.
3. **The database password must stay alphanumeric.** Kimai's entrypoint recovers connection details from `DATABASE_URL` with `awk -F '[/:@]'`, so a password containing `/`, `:`, `@`, or `?` breaks the database wait loop rather than failing loudly. Generation is constrained accordingly.
4. **The admin account uses a placeholder email address** (`admin@kimai.local`) that cannot receive mail.
5. **The database password appears in the service logs.** The image's entrypoint runs under `bash -x`, so every command it executes is traced — including the `awk` calls that parse `DATABASE_URL`. Upstream suppresses tracing around `APP_SECRET` but not around the database credentials. The account is loopback-bound and internal to the service, so the exposure is to anyone who can already read the service's logs, but be aware of it before sharing a log dump.
6. **LDAP and SAML are not configured** by this package, though the image ships support for them.

## What Is Unchanged from Upstream

Time tracking, timesheets and quick-entry, customers/projects/activities, teams and permissions, hourly and fixed rates, budgets, invoicing and invoice templates, exports (CSV, XLSX, PDF, DOCX), reporting, the REST API, two-factor authentication, plugins, and Kimai's own localization all behave exactly as the upstream documentation describes.

## Contributing

See [AGENTS.md](AGENTS.md).

---

## Quick Reference for AI Consumers

```yaml
package_id: kimai
architectures: [x86_64, aarch64]
volumes:
  main: /opt/kimai/var
  mysql: /var/lib/mysql
  startos: store.json
ports:
  ui: 8001
dependencies: none
startos_managed_env_vars:
  - APP_ENV
  - APP_SECRET
  - DATABASE_URL
  - TRUSTED_PROXIES
  - MAILER_URL
  - MAILER_FROM
actions:
  - set-admin-password
  - configure-smtp
```
