import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHJ_U7_H7rO1CLDEmgYm2bY-956R2B3jI",
  authDomain: "karting-competitie.firebaseapp.com",
  databaseURL: "https://karting-competitie-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "karting-competitie",
  storageBucket: "karting-competitie.firebasestorage.app",
  messagingSenderId: "915335846004",
  appId: "1:915335846004:web:5fbc6592f60a93a9031921"
};

const DB_PATH = "kartCompetitie/races";
const POINTS_MAP = {1:25,2:22,3:20,4:19,5:18,6:17,7:16,8:15,9:14,10:13,11:12,12:11,13:10,14:9,15:8,16:7,17:6,18:5,19:4,20:3,21:2,22:1};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const raceNameInput = document.getElementById("raceName");
const raceDateInput = document.getElementById("raceDate");
const sprint1DriversList = document.getElementById("sprint1DriversList");
const sprint2DriversList = document.getElementById("sprint2DriversList");
const messageEl = document.getElementById("message");
const authMessageEl = document.getElementById("authMessage");
const leaderboardBody = document.getElementById("leaderboardBody");
const seasonBody = document.getElementById("seasonBody");
const historyList = document.getElementById("historyList");
const connectionStatus = document.getElementById("connectionStatus");
const authStatus = document.getElementById("authStatus");
const beheerCard = document.getElementById("beheerCard");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const addSprint1DriverBtn = document.getElementById("addSprint1DriverBtn");
const addSprint2DriverBtn = document.getElementById("addSprint2DriverBtn");
const saveRaceBtn = document.getElementById("saveRaceBtn");
const resetFormBtn = document.getElementById("resetFormBtn");
const exportBtn = document.getElementById("exportBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

let races = [];
let currentUser = null;

addSprint1DriverBtn.addEventListener("click", () => addDriverRow(sprint1DriversList));
addSprint2DriverBtn.addEventListener("click", () => addDriverRow(sprint2DriversList));
saveRaceBtn.addEventListener("click", saveRace);
resetFormBtn.addEventListener("click", () => resetForm(true));
exportBtn.addEventListener("click", exportData);
clearAllBtn.addEventListener("click", clearAllData);
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);

function setMessage(text, type = "") {
  messageEl.textContent = text || "";
  messageEl.className = type ? "message " + type : "message";
}

function setAuthMessage(text, type = "") {
  authMessageEl.textContent = text || "";
  authMessageEl.className = type ? "message " + type : "message";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
  if (!dateString) return "Geen datum";
  return new Date(dateString + "T00:00:00").toLocaleDateString("nl-NL");
}

function getPoints(position) {
  return POINTS_MAP[position] || 0;
}

function updateAuthUi() {
  const loggedIn = !!currentUser;

  authStatus.textContent = loggedIn
    ? `🔓 Ingelogd als ${currentUser.email}`
    : "🔒 Niet ingelogd";

  raceNameInput.disabled = !loggedIn;
  raceDateInput.disabled = !loggedIn;
  emailInput.disabled = loggedIn;
  passwordInput.disabled = loggedIn;

  addSprint1DriverBtn.disabled = !loggedIn;
  addSprint2DriverBtn.disabled = !loggedIn;
  saveRaceBtn.disabled = !loggedIn;
  resetFormBtn.disabled = !loggedIn;
  clearAllBtn.disabled = !loggedIn;
  logoutBtn.disabled = !loggedIn;
  loginBtn.disabled = loggedIn;

  beheerCard.style.opacity = loggedIn ? "1" : "0.8";
  if (!loggedIn) {
    setMessage("Log in om races te kunnen toevoegen of verwijderen.", "");
  } else {
    setMessage("Je bent ingelogd en kunt gegevens wijzigen.", "success");
  }

  document.querySelectorAll(".driver-name, .driver-position, .remove-driver").forEach(el => {
    el.disabled = !loggedIn;
  });
}

