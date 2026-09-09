import { setAdminPassword } from '../actions/setAdminPassword'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

/**
 * Kimai ships with no accounts, so until an admin password is set there is no
 * way to sign in. Surface that as a critical task pointing at the action that
 * fixes it. Task creation is idempotent on its replay key, so re-running this
 * on every container rebuild does not spam the user.
 */
export const watchCredentials = sdk.setupOnInit(async (effects) => {
  const adminPassword = await storeJson.read((s) => s.adminPassword).const(effects)

  if (!adminPassword) {
    await sdk.action.createOwnTask(effects, setAdminPassword, 'critical', {
      reason: i18n('Set the admin password before signing in to Kimai'),
    })
  }
})
