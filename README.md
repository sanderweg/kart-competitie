# Kart Competitie Firebase - Gerepareerde versie

Dit pakket bevat:
- volledige layout
- 2 sprint races per race
- live Firebase Realtime Database koppeling
- export JSON
- live seizoensstand
- race-overzicht
- racegeschiedenis

## Belangrijk
Zorg dat je Realtime Database Rules tijdens testen ten minste dit toestaan:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## Database pad
De app schrijft naar:
`kartCompetitie/races`

## Hosting
Gebruik GitHub Pages, Netlify, Firebase Hosting of een andere webhost.
Open dit niet als los bestand vanaf je computer.
