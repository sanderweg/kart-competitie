# 🏁 Kart Competitie Dashboard

Een moderne webapplicatie voor het bijhouden van een kartcompetitie met live leaderboard, racegeschiedenis en een beheerpaneel.
Gebouwd met **HTML, CSS, JavaScript + Firebase Realtime Database & Authentication**.

---

## 🚀 Features

### 📊 Openbare pagina

* Live leaderboard (automatisch gesorteerd op punten)
* Overzicht per race (Sprint 1 + Sprint 2)
* Racegeschiedenis
* Werkt realtime op alle apparaten

### 🔐 Beheerpaneel (admin)

* Inloggen via Firebase Authentication
* Nieuwe races toevoegen
* Drivers toevoegen per sprint
* Posities invoeren (automatische puntentelling)
* **Uitslagen bewerken**
* Races verwijderen
* Data exporteren (JSON backup)

### 🏎️ Race structuur

* 1 race bestaat uit:

  * Sprint 1 (10 min)
  * Sprint 2 (10 min)
* Puntentelling automatisch berekend op basis van positie

---

## 🧮 Puntentelling

| Positie | Punten |
| ------- | ------ |
| 1       | 25     |
| 2       | 22     |
| 3       | 20     |
| ...     | ...    |
| 22      | 1      |
| 0       | 0      |

👉 Positie **0 = 0 punten** (bijv. DNF / DSQ)

---

## 🏗️ Project structuur

```
/project
│
├── index.html        → Landing page
├── login.html        → Inlogpagina
├── admin.html        → Beheerpaneel
├── public.html       → Openbare leaderboard
│
├── styles.css        → Styling (dark dashboard theme)
│
├── firebase.js       → Firebase config + helpers
├── admin.js          → Beheer functionaliteit
├── public.js         → Publieke data weergave
├── login.js          → Login logic
│
└── README.md
```

---

## ⚙️ Installatie

### 1. Clone of download repo

```bash
git clone <jouw-repo-url>
```

---

### 2. Firebase instellen

Ga naar Firebase en zorg dat je:

#### ✅ Realtime Database aan hebt staan

#### ✅ Authentication (Email/Password) aan hebt staan

Plak je config in:

```js
firebase.js
```

---

### 3. Database rules

Voor basisgebruik:

```json
{
  "rules": {
    ".read": true,
    ".write": "auth != null"
  }
}
```

---

### 4. Website hosten (GitHub Pages)

1. Ga naar je repository
2. Settings → Pages
3. Selecteer:

   * Branch: `main`
   * Folder: `/root`
4. Klik **Save**

Je site is live 🎉

---

## 🔒 Beveiliging

* Alleen ingelogde gebruikers kunnen data aanpassen
* Publieke pagina is read-only
* Firebase API key is veilig (beveiliging zit in rules)

---

## ✏️ Uitslagen bewerken

* Klik op **"Uitslag bewerken"**
* Formulier wordt automatisch gevuld
* Pas gegevens aan
* Klik **Opslaan**

👉 Bestaande race wordt overschreven (geen duplicaten)

---

## 📦 Export functie

* Download volledige database als JSON
* Handig voor:

  * Backups
  * Analyse
  * Migraties

---

## 💡 Toekomstige uitbreidingen

Mogelijke upgrades:

* 🏁 Teams toevoegen
* 📈 Statistieken (winrate, gemiddelde positie)
* 🧑‍🤝‍🧑 Seizoenen / kampioenschappen
* 🏎️ Kart reviews (jouw andere idee 😉)
* 📱 Mobile optimalisatie

---

## 👨‍💻 Auteur

Gebouwd door jou 💪
Met hulp van ChatGPT 🚀

---

## 🏁 Status

🟢 Actief ontwikkeld
🟢 Live sync werkend
🟢 Firebase gekoppeld
🟢 Bewerken van uitslagen actief

---

**Have fun racen 🏎️💨**
