import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '2.66.0:1',
  releaseNotes: {
    en_US: `Fixes the service hanging permanently after a restore.

A restored install came back with all of its data but never finished starting,
because the restored database contained no account reachable over the network.
The database is now checked over its local socket, and the missing account is
recreated automatically before Kimai starts. No action is needed on your part.

Restoring a backup taken with an earlier version still reproduces the problem,
because a restore brings back the version that made the backup. Take a fresh
backup once this version is running.`,
    es_ES: `Corrige el bloqueo permanente del servicio tras una restauración.

Una instalación restaurada recuperaba todos sus datos pero nunca terminaba de
iniciarse, porque la base de datos restaurada no contenía ninguna cuenta
accesible a través de la red. Ahora la base de datos se comprueba mediante su
socket local y la cuenta que falta se vuelve a crear automáticamente antes de
que Kimai arranque. No es necesario que hagas nada.

Restaurar una copia de seguridad creada con una versión anterior sigue
reproduciendo el problema, ya que una restauración recupera la versión que hizo
la copia. Crea una copia de seguridad nueva cuando esta versión esté en marcha.`,
    de_DE: `Behebt das dauerhafte Hängenbleiben des Dienstes nach einer Wiederherstellung.

Eine wiederhergestellte Installation kam mit allen Daten zurück, schloss den
Start aber nie ab, weil die wiederhergestellte Datenbank kein über das Netzwerk
erreichbares Konto enthielt. Die Datenbank wird nun über ihren lokalen Socket
geprüft, und das fehlende Konto wird vor dem Start von Kimai automatisch neu
angelegt. Sie müssen nichts unternehmen.

Das Wiederherstellen einer mit einer früheren Version erstellten Sicherung
reproduziert das Problem weiterhin, da eine Wiederherstellung die Version
zurückbringt, die die Sicherung erstellt hat. Erstellen Sie eine neue Sicherung,
sobald diese Version läuft.`,
    pl_PL: `Naprawia trwałe zawieszanie się usługi po przywróceniu z kopii zapasowej.

Przywrócona instalacja wracała ze wszystkimi danymi, ale nigdy nie kończyła
uruchamiania, ponieważ przywrócona baza danych nie zawierała żadnego konta
dostępnego przez sieć. Baza danych jest teraz sprawdzana przez lokalne gniazdo,
a brakujące konto jest automatycznie odtwarzane przed startem Kimai. Nie musisz
nic robić.

Przywrócenie kopii wykonanej wcześniejszą wersją nadal odtwarza ten problem,
ponieważ przywracanie przywraca wersję, która wykonała kopię. Wykonaj nową kopię
zapasową, gdy ta wersja będzie już uruchomiona.`,
    fr_FR: `Corrige le blocage permanent du service après une restauration.

Une installation restaurée revenait avec toutes ses données mais ne terminait
jamais son démarrage, car la base de données restaurée ne contenait aucun compte
accessible par le réseau. La base de données est désormais vérifiée via sa
socket locale, et le compte manquant est recréé automatiquement avant le
démarrage de Kimai. Aucune action n'est requise de votre part.

Restaurer une sauvegarde réalisée avec une version antérieure reproduit toujours
le problème, car une restauration rétablit la version qui a créé la sauvegarde.
Effectuez une nouvelle sauvegarde une fois cette version en service.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
