import { smtpPrefill } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec } = sdk

export const inputSpec = InputSpec.of({
  smtp: sdk.inputSpecConstants.smtpInputSpec,
})

/**
 * Kimai uses email for password resets, invoice delivery, and scheduled
 * reports. With SMTP disabled it writes a `null://` mailer DSN and those
 * features silently do nothing, which the "Email" health check reports.
 */
export const manageSmtp = sdk.Action.withInput(
  'configure-smtp',

  async () => ({
    name: i18n('Configure SMTP'),
    description: i18n(
      'Add SMTP credentials so Kimai can send password-reset emails, invoices, and reports.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => ({
    smtp: smtpPrefill(await storeJson.read((s) => s.smtp).once()),
  }),

  async ({ effects, input }) => storeJson.merge(effects, { smtp: input.smtp }),
)
