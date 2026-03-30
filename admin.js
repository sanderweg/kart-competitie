import { auth, db, DB_PATH, ref, push, set, remove, onValue, signOut, onAuthStateChanged, getPoints, formatDate, escapeHtml, mergeResults, buildSeasonRows } from "./firebase.js";

const raceNameInput = document.getElementById("raceName");
const raceDateInput = document.getElementById("raceDate");
const sprint1DriversList = document.getElementById("sprint1DriversList");
const sprint2DriversList = document.getElementById("sprint2DriversList");
const messageEl = document.getElementById("message");
const leaderboardBody = document.getElementById("leaderboardBody");
const raceTabs = document.getElementById("raceTabs");
const seasonBody = document.getElementById("seasonBody");
const historyList = document.getElementById("historyList");
const connectionStatus = document.getElementById("connectionStatus");
const authStatus = document.getElementById("authStatus");
const formTitle = document.getElementById("formTitle");
const editBadge = document.getElementById("editBadge");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const logoutBtn = document.getElementById("logoutBtn");
const addSprint1DriverBtn = document.getElementById("addSprint1DriverBtn");
const addSprint2DriverBtn = document.getElementById("addSprint2DriverBtn");
const saveRaceBtn = document.getElementById("saveRaceBtn");
const saveDraftBtn = document.getElementById("saveDraftBtn");
const resetFormBtn = document.getElementById("resetFormBtn");
const exportBtn = document.getElementById("exportBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const driverSuggestions = document.getElementById("driverSuggestions");

let races = [];
let selectedRaceId = "all";
let currentUser = null;
let editingRaceId = null;

function setMessage(text, type = "") {
  messageEl.textContent = text || "";
  messageEl.className = type ? "message " + type : "message";
}

function updateAuthUi() {
  authStatus.textContent = currentUser ? `🔓 Ingelogd als ${currentUser.email}` : "🔒 Niet ingelogd";
}

function updateEditUi() {
  const editing = !!editingRaceId;
  formTitle.textContent = editing ? "Uitslag bewerken" : "Nieuwe race";
  editBadge.classList.toggle("hidden", !editing);
  cancelEditBtn.classList.toggle("hidden", !editing);
  saveRaceBtn.textContent = editing ? "Wijzigingen opslaan" : "Race opslaan";
}

function normalizeDriverName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function refreshDriverSuggestions() {
  if (!driverSuggestions) return;

  const seen = new Set();
  const names = [];

  races.filter(race => !race.isDraft).forEach(race => {
    [...(race.sprint1Drivers || []), ...(race.sprint2Drivers || [])].forEach(driver => {
      const clean = String(driver.name || "").trim().replace(/\s+/g, " ");
      const key = normalizeDriverName(clean);
      if (clean && !seen.has(key)) {
        seen.add(key);
        names.push(clean);
      }
    });
  });

  names.sort((a, b) => a.localeCompare(b, "nl"));
  driverSuggestions.innerHTML = names.map(name => `<option value="${escapeHtml(name)}"></option>`).join("");
}

function getDriverSuggestionNames() {
  const options = [...driverSuggestions.querySelectorAll("option")];
  return options.map(option => option.value).filter(Boolean);
}

function attachAutocompleteBehavior(input) {
  if (!input || input.dataset.autocompleteAttached === "true") return;
  input.dataset.autocompleteAttached = "true";

  input.addEventListener("input", () => {
    const typed = input.value;
    const cleanTyped = String(typed || "").replace(/\s+/g, " ").trim();
    if (!cleanTyped) return;

    const matches = getDriverSuggestionNames().filter(name =>
      normalizeDriverName(name).startsWith(normalizeDriverName(cleanTyped))
    );

    if (matches.length === 1) {
      const match = matches[0];
      if (normalizeDriverName(match) !== normalizeDriverName(cleanTyped)) {
        input.value = match;
        input.setSelectionRange(cleanTyped.length, match.length);
      }
    }
  });

  input.addEventListener("blur", () => {
    const typed = String(input.value || "").replace(/\s+/g, " ").trim();
    if (!typed) return;

    const exact = getDriverSuggestionNames().find(name =>
      normalizeDriverName(name) === normalizeDriverName(typed)
    );
    if (exact) {
      input.value = exact;
      return;
    }

    const starts = getDriverSuggestionNames().filter(name =>
      normalizeDriverName(name).startsWith(normalizeDriverName(typed))
    );
    if (starts.length === 1) {
      input.value = starts[0];
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" && event.key !== "Enter") return;

    const typed = String(input.value || "").replace(/\s+/g, " ").trim();
    if (!typed) return;

    const starts = getDriverSuggestionNames().filter(name =>
      normalizeDriverName(name).startsWith(normalizeDriverName(typed))
    );
    if (starts.length === 1) {
      input.value = starts[0];
    }
  });
}

function addDriverRow(targetList, name = "", position = "") {
  const row = document.createElement("div");
  row.className = "driver-row";
  row.innerHTML = `
    <div class="field">
      <label>Driver naam</label>
      <input type="text" class="driver-name" list="driverSuggestions" autocomplete="on" placeholder="Bijv. Max" value="${escapeHtml(name)}" />
    </div>
    <div class="field">
      <label>Positie</label>
      <input type="number" class="driver-position" min="0" max="22" placeholder="Bijv. 1" value="${position}" />
    </div>
    <div class="field">
      <label>Punten</label>
      <input type="number" class="driver-points-preview" disabled />
    </div>
    <button type="button" class="remove-driver">Verwijderen</button>
  `;

  const positionInput = row.querySelector(".driver-position");
  const pointsInput = row.querySelector(".driver-points-preview");

  const updatePreview = () => {
    const pos = Number(positionInput.value);
    pointsInput.value = positionInput.value !== "" ? getPoints(pos) : "";
  };

  positionInput.addEventListener("input", updatePreview);
  row.querySelector(".remove-driver").addEventListener("click", () => {
    row.remove();
    if (!targetList.children.length) addDriverRow(targetList);
  });

  updatePreview();
  targetList.appendChild(row);
}

function getDriversFromList(targetList) {
  return [...targetList.querySelectorAll(".driver-row")]
    .map(row => {
      const rawName = row.querySelector(".driver-name").value;
      const name = String(rawName || "").trim().replace(/\s+/g, " ");
      const posText = row.querySelector(".driver-position").value.trim();
      const position = posText === "" ? NaN : Number(posText);
      return { name, position, points: getPoints(position) };
    })
    .filter(driver => driver.name !== "" || !Number.isNaN(driver.position));
}

function validateSprint(drivers, label) {
  if (!drivers.length) return `${label} heeft nog geen drivers.`;

  const invalid = drivers.find(d => !d.name || Number.isNaN(d.position) || d.position < 0 || d.position > 22);
  if (invalid) return `${label} heeft een driver zonder geldige naam of positie (0 t/m 22).`;

  const positions = drivers.map(d => d.position).filter(p => p !== 0);
  for (let i = 0; i < positions.length; i++) {
    if (positions.indexOf(positions[i]) !== i) return `${label}: positie ${positions[i]} is dubbel ingevuld.`;
  }

  const names = drivers.map(d => d.name.toLowerCase());
  for (let i = 0; i < names.length; i++) {
    if (names.indexOf(names[i]) !== i) return `${label}: dezelfde driver staat dubbel.`;
  }

  return "";
}

function loadRaceIntoForm(race) {
  editingRaceId = race.id;
  raceNameInput.value = race.name || "";
  raceDateInput.value = race.date || "";
  sprint1DriversList.innerHTML = "";
  sprint2DriversList.innerHTML = "";

  (race.sprint1Drivers || []).forEach(driver => addDriverRow(sprint1DriversList, driver.name, driver.position));
  (race.sprint2Drivers || []).forEach(driver => addDriverRow(sprint2DriversList, driver.name, driver.position));

  if (!(race.sprint1Drivers || []).length) addDriverRow(sprint1DriversList);
  if (!(race.sprint2Drivers || []).length) addDriverRow(sprint2DriversList);

  updateEditUi();
  window.scrollTo({ top: 0, behavior: "smooth" });
  setMessage(`Je bewerkt nu: ${race.name}`, "success");
}


function validateDraftSprint(drivers, label) {
  if (!drivers.length) return `${label} heeft nog geen drivers.`;
  const invalidName = drivers.find(d => !d.name);
  if (invalidName) return `${label} heeft een driver zonder naam.`;

  const names = drivers.map(d => d.name.toLowerCase());
  for (let i = 0; i < names.length; i++) {
    if (names.indexOf(names[i]) !== i) return `${label}: dezelfde driver staat dubbel.`;
  }
  return "";
}

async function saveRaceWithMode(isDraft) {
  if (!currentUser) {
    setMessage("Log eerst in om races op te slaan.", "error");
    return;
  }

  try {
    const raceName = raceNameInput.value.trim();
    const raceDate = raceDateInput.value;
    const sprint1Drivers = getDriversFromList(sprint1DriversList);
    const sprint2Drivers = getDriversFromList(sprint2DriversList);

    if (!raceName) return setMessage("Vul eerst een racenaam in.", "error");
    if (!raceDate) return setMessage("Kies eerst een datum.", "error");

    const sprint1Error = isDraft ? validateDraftSprint(sprint1Drivers, "Sprint 1") : validateSprint(sprint1Drivers, "Sprint 1");
    if (sprint1Error) return setMessage(sprint1Error, "error");
    const sprint2Error = isDraft ? validateDraftSprint(sprint2Drivers, "Sprint 2") : validateSprint(sprint2Drivers, "Sprint 2");
    if (sprint2Error) return setMessage(sprint2Error, "error");

    const normalizedSprint1 = sprint1Drivers.map(d => ({
      ...d,
      position: Number.isNaN(d.position) ? "" : d.position,
      points: Number.isNaN(d.position) ? 0 : d.points
    }));
    const normalizedSprint2 = sprint2Drivers.map(d => ({
      ...d,
      position: Number.isNaN(d.position) ? "" : d.position,
      points: Number.isNaN(d.position) ? 0 : d.points
    }));

    const results = isDraft ? [] : mergeResults(normalizedSprint1, normalizedSprint2);
    const raceId = editingRaceId || push(ref(db, DB_PATH)).key;

    await set(ref(db, DB_PATH + "/" + raceId), {
      id: raceId,
      name: raceName,
      date: raceDate,
      sprint1Drivers: normalizedSprint1,
      sprint2Drivers: normalizedSprint2,
      results,
      isDraft,
      createdAt: Date.now(),
      createdBy: currentUser.email || currentUser.uid
    });

    const wasEditing = !!editingRaceId;
    resetForm(false);
    if (isDraft) {
      setMessage(wasEditing ? "Concept-race succesvol bijgewerkt." : "Concept-race opgeslagen.", "success");
    } else {
      setMessage(wasEditing ? "Uitslag succesvol bijgewerkt." : "Race succesvol opgeslagen.", "success");
    }
  } catch (error) {
    console.error(error);
    setMessage("Opslaan mislukt.", "error");
  }
}

async function saveRace() {
  await saveRaceWithMode(false);
}

function resetForm(clearMessage = true) {
  editingRaceId = null;
  raceNameInput.value = "";
  raceDateInput.value = "";
  sprint1DriversList.innerHTML = "";
  sprint2DriversList.innerHTML = "";
  addDriverRow(sprint1DriversList);
  addDriverRow(sprint1DriversList);
  addDriverRow(sprint2DriversList);
  addDriverRow(sprint2DriversList);
  updateEditUi();
  if (clearMessage) setMessage("");
}

function renderSeasonStand() {
  const rows = buildSeasonRows(races.filter(race => !race.isDraft));
  seasonBody.innerHTML = rows.length
    ? rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.driver)}</td>
        <td>${row.points}</td>
        <td>${row.sprints}</td>
        <td>${row.dropped}</td>
        <td>${row.bestSprint}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="6" class="empty">Nog geen data in de database.</td></tr>';
}


