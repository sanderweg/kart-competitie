# Kart Competitie Firebase met login

Deze versie gebruikt:
- Firebase Realtime Database
- Firebase Authentication (Email/Password)

## Wat deze versie doet
- iedereen kan de data bekijken
- alleen ingelogde gebruikers kunnen races toevoegen, verwijderen of alles wissen
- export JSON blijft beschikbaar

## Zet dit aan in Firebase
### 1. Authentication
Ga naar:
Authentication > Sign-in method > Email/Password
Zet Email/Password aan.

Maak daarna bij Authentication > Users een gebruiker aan.

### 2. Realtime Database Rules
Gebruik voor deze opzet:

```json
{
  "rules": {
    ".read": true,
    ".write": "auth != null"
  }
}
```

## Database pad
De app schrijft naar:
`kartCompetitie/races`

## Belangrijk
Als login niet werkt:
- check of Email/Password echt aanstaat
- check of de gebruiker is aangemaakt
- check of je site via hosting draait en niet als lokaal bestand
