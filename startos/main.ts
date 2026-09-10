import { smtpShape, T, z } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  ADMIN_EMAIL,
  ADMIN_USERNAME,
  DB_NAME,
  DB_SERVER_VERSION,
  DB_USER,
  KIMAI_APP_DIR,
  KIMAI_VAR_DIR,
  MYSQL_DATADIR,
  MYSQL_SOCKET,
  TRUSTED_PROXIES,
  uiPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  /**
   * ======================== Setup ========================
   */
  console.info(i18n('Starting Kimai!'))

  // Reactive: rewriting any of these (the set-admin-password or configure-smtp
  // actions) re-runs setupMain, which restarts the daemons and re-runs the
  // credential oneshot with the new values.
  const store = await storeJson.read().const(effects)
  if (!store) throw new Error('store.json not found')
  const { dbPassword, appSecret, adminPassword, smtp } = store

  const smtpCredentials = await resolveSmtp(effects, smtp)

  /**
   * Kimai's entrypoint parses DATABASE_URL with `awk -F '[/:@]'`, so a password
   * containing `/`, `:`, `@` or `?` would be split apart and the container
   * would never reach the database. `dbPassword` is generated alphanumeric to
   * keep that safe (see init/seedFiles.ts).
   */
  const databaseUrl =
    `mysql://${DB_USER}:${dbPassword}@127.0.0.1:3306/${DB_NAME}` +
    `?charset=utf8mb4&serverVersion=${DB_SERVER_VERSION}`

  const kimaiEnv = {
    APP_ENV: 'prod',
    DATABASE_URL: databaseUrl,
    APP_SECRET: appSecret,
    TRUSTED_PROXIES,
    MAILER_URL: buildMailerDsn(smtpCredentials),
    // Only a placeholder until SMTP is configured; Kimai still requires the
    // value to parse as an address, and a single-label domain ('@localhost')
    // is rejected by some validators.
    MAILER_FROM: smtpCredentials?.from ?? 'kimai@kimai.local',
  }

  const mysqlSub = sdk.SubContainer.of(
    effects,
    { imageId: 'mysql' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'mysql',
      subpath: null,
      mountpoint: MYSQL_DATADIR,
      readonly: false,
    }),
    'mysql-sub',
  )

  // The kimai subcontainer is shared by the daemon and the credential oneshot,
  // so it is extracted rather than inlined.
  const kimaiSub = sdk.SubContainer.of(
    effects,
    { imageId: 'kimai' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: KIMAI_VAR_DIR,
      readonly: false,
    }),
    'kimai-sub',
  )

  // Distinguishes "initializing a brand new datadir" from "recovering an
  // existing one" in the health message, since the first is much slower.
  const { exitCode: dataDirCheck } = await mysqlSub.exec([
    'test',
    '-f',
    `${MYSQL_DATADIR}/ibdata1`,
  ])
  const freshInstall = dataDirCheck !== 0

  /**
   * ======================== Daemons ========================
   */
  return (
    sdk.Daemons.of(effects)
      .addDaemon('mysql', {
        subcontainer: mysqlSub,
        exec: {
          // Bind to loopback only: the database is reachable from Kimai (which
          // shares this network namespace) and from nowhere else.
          command: sdk.useEntrypoint(['--bind-address=127.0.0.1']),
          env: {
            MYSQL_ROOT_PASSWORD: dbPassword,
            MYSQL_DATABASE: DB_NAME,
          },
        },
        ready: {
          display: i18n('Database'),
          fn: async () => {
            // Deliberately over the socket rather than TCP. On a datadir that
            // came from a restore, `root@localhost` is the only account that
            // exists, and it is reachable over the socket alone — a TCP check
            // here would never pass, and would strand the whole service.
            const { exitCode } = await mysqlSub.exec([
              'mysql',
              `--socket=${MYSQL_SOCKET}`,
              '-u',
              DB_USER,
              `-p${dbPassword}`,
              '-e',
              'SELECT 1',
            ])
            return exitCode === 0
              ? { result: 'success', message: i18n('The database is ready') }
              : {
                  result: 'loading',
                  message: freshInstall
                    ? i18n(
                        'Initializing a new database. This can take a while...',
                      )
                    : i18n('Starting the database...'),
                }
          },
        },
        requires: [],
      })
      /**
       * Guarantees an account Kimai can actually reach the database with.
       *
       * A fresh install gets `root@%` from the image's entrypoint, which
       * honours MYSQL_ROOT_HOST (default `%`) when it initialises the datadir.
       * A **restored** install never goes through that path: the SDK's
       * `withMysqlDump` builds the datadir itself and loads the dump into it,
       * so the entrypoint finds a populated datadir and skips user setup
       * entirely. The result is a datadir whose only account is
       * `root@localhost` — socket-only — while Kimai connects over TCP to
       * 127.0.0.1. Restores therefore came up with the data fully intact and
       * the service permanently stuck on `ERROR 1130 (HY000): Host
       * '127.0.0.1' is not allowed to connect to this MySQL server`.
       *
       * Idempotent: a no-op on a fresh install, a repair on a restored one.
       */
      .addOneshot('ensure-db-access', {
        subcontainer: mysqlSub,
        exec: {
          command: [
            'sh',
            '-c',
            // Password reaches mysql through MYSQL_PWD and the SQL through an
            // environment variable, so it never appears in the command line.
            'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; ' +
              `mysql --socket=${MYSQL_SOCKET} -u ${DB_USER} -e ` +
              '"CREATE USER IF NOT EXISTS \\"root\\"@\\"%\\" IDENTIFIED BY \\"$MYSQL_ROOT_PASSWORD\\"; ' +
              'GRANT ALL PRIVILEGES ON *.* TO \\"root\\"@\\"%\\" WITH GRANT OPTION; ' +
              'FLUSH PRIVILEGES;"',
          ],
          env: { MYSQL_ROOT_PASSWORD: dbPassword },
        },
        requires: ['mysql'],
      })
      .addDaemon('kimai', {
        subcontainer: kimaiSub,
        // The image's CMD is its entrypoint script: it waits for the database,
        // runs `kimai:install` (schema create + migrations, idempotent), then
        // execs Apache in the foreground.
        exec: { command: sdk.useEntrypoint(), env: kimaiEnv },
        ready: {
          display: i18n('Web Interface'),
          // Apache only binds the port after migrations finish, so a long grace
          // period keeps a first start (or a start after an upstream upgrade)
          // from flashing red while it does legitimate work.
          gracePeriod: 300_000,
          fn: () =>
            sdk.healthCheck.checkPortListening(effects, uiPort, {
              successMessage: i18n('Kimai is ready'),
              errorMessage: i18n(
                'Kimai is starting — the first start applies database migrations and can take several minutes',
              ),
            }),
        },
        // Gated on the grant, not just on mysqld being up: Kimai connects over
        // TCP, which a restored datadir does not permit until ensure-db-access
        // has run.
        requires: ['mysql', 'ensure-db-access'],
      })
      /**
       * Applies the stored admin password to Kimai itself.
       *
       * This is a oneshot rather than the image's own ADMINPASS/ADMINMAIL
       * variables because those only reach `kimai:user:create`, which fails
       * once the user exists — so they can set a password but never rotate
       * one. Creating-then-falling-back-to-setting covers both, and re-running
       * it on every start is harmless.
       *
       * It requires the `kimai` daemon rather than `mysql` because the console
       * needs Kimai's schema to exist, and it is `kimai:install` — inside the
       * daemon's entrypoint — that creates it.
       */
      .addOneshot('apply-admin-credentials', {
        subcontainer: kimaiSub,
        exec: {
          command: [
            'sh',
            '-c',
            // The password is passed through the environment, not interpolated
            // into this string, so it is never split by the shell or logged as
            // part of the command line.
            '[ -n "$KIMAI_ADMIN_PASSWORD" ] || exit 0; ' +
              'bin/console -n kimai:user:create "$KIMAI_ADMIN_USER" "$KIMAI_ADMIN_EMAIL" ROLE_SUPER_ADMIN "$KIMAI_ADMIN_PASSWORD" || ' +
              'bin/console -n kimai:user:password "$KIMAI_ADMIN_USER" "$KIMAI_ADMIN_PASSWORD"',
          ],
          cwd: KIMAI_APP_DIR,
          // Match the user Apache runs as, so any cache file the console
          // touches stays writable by the web process.
          user: 'www-data',
          env: {
            ...kimaiEnv,
            KIMAI_ADMIN_USER: ADMIN_USERNAME,
            KIMAI_ADMIN_EMAIL: ADMIN_EMAIL,
            KIMAI_ADMIN_PASSWORD: adminPassword,
          },
        },
        requires: ['kimai'],
      })
      .addHealthCheck('email', {
        ready: {
          display: i18n('Email'),
          fn: async () =>
            smtpCredentials
              ? {
                  result: 'success',
                  message: i18n('Kimai can send email'),
                }
              : {
                  result: 'disabled',
                  message: i18n(
                    'No SMTP server configured. Kimai cannot send password-reset emails, invoices, or reports. Use the "Configure SMTP" action to enable it.',
                  ),
                },
        },
        requires: ['kimai'],
      })
  )
})

