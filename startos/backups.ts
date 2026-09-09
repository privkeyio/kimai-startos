import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'
import { DB_NAME, DB_USER, MYSQL_DATADIR } from './utils'

/**
 * The database is dumped rather than copied: a raw snapshot of the MySQL
 * datadir is only restorable by the exact server version that wrote it, while
 * a logical dump survives an upstream MySQL bump.
 *
 * 'main' carries Kimai's var directory (invoices, exports, custom invoice and
 * export templates, plugins) and 'startos' carries store.json, which holds the
 * database password the restore needs to load the dump back in.
 */
export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.withMysqlDump({
    imageId: 'mysql',
    dbVolume: 'mysql',
    datadir: MYSQL_DATADIR,
    database: DB_NAME,
    user: DB_USER,
    // Lazy: resolved after the volumes are restored, so store.json is on disk.
    password: async () => {
      const password = await storeJson.read((s) => s.dbPassword).once()
      if (!password) throw new Error('No database password found in store.json')
      return password
    },
    engine: 'mysql',
  })
    .addVolume('main')
    .addVolume('startos'),
)
