# Rätsel-Leitfaden Nextwing Quest

Dieser Leitfaden hält fest, was in den Probespielen funktioniert hat. Er ist die Grundlage für die Anweisung an die KI im Generator und wird nach jeder gespielten Runde ergänzt.

Stand: November 2026. Erfahrungen aus: Eddie und der Schatz von Agathe, Der Stern von Lissabon, Das Geheimnis der Dicken Gertrud (Kirmes), Ferdinands Wintervorrat (Herbst), Polarstern-Advent.

## 1. Grundsätze

1. **Geschichte vor Rätsel.** Die Runde erinnert sich an Figuren, nicht an Mechaniken.
2. **Persönlich schlägt perfekt.** Namen, Orte und Insider tragen mehr als aufwendige Grafik.
3. **Thema bis in den Ton.** Jede Welt hat eigene Grafik, Geräusche und Musik. Das ist Standard, kein Extra.
4. **Gemeinsam statt allein.** Eine Anzeigetafel zeigt, wer dran ist, wer hängt, wer angefeuert wird.
5. **Technik ist unsichtbar.** Login per Link, kein Konto, läuft am Handy und am Fernseher.

## 2. Text

| Stelle | Grenze |
| --- | --- |
| Einleitung des Spiels | höchstens 40 Wörter |
| Text vor einem Rätsel | höchstens 2 Sätze |
| Spielleiter-Spruch | 1 Satz, höchstens 2 kurze |
| Finale | höchstens 60 Wörter |
| Tipps | 3 Stufen: Richtung, konkreter Hinweis, fast die Lösung |

- Zu viel Text kam schlecht an. Lieber ein Spruch mehr als ein Absatz mehr.
- Ansprache per Du, Namen der Spieler direkt verwenden.
- Rückbezug auf den, der gelöst hat („Kathleen hat den Code geknackt“).

## 3. Spielleiter-Figur

Die kurzen, frechen Kommentare von Eddie und dem Kirmes-Direktor kamen am besten an. Jedes Spiel hat deshalb eine Spielleiter-Figur mit eigener Stimme.

- **Charakter:** passend zur Welt (Direktor auf der Kirmes, Papagei bei Piraten, Elfe am Nordpol). Name, Farbe, ein Satz zur Persönlichkeit.
- **Ton:** liebevoll frech. Necken ja, verletzen nie.
- **Auslöser, je 2 bis 5 Sprüche:** Start, Treffer oder Teilerfolg, Fehlversuch, dritter Fehlversuch, letzter Versuch, geschafft, verloren, trödelt (etwa 12 Sekunden nichts passiert), jemand feuert an.
- **Personenbezogene Sprüche** nur aus Insidern, die der Spielleiter angegeben hat.
- **Keine Wiederholung:** Ein Spruch kommt erst wieder, wenn alle anderen seines Auslösers dran waren.
- **Tabu:** Aussehen, Gewicht, Alter als Schwäche, Gesundheit, Religion, Politik, Geld, Beziehungen.

## 4. Grafik und Klang

- Jede Welt: eigener Himmel, Boden, Requisiten, Ziele, Partikel (Schnee, Sand, Blasen).
- Klang mit WebAudio erzeugt, keine fremden Dateien: Umgebung als Schleife (Orgel, Meer, Wind, Glocken), Effekte passend zum Material (Blechdose klingt anders als Glas oder Ton), Fanfare beim Erfolg, Umgebung wird dabei kurz leiser.
- Ton startet erst nach einem Tipp, auf dem iPhone auch bei Stummschalter (Audio-Session „playback“).
- Bewegung respektiert „weniger Bewegung“ in den Systemeinstellungen.
- Nur eigene Grafiken, Klänge und gemeinfreie Melodien. Keine Marken, Figuren oder Logos (Hogwarts, Disney, Star Wars usw.): neutralen Ersatz anbieten.

## 5. Rätsel

- Die KI erfindet keine Mechaniken. Sie wählt Module aus der Bibliothek und füllt deren Parameter.
- **Jedes Rätsel wird vor der Auslieferung durch einen Prüfer gespielt:** lösbar, bei Logikrätseln eindeutig, Schwierigkeit im Zielbereich.
- **Schwierigkeit kommt aus Parametern,** nicht aus kryptischem Text (Rastergröße, Wind, Anzahl, Zeit).
- **Mischung pro Spiel:** leichte Geschicklichkeit zum Aufwärmen, mittlere Denkrätsel, ein harter Brocken zum Schluss.
- **Stationen der Geschichte bestimmen die Kulisse:** Jede Station hat Schlagwörter (Strand, Nacht, Küche), das Modul wird passend verkleidet.

## 6. Module (Stand)

| Modul | Herkunft | Stand |
| --- | --- | --- |
| Zielen und Werfen | Kirmes, Dosenwerfen | Prototyp mit Prüfer und 12 Kulissen |
| Pfad, jedes Feld einmal | Kirmes, Weg zum Riesenrad | Prototyp mit Eindeutigkeits-Prüfer, 5 Kulissen, Tipps in 3 Stufen |
| Chiffrierscheibe | Eddie | umzubauen |
| Schiebepuzzle | Kirmes, Herbst | umzubauen |
| Hütchenspiel | Herbst | umzubauen |
| Fehlersuche, Memory, Simon, Sortieren, Logikgitter | Advent, Krimi | umzubauen |

## 7. Was die KI liefert

Ein JSON-Dokument pro Spiel, kein Code: Titel, Einleitung, Spielleiter (Name, Charakter, Sprüche je Auslöser), Stationen mit Modul, Kulisse, Parametern, Texten, Tipps und Belohnung, dazu das Finale. Der Prüfer lehnt ab, was Grenzen oder Lösbarkeit verletzt, und lässt nachbessern.

## 8. Datenschutz

- Persönliche Fakten und Fotos gehören nie ins Repo.
- Der Spielleiter bestätigt das Einverständnis der Mitspieler.
- Fotos und Insider werden nach Spielende gelöscht.
