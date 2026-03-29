import { auth, db, DB_PATH, ref, push, set, remove, onValue, signOut, onAuthStateChanged, getPoints, formatDate, escapeHtml, mergeResults } from "./firebase.js";

const raceNameInput = document.getElementById("raceName");
const raceDateInput = document.getElementById("raceDate");
const sprint1DriversList = document.getElementById("sprint1DriversList");
const sprint2DriversList = document.getElementById("sprint2DriversList");
const messageEl = document.getElementById("message");
const leaderboardBody = document.getElementById("leaderboardBody");
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
const resetFormBtn = document.getElementById("resetFormBtn");
const exportBtn = document.getElementById("exportBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

let races = [];
let currentUser = null;
let editingRaceId = null;

function setMessage(text, type = "") { messageEl.textContent = text || ""; messageEl.className = type ? "message " + type : "message"; }
function updateAuthUi() { authStatus.textContent = currentUser ? `🔓 Ingelogd als ${currentUser.email}` : "🔒 Niet ingelogd"; }
function updateEditUi() {
  const editing = !!editingRaceId;
  formTitle.textContent = editing ? "Uitslag bewerken" : "Nieuwe race";
  editBadge.classList.toggle("hidden", !editing);
  cancelEditBtn.classList.toggle("hidden", !editing);
  saveRaceBtn.textContent = editing ? "Wijzigingen opslaan" : "Race opslaan";
}
function addDriverRow(targetList, name = "", position = "") {
  const row = document.createElement("div");
  row.className = "driver-row";
  row.innerHTML = `
    <div class="field"><label>Driver naam</label><input type="text" class="driver-name" placeholder="Bijv. Max" value="${escapeHtml(name)}" /></div>
    <div class="field"><label>Positie</label><input type="number" class="driver-position" min="1" max="22" placeholder="Bijv. 1" value="${position}" /></div>
    <div class="field"><label>Punten</label><input type="number" class="driver-points-preview" disabled /></div>
    <button type="button" class="remove-driver">Verwijderen</button>`;
  const positionInput = row.querySelector(".driver-position");
  const pointsInput = row.querySelector(".driver-points-preview");
  const updatePreview = () => { const pos = Number(positionInput.value); pointsInput.value = positionInput.value ? getPoints(pos) : ""; };
  positionInput.addEventListener("input", updatePreview);
  row.querySelector(".remove-driver").addEventListener("click", () => { row.remove(); if (!targetList.children.length) addDriverRow(targetList); });
  updatePreview();
  targetList.appendChild(row);
}
function getDriversFromList(targetList) {
  return [...targetList.querySelectorAll(".driver-row")].map(row => {
    const name = row.querySelector(".driver-name").value.trim();
    const posText = row.querySelector(".driver-position").value.trim();
    const position = posText === "" ? NaN : Number(posText);
    return { name, position, points: getPoints(position) };
  }).filter(driver => driver.name !== "" || !Number.isNaN(driver.position));
}
function validateSprint(drivers, label) {
  if (!drivers.length) return `${label} heeft nog geen drivers.`;
  const invalid = drivers.find(d => !d.name || Number.isNaN(d.position) || d.position < 1 || d.position > 22);
  if (invalid) return `${label} heeft een driver zonder geldige naam of positie (1 t/m 22).`;
  const positions = drivers.map(d => d.position);
  for (let i = 0; i < positions.length; i++) if (positions.indexOf(positions[i]) !== i) return `${label}: positie ${positions[i]} is dubbel ingevuld.`;
  const names = drivers.map(d => d.name.toLowerCase());
  for (let i = 0; i < names.length; i++) if (names.indexOf(names[i]) !== i) return `${label}: dezelfde driver staat dubbel.`;
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
async function saveRace() {
  if (!currentUser) return;
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
    const raceId = editingRaceId || push(ref(db, DB_PATH)).key;
    await set(ref(db, DB_PATH + "/" + raceId), { id: raceId, name: raceName, date: raceDate, sprint1Drivers, sprint2Drivers, results, createdAt: Date.now(), createdBy: currentUser.email || currentUser.uid });
    const wasEditing = !!editingRaceId;
    resetForm(false);
    setMessage(wasEditing ? "Uitslag succesvol bijgewerkt." : "Race succesvol opgeslagen.", "success");
  } catch (error) {
    console.error(error);
    setMessage("Opslaan mislukt. Check je Auth en Database rules.", "error");
  }
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
  const totals = {};
  races.forEach(race => {
    (race.results || []).forEach(result => {
      const key = result.driver.toLowerCase();
      if (!totals[key]) totals[key] = { driver: result.driver, points: 0, races: 0, bestSprint: 999 };
      totals[key].driver = result.driver;
      totals[key].points += Number(result.totalPoints || 0);
      totals[key].races += 1;
      totals[key].bestSprint = Math.min(totals[key].bestSprint, Number(result.bestSprint || 999));
    });
  });
  const sorted = Object.values(totals).sort((a, b) => b.points - a.points || a.bestSprint - b.bestSprint || a.driver.localeCompare(b.driver, "nl"));
  seasonBody.innerHTML = sorted.length ? sorted.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.driver)}</td><td>${row.points}</td><td>${row.races}</td><td>${row.bestSprint === 999 ? "-" : "P" + row.bestSprint}</td></tr>`).join("") : '<tr><td colspan="5" class="empty">Nog geen data in de database.</td></tr>';
}
function renderRaceTable() {
  const rows = [];
  races.forEach(race => (race.results || []).forEach(result => rows.push({ driver: result.driver, race: race.name, sprint1: result.sprint1Position, sprint2: result.sprint2Position, totalPoints: result.totalPoints || 0 })));
  rows.sort((a, b) => b.totalPoints - a.totalPoints || a.driver.localeCompare(b.driver, "nl"));
  leaderboardBody.innerHTML = rows.length ? rows.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.driver)}</td><td>${escapeHtml(row.race)}</td><td>${row.sprint1}</td><td>${row.sprint2}</td><td>${row.totalPoints}</td></tr>`).join("") : '<tr><td colspan="6" class="empty">Nog geen data in de database.</td></tr>';
}
function renderHistory() {
  if (!races.length) return historyList.innerHTML = '<div class="empty">Nog geen racegeschiedenis beschikbaar.</div>';
  historyList.innerHTML = races.map(race => {
    const s1 = (race.sprint1Drivers || []).slice().sort((a, b) => Number(a.position) - Number(b.position)).map(driver => `<li>P${driver.position} · ${escapeHtml(driver.name)} · ${driver.points} punten</li>`).join("");
    const s2 = (race.sprint2Drivers || []).slice().sort((a, b) => Number(a.position) - Number(b.position)).map(driver => `<li>P${driver.position} · ${escapeHtml(driver.name)} · ${driver.points} punten</li>`).join("");
    return `<article class="race-item"><div class="race-top"><div><h3>${escapeHtml(race.name)}</h3><div class="race-meta">${formatDate(race.date)} · 2 sprint races van 10 minuten</div></div><div class="race-actions"><button type="button" class="secondary edit-race-btn" data-id="${race.id}">Uitslag bewerken</button><button type="button" class="danger delete-race-btn" data-id="${race.id}">Race verwijderen</button></div></div><div class="split-columns"><div><h4>Sprint 1</h4><ol class="race-drivers">${s1}</ol></div><div><h4>Sprint 2</h4><ol class="race-drivers">${s2}</ol></div></div></article>`;
  }).join("");
  document.querySelectorAll(".edit-race-btn").forEach(btn => btn.addEventListener("click", () => {
    const race = races.find(r => r.id === btn.dataset.id);
    if (race) loadRaceIntoForm(race);
  }));
  document.querySelectorAll(".delete-race-btn").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Weet je zeker dat je deze race wilt verwijderen?")) return;
    try {
      await remove(ref(db, DB_PATH + "/" + btn.dataset.id));
      if (editingRaceId === btn.dataset.id) resetForm(false);
      setMessage("Race verwijderd.", "success");
    } catch (error) {
      console.error(error);
      setMessage("Verwijderen mislukt. Check je rules.", "error");
    }
  }));
}
async function clearAllData() {
  if (!confirm("Alles wissen? Alle races worden verwijderd.")) return;
  try { await remove(ref(db, DB_PATH)); resetForm(false); setMessage("Alle data is verwijderd.", "success"); }
  catch (error) { console.error(error); setMessage("Wissen mislukt.", "error"); }
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
resetFormBtn.addEventListener("click", () => resetForm(true));
cancelEditBtn.addEventListener("click", () => resetForm(true));
exportBtn.addEventListener("click", exportData);
clearAllBtn.addEventListener("click", clearAllData);
logoutBtn.addEventListener("click", async () => { await signOut(auth); window.location.href = "login.html"; });
onAuthStateChanged(auth, user => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  updateAuthUi();
});
onValue(ref(db, DB_PATH), snapshot => {
  const data = snapshot.val() || {};
  races = Object.values(data).sort((a, b) => new Date(b.date) - new Date(a.date));
  renderSeasonStand(); renderRaceTable(); renderHistory();
});
onValue(ref(db, ".info/connected"), snapshot => { connectionStatus.textContent = snapshot.val() === true ? "🟢 Live verbonden" : "🔴 Offline"; });
resetForm();
