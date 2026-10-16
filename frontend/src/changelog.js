// Manuell gepflegt — bei jedem sichtbaren Release hier oben einen neuen
// Eintrag ergänzen und APP_VERSION hochzählen.
export const APP_VERSION = '1.8.0';

export const CHANGELOG = [
  {
    version: '1.8.0',
    date: '2026-07-10',
    notes: [
      'Workouts sind jetzt frei konfigurierbar: eigene Workouts anlegen (z. B. Workout C), einzelne Workouts deaktivieren oder löschen',
      'Deaktivierte Workouts werden bei der Rotation übersprungen — bei nur einem aktiven Workout bleibt es immer dasselbe'
    ]
  },
  {
    version: '1.7.1',
    date: '2026-07-06',
    notes: [
      'Versionsverlauf-Badge nur noch bei den Einstellungen sichtbar, nicht mehr auf jedem Bildschirm'
    ]
  },
  {
    version: '1.7.0',
    date: '2026-07-06',
    notes: [
      'Einstellungen: Ziel-Zeit und Pause jetzt als mm:ss statt roher Sekundenzahl (z. B. "01:30" statt "90")',
      'Wochenziel-Bereich auf der Startseite: Heatmap und Ring jetzt in zwei gleich breiten, jeweils zentrierten Bereichen'
    ]
  },
  {
    version: '1.6.1',
    date: '2026-07-06',
    notes: [
      'Heatmap + Wochenziel auf der Startseite als eine zentrierte Einheit mit Trennlinie statt an die Kartenränder gepinnt'
    ]
  },
  {
    version: '1.6.0',
    date: '2026-07-06',
    notes: [
      'Monats-Heatmap wieder dezent (kleine Kästchen statt großem Kalender-Raster)',
      'Neu auf der Startseite: Wochenziel-Ring neben der Heatmap — zeigt den Fortschritt zu "1× täglich + 2× Gym pro Woche" in Prozent'
    ]
  },
  {
    version: '1.5.1',
    date: '2026-07-06',
    notes: [
      'Monatsansicht (Home + Verlauf) als echtes Kalender-Raster überarbeitet: Wochentags-Kopfzeile, größere Kästchen mit Tageszahl, nutzt die Kartenbreite komplett aus statt eines schmalen Streifens'
    ]
  },
  {
    version: '1.5.0',
    date: '2026-07-06',
    notes: [
      'Gym-Sätze lassen sich durch erneutes Antippen wieder rückgängig machen',
      'Workouts können jetzt komplett gelöscht werden — laufende ("Verwerfen") und abgeschlossene (im Verlauf)',
      'Verlauf zeigt jetzt nur noch den aktuell gewählten Monat statt einer scrollenden Jahresansicht — Heatmap, Statistik und Session-Liste schalten gemeinsam beim Monatswechsel um'
    ]
  },
  {
    version: '1.4.0',
    date: '2026-07-06',
    notes: [
      'Tägliche Einheit auf der Startseite jetzt eingeklappt — antippen zeigt die einzelnen Übungen',
      'Neue Monatsübersicht (GitHub-Stil) direkt auf der Startseite, zeigt nur den aktuellen Monat',
      'Vollständiger Verlauf mit allen Monaten weiterhin unter "Verlauf"'
    ]
  },
  {
    version: '1.3.0',
    date: '2026-07-06',
    notes: [
      'Einstellungen: Übungen jetzt per Drag & Drop verschieben (Griff-Symbol statt Pfeil-Buttons)'
    ]
  },
  {
    version: '1.2.0',
    date: '2026-07-06',
    notes: [
      'Verlauf komplett überarbeitet: Monatsübersicht mit Vor/Zurück-Navigation',
      'Monatssummen pro Übung (z. B. Gesamtzahl Liegestütze/Kniebeugen im Monat)',
      'Bestleistungen: höchstes je aufgezeichnetes Gewicht pro Gym-Übung',
      'Gym-Sessions im Verlauf jetzt nach Monat gruppiert',
      'Kompletter Mobile-Optimierungsdurchgang: größere Tipp-Flächen (Einstellungen-Reorder war zu klein), kein iOS-Zoom mehr in Eingabefeldern, sauberes Tap-Feedback',
      'Heatmap zeigt jetzt Monatsnamen wie bei GitHub'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-07-06',
    notes: [
      'Einstellungen: eigene Übungen hinzufügen, löschen und per Pfeile umsortieren',
      'Gym-Workouts starten jetzt immer mit Laufband-Aufwärmen und enden mit Dehnen',
      'Neues Icon-Set in Navigation und Checklisten (statt Emoji)',
      'Einladenderer Startbildschirm mit Begrüßung',
      'Versionsverlauf hinzugefügt'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-07-06',
    notes: [
      'Erste Version: tägliche Einheit mit Fortschrittsring',
      'Gym-Rotation A/B mit Satz- und Pausen-Timer',
      'Contribution-Heatmap, Streak und Wochenübersicht',
      'Einstellungen für Sätze, Ziel, Pause und Gewicht pro Übung'
    ]
  }
];
