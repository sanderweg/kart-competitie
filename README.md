# Kart Competitie met landing page + beheer login

Deze versie heeft 3 pagina's:

- `index.html` → landing page
- `public.html` → openbare leaderboard / kijkpagina
- `login.html` → beheerder login
- `admin.html` → beveiligd beheerpaneel na inloggen

## Werking
1. Bezoekers komen eerst op de landing page.
2. Via **Beheerder login** gaan ze naar de loginpagina.
3. Na succesvol inloggen komen ze automatisch op het beheerpaneel.
4. Niet-ingelogde gebruikers worden van `admin.html` teruggestuurd naar `login.html`.

## Firebase
Deze versie gebruikt jouw huidige Firebase Realtime Database + Authentication config.

## Nog nodig in Firebase
### Authentication
- Email/Password aanzetten
- beheerdergebruiker aanmaken

### Realtime Database Rules
Gebruik:

```json
{
  "rules": {
    ".read": true,
    ".write": "auth != null"
  }
}
```
