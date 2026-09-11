import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '2.66.0:2',
  releaseNotes: {
    en_US: `Fixes the admin password being re-applied on every start.

The stored admin password was pushed into Kimai every time the service started.
On an install whose database already held an "admin" account this package did
not create — after importing data from another Kimai, or restoring a backup
taken elsewhere — that silently reset the account's password on every restart.
The password is now applied only when it has actually changed.

Setting a new password with the Set Admin Password action works exactly as
before. Two misleading error lines that appeared in the log on every start are
gone with it.

The first start after this update applies the stored password one last time and
records that it did; from then on it is left alone.`,
    es_ES: `Corrige la reaplicación de la contraseña de administrador en cada inicio.

La contraseña de administrador guardada se aplicaba a Kimai cada vez que el
servicio se iniciaba. En una instalación cuya base de datos ya contenía una
cuenta "admin" no creada por este paquete — tras importar datos de otro Kimai o
restaurar una copia de seguridad hecha en otro sitio — eso restablecía
silenciosamente la contraseña de esa cuenta en cada reinicio. Ahora la
contraseña solo se aplica cuando realmente ha cambiado.

Establecer una contraseña nueva con la acción Establecer contraseña de
administrador funciona igual que antes. Con ello desaparecen también dos líneas
de error engañosas que aparecían en el registro en cada inicio.

El primer inicio tras esta actualización aplica la contraseña guardada una última
vez y deja constancia de ello; a partir de entonces no se vuelve a tocar.`,
    de_DE: `Behebt das erneute Anwenden des Administrator-Passworts bei jedem Start.

Das gespeicherte Administrator-Passwort wurde bei jedem Start des Dienstes in
Kimai geschrieben. Bei einer Installation, deren Datenbank bereits ein nicht von
diesem Paket angelegtes Konto "admin" enthielt — nach dem Import von Daten aus
einem anderen Kimai oder der Wiederherstellung einer anderswo erstellten
Sicherung — wurde dessen Passwort dadurch bei jedem Neustart stillschweigend
zurückgesetzt. Das Passwort wird jetzt nur noch angewendet, wenn es sich
tatsächlich geändert hat.

Ein neues Passwort über die Aktion "Administrator-Passwort festlegen" zu setzen
funktioniert genau wie zuvor. Zwei irreführende Fehlerzeilen, die bei jedem
Start im Protokoll erschienen, entfallen damit ebenfalls.

Der erste Start nach dieser Aktualisierung wendet das gespeicherte Passwort ein
letztes Mal an und hält das fest; danach bleibt es unangetastet.`,
    pl_PL: `Naprawia ponowne ustawianie hasła administratora przy każdym uruchomieniu.

Zapisane hasło administratora było zapisywane w Kimai przy każdym uruchomieniu
usługi. W instalacji, której baza danych zawierała już konto "admin" nieutworzone
przez ten pakiet — po zaimportowaniu danych z innego Kimai lub przywróceniu kopii
zapasowej wykonanej gdzie indziej — powodowało to ciche zresetowanie hasła tego
konta przy każdym restarcie. Hasło jest teraz stosowane tylko wtedy, gdy
faktycznie się zmieniło.

Ustawianie nowego hasła akcją „Ustaw hasło administratora” działa dokładnie tak
jak wcześniej. Znikają wraz z tym dwie mylące linie błędu, które pojawiały się w
dzienniku przy każdym uruchomieniu.

Pierwsze uruchomienie po tej aktualizacji zastosuje zapisane hasło ostatni raz i
odnotuje ten fakt; od tego momentu hasło pozostaje nietknięte.`,
    fr_FR: `Corrige la réapplication du mot de passe administrateur à chaque démarrage.

Le mot de passe administrateur enregistré était appliqué à Kimai à chaque
démarrage du service. Sur une installation dont la base de données contenait
déjà un compte « admin » non créé par ce paquet — après l'import de données d'un
autre Kimai ou la restauration d'une sauvegarde réalisée ailleurs — cela
réinitialisait silencieusement le mot de passe de ce compte à chaque
redémarrage. Le mot de passe n'est désormais appliqué que s'il a réellement
changé.

Définir un nouveau mot de passe avec l'action « Définir le mot de passe
administrateur » fonctionne exactement comme avant. Deux lignes d'erreur
trompeuses qui apparaissaient dans le journal à chaque démarrage disparaissent
également.

Le premier démarrage après cette mise à jour applique le mot de passe enregistré
une dernière fois et le consigne ; ensuite il n'y touche plus.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
