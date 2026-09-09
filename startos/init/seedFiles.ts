import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') {
    await storeJson.merge(effects, {})
    return
  }

  await storeJson.merge(effects, {
    /**
     * Alphanumeric on purpose. This password is embedded in DATABASE_URL, and
     * Kimai's entrypoint splits that string on `/`, `:` and `@` with awk to
     * recover the connection details — a punctuation character here would
     * break the database wait loop rather than fail loudly.
     */
    dbPassword: utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 32 }),
    appSecret: utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 64 }),
    smtp: { selection: 'disabled', value: {} },
  })

  // adminPassword is deliberately not seeded here: it is user-facing, so the
  // set-admin-password action mints it and shows it, prompted by the critical
  // task in watchCredentials.ts.
})