function renderRaceTabs() {
  if (!raceTabs) return;

  const eligibleRaces = races.filter(race => !race.isDraft);
  const tabs = [{ id: "all", label: "Alle races" }, ...eligibleRaces.map(race => ({ id: race.id, label: race.name }))];

  if (selectedRaceId !== "all" && !eligibleRaces.find(r => r.id === selectedRaceId)) {
    selectedRaceId = "all";
  }

  raceTabs.innerHTML = tabs.map(tab => `
    <button type="button" class="race-tab ${tab.id === selectedRaceId ? "active" : ""}" data-race-id="${tab.id}">
      ${escapeHtml(tab.label)}
    </button>
  `).join("");

  raceTabs.querySelectorAll(".race-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedRaceId = btn.dataset.raceId;
      renderRaceTabs();
      renderRaceTable();
    });
  });
}

function renderRaceTable() {
  const rows = [];
  const sourceRaces = races.filter(race => !race.isDraft).filter(race => selectedRaceId === "all" ? true : race.id === selectedRaceId);

  sourceRaces.forEach(race => {
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
    b.totalPoints - a.totalPoints ||
    a.driver.localeCompare(b.driver, "nl")
  );

  leaderboardBody.innerHTML = rows.length
    ? rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.driver)}</td>
        <td>${escapeHtml(row.race)}</td>
        <td>${row.sprint1}</td>
        <td>${row.sprint2}</td>
        <td>${row.totalPoints}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="6" class="empty">Geen data voor deze selectie.</td></tr>';
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

    return `
      <article class="race-item">
        <div class="race-top">
          <div>
            <h3>${escapeHtml(race.name)}</h3>
            <div class="race-meta">${formatDate(race.date)} · 2 sprint races van 10 minuten${race.isDraft ? " · Concept" : ""}</div>
          </div>
          <div class="race-actions">
            <button type="button" class="secondary edit-race-btn" data-id="${race.id}">Uitslag bewerken</button>
            <button type="button" class="danger delete-race-btn" data-id="${race.id}">Race verwijderen</button>
          </div>
        </div>
        <div class="split-columns">
          <div><h4>Sprint 1</h4><ol class="race-drivers">${sprint1Items}</ol></div>
          <div><h4>Sprint 2</h4><ol class="race-drivers">${sprint2Items}</ol></div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".edit-race-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const race = races.find(r => r.id === btn.dataset.id);
      if (race) loadRaceIntoForm(race);
    });
  });

  document.querySelectorAll(".delete-race-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Weet je zeker dat je deze race wilt verwijderen?")) return;
      try {
        await remove(ref(db, DB_PATH + "/" + btn.dataset.id));
        if (editingRaceId === btn.dataset.id) resetForm(false);
        setMessage("Race verwijderd.", "success");
      } catch (error) {
        console.error(error);
        setMessage("Verwijderen mislukt.", "error");
      }
    });
  });
}

async function clearAllData() {
  if (!confirm("Alles wissen? Alle races worden verwijderd.")) return;
  try {
    await remove(ref(db, DB_PATH));
    resetForm(false);
    setMessage("Alle data is verwijderd.", "success");
  } catch (error) {
    console.error(error);
    setMessage("Wissen mislukt.", "error");
  }
}

function exportData() {
  if (!races.length) return setMessage("Geen data om te exporteren.", "error");
  const blob = new Blob([JSON.stringify(races, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kart-competitie-backup.json";
  a.click();
  URL.revokeObjectURL(url);
  setMessage("Export gestart.", "success");
}

addSprint1DriverBtn.addEventListener("click", () => addDriverRow(sprint1DriversList));
addSprint2DriverBtn.addEventListener("click", () => addDriverRow(sprint2DriversList));
saveRaceBtn.addEventListener("click", saveRace);
saveDraftBtn.addEventListener("click", () => saveRaceWithMode(true));
resetFormBtn.addEventListener("click", () => resetForm(true));
cancelEditBtn.addEventListener("click", () => resetForm(true));
exportBtn.addEventListener("click", exportData);
clearAllBtn.addEventListener("click", clearAllData);
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  updateAuthUi();
});

onValue(ref(db, DB_PATH), snapshot => {
  const data = snapshot.val() || {};
  races = Object.values(data).sort((a, b) => new Date(a.date) - new Date(b.date));
  renderSeasonStand();
  renderRaceTabs();
  renderRaceTable();
  renderHistory();
  refreshDriverSuggestions();
});

onValue(ref(db, ".info/connected"), snapshot => {
  connectionStatus.textContent = snapshot.val() === true ? "🟢 Live verbonden" : "🔴 Offline";
});

resetForm();