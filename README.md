# Kart Competitie - Rebuild

Deze rebuild bevat:
- landing page
- login page
- openbare leaderboard
- admin paneel
- Firebase realtime sync
- uitslagen bewerken
- positie 0 = 0 punten
- 2 slechtste sprints worden geschrapt
- gemiste races tellen automatisch als 0 + 0

## Belangrijk
Deze versie gebruikt de Firebase config die eerder in jouw project stond.

## Rules
Gebruik minimaal:

```json
{
  "rules": {
    ".read": true,
    ".write": "auth != null"
  }
}
```
