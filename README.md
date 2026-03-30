# Kart Competitie - Rebuild admin fix

Deze versie bevat:
- werkende openbare leaderboard
- admin paneel zonder vastlopen
- Firebase realtime sync
- 2 slechtste sprints worden geschrapt
- gemiste races tellen als 0 + 0
- positie 0 = 0 punten
- uitslagen bewerken blijft aanwezig

## Let op
In deze versie blijft admin.html laden, ook als je nog niet bent ingelogd.
Je kunt dan de stand zien, maar pas na inloggen kun je wijzigen.

- drivernaam autocomplete toegevoegd in het beheerpaneel
- autocomplete vult nu ook automatisch aan bij unieke match, bijvoorbeeld `San` -> `Sander Weggen`

- concept-races toegevoegd: je kunt nu een race klaarzetten zonder posities
- concept-races tellen niet mee in de stand of live leaderboard tot ze volledig zijn ingevuld

- race overzicht heeft nu tabs om te wisselen tussen alle races of één specifieke race