function addDriverRow(targetList, name = "", position = "") {
  const row = document.createElement("div");
  row.className = "driver-row";
  row.innerHTML = `
    <div class="field">
      <label>Driver naam</label>
      <input type="text" class="driver-name" placeholder="Bijv. Max" value="${escapeHtml(name)}" />
    </div>
    <div class="field">
      <label>Positie</label>
      <input type="number" class="driver-position" min="1" max="22" placeholder="Bijv. 1" value="${position}" />
    </div>
    <div class="field">
      <label>Punten</label>
      <input type="number" class="driver-points-preview" disabled />
    </div>
    <button type="button" class="remove-driver">Verwijderen</button>
  `;

  const positionInput = row.querySelector(".driver-position");
  const pointsInput = row.querySelector(".driver-points-preview");
  const removeBtn = row.querySelector(".remove-driver");

  const updatePreview = () => {
    const pos = Number(positionInput.value);
    pointsInput.value = positionInput.value ? getPoints(pos) : "";
  };

  positionInput.addEventListener("input", updatePreview);
  removeBtn.addEventListener("click", () => {
    if (!currentUser) return;
    row.remove();
    if (!targetList.children.length) addDriverRow(targetList);
    updateAuthUi();
  });

  updatePreview();
  targetList.appendChild(row);
  updateAuthUi();
}

function getDriversFromList(targetList) {
  return [...targetList.querySelectorAll(".driver-row")]
    .map(row => {
      const name = row.querySelector(".driver-name").value.trim();
      const posText = row.querySelector(".driver-position").value.trim();
      const position = posText === "" ? NaN : Number(posText);
      return { name, position, points: getPoints(position) };
    })
    .filter(driver => driver.name !== "" || !Number.isNaN(driver.position));
}

function validateSprint(drivers, label) {
  if (!drivers.length) return `${label} heeft nog geen drivers.`;

  const invalid = drivers.find(d => !d.name || Number.isNaN(d.position) || d.position < 1 || d.position > 22);
  if (invalid) return `${label} heeft een driver zonder geldige naam of positie (1 t/m 22).`;

  const positions = drivers.map(d => d.position);
  for (let i = 0; i < positions.length; i++) {
    if (positions.indexOf(positions[i]) !== i) return `${label}: positie ${positions[i]} is dubbel ingevuld.`;
  }

  const names = drivers.map(d => d.name.toLowerCase());
  for (let i = 0; i < names.length; i++) {
    if (names.indexOf(names[i]) !== i) return `${label}: dezelfde driver staat dubbel.`;
  }

  return "";
}

function mergeResults(sprint1Drivers, sprint2Drivers) {
  const totals = {};

  sprint1Drivers.forEach(driver => {
    const key = driver.name.toLowerCase();
    if (!totals[key]) {
      totals[key] = { driver: driver.name, sprint1Position: "-", sprint2Position: "-", totalPoints: 0, bestSprint: 999 };
    }
    totals[key].driver = driver.name;
    totals[key].sprint1Position = driver.position;
    totals[key].totalPoints += driver.points;
    totals[key].bestSprint = Math.min(totals[key].bestSprint, driver.position);
  });

  sprint2Drivers.forEach(driver => {
    const key = driver.name.toLowerCase();
    if (!totals[key]) {
      totals[key] = { driver: driver.name, sprint1Position: "-", sprint2Position: "-", totalPoints: 0, bestSprint: 999 };
    }
    totals[key].driver = driver.name;
    totals[key].sprint2Position = driver.position;
    totals[key].totalPoints += driver.points;
    totals[key].bestSprint = Math.min(totals[key].bestSprint, driver.position);
  });

  return Object.values(totals);
}

async function login() {
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setAuthMessage("Vul e-mailadres en wachtwoord in.", "error");
      return;
    }

    await signInWithEmailAndPassword(auth, email, password);
    passwordInput.value = "";
    setAuthMessage("Succesvol ingelogd.", "success");
  } catch (error) {
    console.error(error);
    setAuthMessage("Inloggen mislukt. Controleer je gegevens of of Email/Password in Firebase aanstaat.", "error");
  }
}

