# Kart Competitie Firebase

Deze versie gebruikt **Firebase Realtime Database** zodat meerdere apparaten tegelijk dezelfde data zien.

## Wat je moet invullen
Open `config.js` en vul je eigen Firebase web config in, plus de `databaseURL` van je **nieuwe Realtime Database instance**.

## Hoe starten
Omdat dit een ES module gebruikt, open je hem het best via een simpele lokale server.

### Makkelijkste manier
- Open de map in VS Code
- Installeer de extensie **Live Server**
- Rechtsklik op `index.html`
- Kies **Open with Live Server**

Of upload hem direct naar Firebase Hosting / Netlify / GitHub Pages.

## Database pad
De app schrijft naar:
`kartCompetitie/races`

## Voorbeeld Realtime Database Rules voor testen
Gebruik dit alleen tijdelijk tijdens bouwen:

```json
{
  "rules": {
    "kartCompetitie": {
      ".read": true,
      ".write": true
    }
  }
}
```

Veiliger alternatief voor later:
- lezen voor iedereen
- schrijven alleen voor ingelogde gebruikers

```json
{
  "rules": {
    "kartCompetitie": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

## Structuur
Elke race bevat:
- naam
- datum
- sprint1Drivers
- sprint2Drivers
- results

## Belangrijk
Deze app verwacht:
- 1 race = 2 sprint races van 10 minuten
- punten per positie volgens jouw schema
