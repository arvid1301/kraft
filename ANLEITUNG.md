# Kraft: So kommt die App auf dein iPhone

Die App ist eine Web App. Sie liegt als kleine Webseite auf GitHub Pages (kostenlos) und wird in Safari zum Home-Bildschirm hinzugefügt. Danach fühlt sie sich wie eine normale App an und läuft auch ohne Internet.

## Einmalig: Veröffentlichen (am Computer, etwa 10 Minuten)

1. Auf github.com einloggen und oben rechts auf das Plus, dann **New repository**.
2. Name: `kraft` (Kleinbuchstaben). **Public** auswählen (nötig für kostenloses Pages). Sonst nichts ankreuzen. **Create repository**.
3. Im Terminal (oder hier im Chat mir sagen, dann mache ich es) im Ordner `C:\Users\arvid\Documents\App`:

   ```bash
   git remote add origin https://github.com/DEIN-GITHUB-NAME/kraft.git
   ```
   ```bash
   git branch -M main
   ```
   ```bash
   git push -u origin main
   ```
   Beim ersten Push fragt Windows nach deinem GitHub Login, das ist normal.
4. Auf GitHub im Repository: **Settings** → links **Pages** → bei "Build and deployment" unter **Source** den Eintrag **GitHub Actions** wählen.
5. Oben auf **Actions** klicken. Dort läuft "Deploy" etwa 1 bis 2 Minuten. Grüner Haken = fertig.
6. Die Adresse der App lautet dann: `https://DEIN-GITHUB-NAME.github.io/kraft/`

Jede spätere Änderung, die ich mache und du mit `git push` hochlädst, landet automatisch auf dem Handy.

## Auf dem iPhone (1 Minute)

1. Die Adresse in **Safari** öffnen (nicht Chrome, nur Safari kann Web Apps installieren).
2. Unten auf das **Teilen**-Symbol (Quadrat mit Pfeil nach oben).
3. **Zum Home-Bildschirm** antippen, Name "Kraft" lassen, **Hinzufügen**.
4. Ab jetzt immer über das Symbol auf dem Home-Bildschirm öffnen. Nur dann gibt es Vollbild ohne Safari-Leisten.

## Wichtig zu wissen

- **Daten liegen nur auf dem Handy.** Löschst du die App vom Home-Bildschirm oder leerst Safari-Daten, sind sie weg. Deshalb alle 2 Wochen unter Einstellungen → Backup sichern. Die Datei landet in "Dateien", von dort in iCloud ablegen.
- **Ton:** iOS spielt den Pausen-Ton nur, wenn der Stummschalter nicht aktiv ist. Er mischt sich mit Musik.
- **Vibration** gibt es in Web Apps auf dem iPhone nicht, deshalb Ton plus Blinken.
- **Bildschirm an** funktioniert nur, solange die App im Vordergrund ist.
- **Erstes Training:** Die App startet leer. Beim ersten Durchgang trägst du die Gewichte ein (Zahl antippen zum Eintippen, oder Plus/Minus). Ab dem zweiten Mal sind die Werte vorausgefüllt und die App macht Vorschläge.

## Am Computer weiterentwickeln

```bash
npm install
```
```bash
npm run dev
```
Dann im Browser `http://localhost:5173` öffnen. Tests laufen mit `npm test`.
