import { FileHelper, smtpShape, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z
  .object({
    /**
     * MySQL root password. Internal only — never shown to the user.
     * Alphanumeric by construction so it can be embedded in DATABASE_URL
     * without percent-encoding (see init/seedFiles.ts).
     */
    dbPassword: z.string().catch(''),
    /**
     * Symfony's APP_SECRET. The image will generate and persist its own under
     * var/data if this is unset, but keeping it here puts it in store.json,
     * where it is covered by backups alongside the database.
     */
    appSecret: z.string().catch(''),
    /**
     * Password for the `admin` super-admin. Set by the set-admin-password
     * action, applied to Kimai by the apply-admin-credentials oneshot.
     */
    adminPassword: z.string().catch(''),
    smtp: smtpShape,
  })
  .strip()

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: './store.json' },
  shape,
)
