import { db, DB_PATH, ref, onValue, formatDate, escapeHtml } from "./firebase.js";
const connectionStatus = document.getElementById("connectionStatus");
const seasonBody = document.getElementById("seasonBody");
const leaderboardBody = document.getElementById("leaderboardBody");
const historyList = document.getElementById("historyList");
let races = [];
function buildSeasonRows(races) {
  const allDrivers = {};
  const raceCount = races.length;

  races.forEach((race, raceIndex) => {
    (race.results || []).forEach(result => {
      const key = result.driver.toLowerCase();
      if (!allDrivers[key]) {
        allDrivers[key] = { driver: result.driver, bestSprint: 999, racePoints: Array(raceCount).fill(0) };
      }
      allDrivers[key].driver = result.driver;
      allDrivers[key].racePoints[raceIndex] = Number(result.totalPoints || 0);
      allDrivers[key].bestSprint = Math.min(allDrivers[key].bestSprint, Number(result.bestSprint || 999));
    });
  });

  return Object.values(allDrivers).map(driver => {
    const sortedRacePoints = [...driver.racePoints].sort((a, b) => a - b);
    const droppedRace = sortedRacePoints.length ? sortedRacePoints[0] : 0;
    const countedPoints = sortedRacePoints.slice(1).reduce((sum, p) => sum + p, 0);
    return {
      driver: driver.driver,
      points: countedPoints,
      races: raceCount,
      droppedRace,
      bestSprint: driver.bestSprint
    };
  }).sort((a, b) => b.points - a.points || a.bestSprint - b.bestSprint || a.driver.localeCompare(b.driver, "nl"));
}

function renderSeasonStand() {
  const rows = buildSeasonRows(races);
  seasonBody.innerHTML = rows.length ? rows.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.driver)}</td><td>${row.points}</td><td>${row.races}</td><td>${row.droppedRace}</td><td>${row.bestSprint === 999 ? "-" : "P" + row.bestSprint}</td></tr>`).join("") : '<tr><td colspan="6" class="empty">Nog geen data beschikbaar.</td></tr>';
}
function renderRaceTable() {
  const rows = [];
  races.forEach(race => (race.results || []).forEach(result => rows.push({ driver: result.driver, race: race.name, sprint1: result.sprint1Position, sprint2: result.sprint2Position, totalPoints: result.totalPoints || 0 })));
  rows.sort((a, b) => b.totalPoints - a.totalPoints || a.driver.localeCompare(b.driver, "nl"));
  leaderboardBody.innerHTML = rows.length ? rows.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.driver)}</td><td>${escapeHtml(row.race)}</td><td>${row.sprint1}</td><td>${row.sprint2}</td><td>${row.totalPoints}</td></tr>`).join("") : '<tr><td colspan="6" class="empty">Nog geen data beschikbaar.</td></tr>';
}
function renderHistory() {
  if (!races.length) return historyList.innerHTML = '<div class="empty">Nog geen racegeschiedenis beschikbaar.</div>';
  historyList.innerHTML = races.map(race => {
    const s1 = (race.sprint1Drivers || []).slice().sort((a, b) => Number(a.position) - Number(b.position)).map(driver => `<li>P${driver.position} · ${escapeHtml(driver.name)} · ${driver.points} punten</li>`).join("");
    const s2 = (race.sprint2Drivers || []).slice().sort((a, b) => Number(a.position) - Number(b.position)).map(driver => `<li>P${driver.position} · ${escapeHtml(driver.name)} · ${driver.points} punten</li>`).join("");
    return `<article class="race-item"><div class="race-top"><div><h3>${escapeHtml(race.name)}</h3><div class="race-meta">${formatDate(race.date)} · 2 sprint races van 10 minuten</div></div></div><div class="split-columns"><div><h4>Sprint 1</h4><ol class="race-drivers">${s1}</ol></div><div><h4>Sprint 2</h4><ol class="race-drivers">${s2}</ol></div></div></article>`;
  }).join("");
}
onValue(ref(db, DB_PATH), snapshot => {
  const data = snapshot.val() || {};
  races = Object.values(data).sort((a, b) => new Date(a.date) - new Date(b.date));
  renderSeasonStand(); renderRaceTable(); renderHistory();
});
onValue(ref(db, ".info/connected"), snapshot => { connectionStatus.textContent = snapshot.val() === true ? "🟢 Live verbonden" : "🔴 Offline"; });
