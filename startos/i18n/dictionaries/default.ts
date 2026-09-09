export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Kimai!': 0,
  Database: 1,
  'The database is ready': 2,
  'Initializing a new database. This can take a while...': 3,
  'Starting the database...': 4,
  'Web Interface': 5,
  'Kimai is ready': 6,
  'Kimai is starting — the first start applies database migrations and can take several minutes': 7,
  Email: 8,
  'Kimai can send email': 9,
  'No SMTP server configured. Kimai cannot send password-reset emails, invoices, or reports. Use the "Configure SMTP" action to enable it.': 10,

  // interfaces.ts
  'The Kimai web interface': 11,

  // init/watchCredentials.ts
  'Set the admin password before signing in to Kimai': 12,

  // actions/setAdminPassword.ts
  'Set Admin Password': 13,
  'Generate a new random password for the Kimai admin account. Replaces the existing password.': 14,
  'Login Credentials': 15,
  'Use these credentials to sign in to Kimai. If Kimai is running it will restart to apply them; this takes a few moments.': 16,
  Username: 17,
  Password: 18,

  // actions/manageSmtp.ts
  'Configure SMTP': 19,
  'Add SMTP credentials so Kimai can send password-reset emails, invoices, and reports.': 20,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
