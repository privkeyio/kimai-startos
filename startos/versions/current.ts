import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '2.66.0:0',
  releaseNotes: {
    en_US: `Initial release of Kimai 2.66.0 for StartOS.

- Runs the official Apache image with a MySQL 8.4 sidecar bound to loopback.
- Admin credentials are generated and rotated from the "Set Admin Password" action.
- Optional SMTP for password-reset emails, invoices, and reports.
- Backups dump the database and include invoices, exports, and custom templates.`,
    es_ES: `Primera versión de Kimai 2.66.0 para StartOS.

- Ejecuta la imagen oficial de Apache con MySQL 8.4 como servicio adjunto enlazado a la interfaz local.
- Las credenciales de administrador se generan y se rotan desde la acción «Establecer contraseña de administrador».
- SMTP opcional para correos de restablecimiento de contraseña, facturas e informes.
- Las copias de seguridad vuelcan la base de datos e incluyen facturas, exportaciones y plantillas personalizadas.`,
    de_DE: `Erste Veröffentlichung von Kimai 2.66.0 für StartOS.

- Führt das offizielle Apache-Image mit einem an localhost gebundenen MySQL-8.4-Beiwagen aus.
- Administrator-Zugangsdaten werden über die Aktion „Administrator-Passwort festlegen“ erzeugt und gewechselt.
- Optionales SMTP für Passwort-Zurücksetzungs-E-Mails, Rechnungen und Berichte.
- Sicherungen erstellen einen Datenbank-Dump und enthalten Rechnungen, Exporte und eigene Vorlagen.`,
    pl_PL: `Pierwsze wydanie Kimai 2.66.0 dla StartOS.

- Uruchamia oficjalny obraz Apache z bazą MySQL 8.4 nasłuchującą wyłącznie lokalnie.
- Dane logowania administratora są generowane i zmieniane akcją „Ustaw hasło administratora”.
- Opcjonalny SMTP do wiadomości resetujących hasło, faktur i raportów.
- Kopie zapasowe zrzucają bazę danych oraz obejmują faktury, eksporty i własne szablony.`,
    fr_FR: `Première version de Kimai 2.66.0 pour StartOS.

- Exécute l'image Apache officielle avec un service MySQL 8.4 attaché, lié à la boucle locale.
- Les identifiants administrateur sont générés et renouvelés depuis l'action « Définir le mot de passe administrateur ».
- SMTP facultatif pour les courriels de réinitialisation de mot de passe, les factures et les rapports.
- Les sauvegardes exportent la base de données et incluent les factures, les exports et les modèles personnalisés.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
