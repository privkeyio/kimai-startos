import { sdk } from '../sdk'
import { manageSmtp } from './manageSmtp'
import { setAdminPassword } from './setAdminPassword'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(manageSmtp)