async function logout() {
  try {
    await signOut(auth);
    setAuthMessage("Uitgelogd.", "success");
  } catch (error) {
    console.error(error);
    setAuthMessage("Uitloggen mislukt.", "error");
  }
}

async function saveRace() {
  if (!currentUser) {
    setMessage("Je moet ingelogd zijn om races op te slaan.", "error");
    return;
  }

  try {
    const raceName = raceNameInput.value.trim();
    const raceDate = raceDateInput.value;
    const sprint1Drivers = getDriversFromList(sprint1DriversList);
    const sprint2Drivers = getDriversFromList(sprint2DriversList);

    if (!raceName) return setMessage("Vul eerst een racenaam in.", "error");
    if (!raceDate) return setMessage("Kies eerst een datum.", "error");

    const sprint1Error = validateSprint(sprint1Drivers, "Sprint 1");
    if (sprint1Error) return setMessage(sprint1Error, "error");

    const sprint2Error = validateSprint(sprint2Drivers, "Sprint 2");
    if (sprint2Error) return setMessage(sprint2Error, "error");

    const results = mergeResults(sprint1Drivers, sprint2Drivers);
    const raceRef = push(ref(db, DB_PATH));

    await set(raceRef, {
      id: raceRef.key,
      name: raceName,
      date: raceDate,
      sprint1Drivers,
      sprint2Drivers,
      results,
      createdAt: Date.now(),
      createdBy: currentUser.email || currentUser.uid
    });

    resetForm(false);
    setMessage("Race succesvol opgeslagen.", "success");
  } catch (error) {
    console.error(error);
    setMessage("Opslaan mislukt. Check je Auth en Database rules.", "error");
  }
}

function resetForm(clearMessage = true) {
  raceNameInput.value = "";
  raceDateInput.value = "";
  sprint1DriversList.innerHTML = "";
  sprint2DriversList.innerHTML = "";
  addDriverRow(sprint1DriversList);
  addDriverRow(sprint1DriversList);
  addDriverRow(sprint2DriversList);
  addDriverRow(sprint2DriversList);
  if (clearMessage) setMessage("");
}

function renderSeasonStand() {
  const totals = {};

  races.forEach(race => {
    (race.results || []).forEach(result => {
      const key = result.driver.toLowerCase();
      if (!totals[key]) {
        totals[key] = { driver: result.driver, points: 0, races: 0, bestSprint: 999 };
      }
      totals[key].driver = result.driver;
      totals[key].points += Number(result.totalPoints || 0);
      totals[key].races += 1;
      totals[key].bestSprint = Math.min(totals[key].bestSprint, Number(result.bestSprint || 999));
    });
  });

  const sorted = Object.values(totals).sort((a, b) =>
    b.points - a.points || a.bestSprint - b.bestSprint || a.driver.localeCompare(b.driver, "nl")
  );

  if (!sorted.length) {
    seasonBody.innerHTML = '<tr><td colspan="5" class="empty">Nog geen data in de database.</td></tr>';
    return;
  }

  seasonBody.innerHTML = sorted.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.driver)}</td>
      <td>${row.points}</td>
      <td>${row.races}</td>
      <td>${row.bestSprint === 999 ? "-" : "P" + row.bestSprint}</td>
    </tr>
  `).join("");
}

function renderRaceTable() {
  const rows = [];

  races.forEach(race => {
    (race.results || []).forEach(result => {
      rows.push({
        driver: result.driver,
        race: race.name,
        sprint1: result.sprint1Position,
        sprint2: result.sprint2Position,
        totalPoints: result.totalPoints || 0
      });
    });
  });

  rows.sort((a, b) =>
    b.totalPoints - a.totalPoints || a.driver.localeCompare(b.driver, "nl")
  );

  if (!rows.length) {
    leaderboardBody.innerHTML = '<tr><td colspan="6" class="empty">Nog geen data in de database.</td></tr>';
    return;
  }

  leaderboardBody.innerHTML = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.driver)}</td>
      <td>${escapeHtml(row.race)}</td>
      <td>${row.sprint1}</td>
      <td>${row.sprint2}</td>
      <td>${row.totalPoints}</td>
    </tr>
  `).join("");
}