async function resolveSmtp(
  effects: T.Effects,
  smtp: z.infer<typeof smtpShape>,
): Promise<T.SmtpValue | null> {
  if (smtp.selection === 'system') {
    const credentials = await sdk.getSystemSmtp(effects).const()
    const customFrom = smtp.value.customFrom as string | undefined
    if (credentials && customFrom) credentials.from = customFrom
    return credentials
  }

  if (smtp.selection === 'custom') {
    const { host, from, username, password, security } = smtp.value.provider
      .value as {
      host: string
      from: string
      username: string
      password?: string | null
      security: { selection: 'tls' | 'starttls'; value: { port: string } }
    }
    return {
      host,
      from,
      username,
      password: password ?? null,
      port: Number(security.value.port),
      security: security.selection,
    }
  }

  return null
}

/**
 * Builds a Symfony Mailer DSN for Kimai's MAILER_URL.
 *
 * `smtps://` is implicit TLS (usually port 465); `smtp://` negotiates STARTTLS.
 * Credentials are percent-encoded because a password containing `@` or `:`
 * would otherwise corrupt the DSN.
 */
function buildMailerDsn(smtp: T.SmtpValue | null): string {
  if (!smtp) return 'null://null'
  const scheme = smtp.security === 'tls' ? 'smtps' : 'smtp'
  const auth = smtp.username
    ? `${encodeURIComponent(smtp.username)}:${encodeURIComponent(smtp.password ?? '')}@`
    : ''
  return `${scheme}://${auth}${smtp.host}:${smtp.port}`
}
