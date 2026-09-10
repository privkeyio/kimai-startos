/**
 * Constants shared across this package's startos/ code.
 */

/**
 * The port Apache listens on inside the `kimai/kimai2` image. Fixed by the
 * image's own vhost (`.docker/000-default.conf` sets `Listen 8001`), so it is
 * not configurable from here.
 */
export const uiPort = 8001

/** MySQL data directory inside the `mysql` image. */
export const MYSQL_DATADIR = '/var/lib/mysql' as const

/**
 * MySQL's unix socket inside the `mysql` image.
 *
 * Load-bearing on a restored datadir: `root@localhost` is the only account
 * that exists at that point, and it is reachable over the socket but not over
 * TCP. See the `ensure-db-access` oneshot in main.ts.
 */
export const MYSQL_SOCKET = '/var/run/mysqld/mysqld.sock' as const

/**
 * Kimai's writable state directory. The upstream image declares this as a
 * VOLUME, and it holds far more than the `data` + `plugins` pair the upstream
 * compose file mounts: invoices, exports, invoice/export templates, and the
 * session directory all live here too. Mounting the whole directory is what
 * keeps those from being silently discarded on restart.
 */
export const KIMAI_VAR_DIR = '/opt/kimai/var' as const

/** Kimai's application root inside the image — the cwd for `bin/console`. */
export const KIMAI_APP_DIR = '/opt/kimai' as const

/** Database name created by the mysql image's entrypoint on first start. */
export const DB_NAME = 'kimai' as const

/** Database user. The mysql image only auto-creates `root` with a password. */
export const DB_USER = 'root' as const

/**
 * Must match the tag of the `mysql` image in the manifest. Doctrine uses it to
 * pick the SQL platform, so a mismatch produces subtly wrong DDL — bump both
 * together (see UPDATING.md).
 */
export const DB_SERVER_VERSION = '8.4.11' as const

/** Username of the Kimai super-admin this package provisions. */
export const ADMIN_USERNAME = 'admin' as const

/**
 * Kimai validates the admin address as an email but never sends to it unless
 * the user configures SMTP, so a non-routable placeholder is correct here.
 */
export const ADMIN_EMAIL = 'admin@kimai.local' as const

/**
 * StartOS terminates TLS at the edge and forwards plain HTTP with
 * `X-Forwarded-Proto: https` (`protocol: 'http'` implies
 * `addXForwardedHeaders: true`). Symfony ignores those headers unless the
 * sender is a trusted proxy, and if it ignores them Kimai builds absolute
 * `http://` URLs that the browser then blocks as mixed content. The OS proxy
 * reaches the container over the private bridge, so trust the private ranges.
 */
export const TRUSTED_PROXIES =
  '127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,169.254.0.0/16'

/** Host id for the `sdk.MultiHost.of` group carrying the web UI. */
export const uiMultiHostId = 'ui-multi'
/** Interface id exported on that host. */
export const uiInterfaceId = 'ui'