function renderHistory() {
  if (!races.length) {
    historyList.innerHTML = '<div class="empty">Nog geen racegeschiedenis beschikbaar.</div>';
    return;
  }

  historyList.innerHTML = races.map(race => {
    const sprint1Items = (race.sprint1Drivers || [])
      .slice()
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map(driver => `<li>P${driver.position} · ${escapeHtml(driver.name)} · ${driver.points} punten</li>`)
      .join("");

    const sprint2Items = (race.sprint2Drivers || [])
      .slice()
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map(driver => `<li>P${driver.position} · ${escapeHtml(driver.name)} · ${driver.points} punten</li>`)
      .join("");

    const deleteButton = currentUser
      ? `<button type="button" class="danger delete-race-btn" data-id="${race.id}">Race verwijderen</button>`
      : "";

    return `
      <article class="race-item">
        <div class="race-top">
          <div>
            <h3>${escapeHtml(race.name)}</h3>
            <div class="race-meta">${formatDate(race.date)} · 2 sprint races van 10 minuten</div>
          </div>
          ${deleteButton}
        </div>
        <div class="split-columns">
          <div><h4>Sprint 1</h4><ol class="race-drivers">${sprint1Items}</ol></div>
          <div><h4>Sprint 2</h4><ol class="race-drivers">${sprint2Items}</ol></div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".delete-race-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!currentUser) return;
      if (!confirm("Weet je zeker dat je deze race wilt verwijderen?")) return;
      try {
        await remove(ref(db, DB_PATH + "/" + btn.dataset.id));
        setMessage("Race verwijderd.", "success");
      } catch (error) {
        console.error(error);
        setMessage("Verwijderen mislukt. Check je rules.", "error");
      }
    });
  });
}

async function clearAllData() {
  if (!currentUser) {
    setMessage("Je moet ingelogd zijn om alles te wissen.", "error");
    return;
  }

  if (!confirm("Alles wissen? Alle races worden uit Firebase verwijderd.")) return;
  try {
    await remove(ref(db, DB_PATH));
    setMessage("Alle data is verwijderd.", "success");
  } catch (error) {
    console.error(error);
    setMessage("Wissen mislukt. Check je rules.", "error");
  }
}

function exportData() {
  if (!races.length) {
    setMessage("Geen data om te exporteren.", "error");
    return;
  }

  const blob = new Blob([JSON.stringify(races, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kart-competitie-backup.json";
  a.click();
  URL.revokeObjectURL(url);
  setMessage("Export gestart.", "success");
}

function subscribeToRaces() {
  onValue(ref(db, DB_PATH), snapshot => {
    const data = snapshot.val() || {};
    races = Object.values(data).sort((a, b) => new Date(b.date) - new Date(a.date));
    renderSeasonStand();
    renderRaceTable();
    renderHistory();
  }, error => {
    console.error(error);
    setMessage("Lezen uit Firebase mislukt. Check je rules.", "error");
  });
}

function monitorConnection() {
  onValue(ref(db, ".info/connected"), snapshot => {
    const connected = snapshot.val() === true;
    connectionStatus.textContent = connected ? "🟢 Live verbonden" : "🔴 Offline";
  }, error => {
    console.error(error);
    connectionStatus.textContent = "🔴 Offline";
  });
}

onAuthStateChanged(auth, user => {
  currentUser = user;
  updateAuthUi();
  renderHistory();
});

resetForm();
updateAuthUi();
subscribeToRaces();
monitorConnection();
