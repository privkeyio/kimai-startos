import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { ADMIN_USERNAME } from '../utils'

/**
 * Mints the password for Kimai's `admin` super-admin and stores it. Writing
 * store.json re-runs setupMain, whose apply-admin-credentials oneshot pushes
 * the value into Kimai through `bin/console` — creating the account on first
 * use and changing its password on every later one, so this single action
 * covers both first-set and rotation.
 */
export const setAdminPassword = sdk.Action.withoutInput(
  'set-admin-password',

  async () => ({
    name: i18n('Set Admin Password'),
    description: i18n(
      'Generate a new random password for the Kimai admin account. Replaces the existing password.',
    ),
    warning: null,
    // 'any' rather than 'only-running': on a fresh install the user needs a
    // password before the service is worth starting.
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    // Kimai validates passwords at 8-60 characters; 22 sits comfortably inside
    // that. Alphanumeric so it survives being copied into a login form.
    const adminPassword = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 22,
    })

    await storeJson.merge(effects, { adminPassword })

    return {
      version: '1',
      title: i18n('Login Credentials'),
      message: i18n(
        'Use these credentials to sign in to Kimai. If Kimai is running it will restart to apply them; this takes a few moments.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Username'),
            description: null,
            value: ADMIN_USERNAME,
            masked: false,
            copyable: true,
            qr: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: adminPassword,
            masked: true,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
