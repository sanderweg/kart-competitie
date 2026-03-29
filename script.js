const STORAGE_KEY = "kart_competitie_races_v2";
let races = loadRaces();

const raceNameInput = document.getElementById("raceName");
const raceDateInput = document.getElementById("raceDate");
const driversList = document.getElementById("driversList");
const messageEl = document.getElementById("message");
const leaderboardBody = document.getElementById("leaderboardBody");
const historyList = document.getElementById("historyList");
const importInput = document.getElementById("importInput");

document.getElementById("addDriverBtn").addEventListener("click", () => addDriverRow());
document.getElementById("saveRaceBtn").addEventListener("click", saveRace);
document.getElementById("resetFormBtn").addEventListener("click", resetForm);
document.getElementById("exportBtn").addEventListener("click", exportData);
document.getElementById("clearAllBtn").addEventListener("click", clearAllData);
importInput.addEventListener("change", importData);

function loadRaces() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Fout bij laden van races:", error);
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(races));
}

function setMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = "message" + (type ? ` ${type}` : "");
}

function formatDate(dateString) {
  if (!dateString) return "Geen datum";
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("nl-NL");
}

function addDriverRow(name = "", points = "") {
  const row = document.createElement("div");
  row.className = "driver-row";
  row.innerHTML = `
    <div class="field">
      <label>Driver naam</label>
      <input type="text" class="driver-name" placeholder="Bijv. Max" value="${escapeHtml(name)}" />
    </div>
    <div class="field">
      <label>Punten</label>
      <input type="number" class="driver-points" placeholder="Bijv. 25" min="0" value="${points}" />
    </div>
    <button type="button" class="remove-driver">Verwijderen</button>
  `;
  row.querySelector(".remove-driver").addEventListener("click", () => {
    row.remove();
    if (!driversList.children.length) addDriverRow();
  });
  driversList.appendChild(row);
}

function getDriversFromForm() {
  const rows = [...driversList.querySelectorAll(".driver-row")];
  return rows
    .map(row => {
      const name = row.querySelector(".driver-name").value.trim();
      const pointsValue = row.querySelector(".driver-points").value.trim();
      return {
        name,
        points: pointsValue === "" ? NaN : Number(pointsValue)
      };
    })
    .filter(driver => driver.name !== "" || !Number.isNaN(driver.points));
}

function saveRace() {
  const raceName = raceNameInput.value.trim();
  const raceDate = raceDateInput.value;
  const drivers = getDriversFromForm();

  if (!raceName) {
    setMessage("Vul eerst een racenaam in.", "error");
    return;
  }

  if (!raceDate) {
    setMessage("Kies eerst een datum.", "error");
    return;
  }

  if (!drivers.length) {
    setMessage("Voeg minimaal 1 driver toe.", "error");
    return;
  }

  const invalidDriver = drivers.find(driver => !driver.name || Number.isNaN(driver.points) || driver.points < 0);
  if (invalidDriver) {
    setMessage("Elke driver moet een naam en geldige punten hebben.", "error");
    return;
  }

  const race = {
    id: cryptoRandomId(),
    name: raceName,
    date: raceDate,
    drivers
  };

  races.push(race);
  races.sort((a, b) => new Date(b.date) - new Date(a.date));
  persist();
  render();
  resetForm(false);
  setMessage("Race succesvol opgeslagen.", "success");
}

function resetForm(clearMessage = true) {
  raceNameInput.value = "";
  raceDateInput.value = "";
  driversList.innerHTML = "";
  addDriverRow();
  addDriverRow();
  if (clearMessage) setMessage("");
}

function render() {
  renderLeaderboard();
  renderHistory();
}

function renderLeaderboard() {
  const totals = {};

  races.forEach(race => {
    race.drivers.forEach(driver => {
      if (!totals[driver.name]) {
        totals[driver.name] = { points: 0, races: 0 };
      }
      totals[driver.name].points += Number(driver.points) || 0;
      totals[driver.name].races += 1;
    });
  });

  const sorted = Object.entries(totals)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.points - a.points || b.races - a.races || a.name.localeCompare(b.name, "nl"));

  if (!sorted.length) {
    leaderboardBody.innerHTML = `<tr><td colspan="4" class="empty">Nog geen races opgeslagen.</td></tr>`;
    return;
  }

  leaderboardBody.innerHTML = sorted.map((driver, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(driver.name)}</td>
      <td>${driver.points}</td>
      <td>${driver.races}</td>
    </tr>
  `).join("");
}

function renderHistory() {
  if (!races.length) {
    historyList.innerHTML = `<div class="empty">Nog geen racegeschiedenis beschikbaar.</div>`;
    return;
  }

  historyList.innerHTML = races.map(race => `
    <article class="race-item">
      <div class="race-top">
        <div>
          <h3>${escapeHtml(race.name)}</h3>
          <div class="race-meta">${formatDate(race.date)} · ${race.drivers.length} drivers</div>
        </div>
        <button type="button" class="danger" onclick="deleteRace('${race.id}')">Race verwijderen</button>
      </div>
      <ol class="race-drivers">
        ${[...race.drivers]
          .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "nl"))
          .map(driver => `<li>${escapeHtml(driver.name)} - ${driver.points} punten</li>`)
          .join("")}
      </ol>
    </article>
  `).join("");
}

function deleteRace(id) {
  const confirmed = window.confirm("Weet je zeker dat je deze race wilt verwijderen?");
  if (!confirmed) return;
  races = races.filter(race => race.id !== id);
  persist();
  render();
  setMessage("Race verwijderd.", "success");
}

function clearAllData() {
  if (!races.length) return;
  const confirmed = window.confirm("Alles wissen? Alle races en leaderboard-data worden verwijderd.");
  if (!confirmed) return;
  races = [];
  persist();
  render();
  setMessage("Alle data is verwijderd.", "success");
}

function exportData() {
  const blob = new Blob([JSON.stringify(races, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kart-competitie-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error("Bestand bevat geen race-lijst.");
      races = imported;
      persist();
      render();
      setMessage("Data succesvol geïmporteerd.", "success");
    } catch (error) {
      console.error(error);
      setMessage("Import mislukt. Controleer of je een geldig JSON-bestand hebt gekozen.", "error");
    } finally {
      importInput.value = "";
    }
  };
  reader.readAsText(file);
}

function cryptoRandomId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "race_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

resetForm();
render();
