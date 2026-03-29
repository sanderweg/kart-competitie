const STORAGE_KEY = "kart_competitie_races_v5";
const POINTS_MAP = {
  1: 25, 2: 22, 3: 20, 4: 19, 5: 18, 6: 17, 7: 16, 8: 15, 9: 14, 10: 13, 11: 12,
  12: 11, 13: 10, 14: 9, 15: 8, 16: 7, 17: 6, 18: 5, 19: 4, 20: 3, 21: 2, 22: 1
};

let races = loadRaces();

const raceNameInput = document.getElementById("raceName");
const raceDateInput = document.getElementById("raceDate");
const driversList = document.getElementById("driversList");
const messageEl = document.getElementById("message");
const leaderboardBody = document.getElementById("leaderboardBody");
const historyList = document.getElementById("historyList");
const importInput = document.getElementById("importInput");

document.getElementById("addDriverBtn").addEventListener("click", function () { addDriverRow(); });
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

function setMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = type ? "message " + type : "message";
}

function formatDate(dateString) {
  if (!dateString) return "Geen datum";
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("nl-NL");
}

function getPointsForPosition(position) {
  return POINTS_MAP[position] || 0;
}

function addDriverRow(name, position) {
  const safeName = name || "";
  const safePosition = position || "";

  const row = document.createElement("div");
  row.className = "driver-row";
  row.innerHTML = `
    <div class="field">
      <label>Driver naam</label>
      <input type="text" class="driver-name" placeholder="Bijv. Max" value="${escapeHtml(safeName)}" />
    </div>
    <div class="field">
      <label>Positie</label>
      <input type="number" class="driver-position" placeholder="Bijv. 1" min="1" max="22" value="${safePosition}" />
    </div>
    <div class="field">
      <label>Punten</label>
      <input type="number" class="driver-points-preview" value="" disabled />
    </div>
    <button type="button" class="remove-driver">Verwijderen</button>
  `;

  const positionInput = row.querySelector(".driver-position");
  const pointsPreview = row.querySelector(".driver-points-preview");

  function updatePreview() {
    const positionNumber = Number(positionInput.value);
    pointsPreview.value = positionInput.value ? getPointsForPosition(positionNumber) : "";
  }

  positionInput.addEventListener("input", updatePreview);
  updatePreview();

  row.querySelector(".remove-driver").addEventListener("click", function () {
    row.remove();
    if (!driversList.children.length) addDriverRow();
  });

  driversList.appendChild(row);
}

function getDriversFromForm() {
  const rows = Array.from(driversList.querySelectorAll(".driver-row"));
  return rows.map(function (row) {
    const name = row.querySelector(".driver-name").value.trim();
    const positionValue = row.querySelector(".driver-position").value.trim();
    const position = positionValue === "" ? NaN : Number(positionValue);
    return {
      name: name,
      position: position,
      points: getPointsForPosition(position)
    };
  }).filter(function (driver) {
    return driver.name !== "" || !Number.isNaN(driver.position);
  });
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

  const invalidDriver = drivers.find(function (driver) {
    return !driver.name || Number.isNaN(driver.position) || driver.position < 1 || driver.position > 22;
  });

  if (invalidDriver) {
    setMessage("Elke driver moet een naam en een positie tussen 1 en 22 hebben.", "error");
    return;
  }

  const positions = drivers.map(function (driver) { return driver.position; });
  const duplicatePosition = positions.find(function (pos, index) {
    return positions.indexOf(pos) !== index;
  });

  if (duplicatePosition) {
    setMessage("Positie " + duplicatePosition + " is dubbel ingevuld.", "error");
    return;
  }

  const driverNames = drivers.map(function (driver) { return driver.name.toLowerCase(); });
  const duplicateDriver = driverNames.find(function (name, index) {
    return driverNames.indexOf(name) !== index;
  });

  if (duplicateDriver) {
    setMessage("Dezelfde driver staat dubbel in deze race.", "error");
    return;
  }

  const race = {
    id: cryptoRandomId(),
    name: raceName,
    date: raceDate,
    drivers: drivers
  };

  races.push(race);
  races.sort(function (a, b) {
    return new Date(b.date) - new Date(a.date);
  });

  persist();
  render();
  resetForm(false);
  setMessage("Race succesvol opgeslagen.", "success");
}

function resetForm(clearMessage) {
  if (clearMessage === undefined) clearMessage = true;
  raceNameInput.value = "";
  raceDateInput.value = "";
  driversList.innerHTML = "";
  addDriverRow();
  addDriverRow();
  if (clearMessage) setMessage("", "");
}

function buildLeaderboardRows() {
  const rows = [];

  races.forEach(function (race) {
    race.drivers.forEach(function (driver) {
      const position = Number(driver.position);
      rows.push({
        driver: driver.name,
        race: race.name,
        position: position,
        points: getPointsForPosition(position),
        date: race.date
      });
    });
  });

  rows.sort(function (a, b) {
    if (b.points !== a.points) return b.points - a.points;
    if (a.position !== b.position) return a.position - b.position;
    if (new Date(b.date).getTime() !== new Date(a.date).getTime()) return new Date(b.date) - new Date(a.date);
    return a.driver.localeCompare(b.driver, "nl");
  });

  return rows;
}

function renderLeaderboard() {
  const rows = buildLeaderboardRows();

  if (!rows.length) {
    leaderboardBody.innerHTML = '<tr><td colspan="5" class="empty">Nog geen races opgeslagen.</td></tr>';
    return;
  }

  leaderboardBody.innerHTML = rows.map(function (row, index) {
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.driver)}</td>
        <td>${escapeHtml(row.race)}</td>
        <td>P${row.position}</td>
        <td>${row.points}</td>
      </tr>
    `;
  }).join("");
}

function renderHistory() {
  if (!races.length) {
    historyList.innerHTML = '<div class="empty">Nog geen racegeschiedenis beschikbaar.</div>';
    return;
  }

  historyList.innerHTML = races.map(function (race) {
    const items = race.drivers.slice().sort(function (a, b) {
      return Number(a.position) - Number(b.position);
    }).map(function (driver) {
      const position = Number(driver.position);
      return `<li>P${position} · ${escapeHtml(driver.name)} · ${getPointsForPosition(position)} punten</li>`;
    }).join("");

    return `
      <article class="race-item">
        <div class="race-top">
          <div>
            <h3>${escapeHtml(race.name)}</h3>
            <div class="race-meta">${formatDate(race.date)} · ${race.drivers.length} drivers</div>
          </div>
          <button type="button" class="danger" onclick="deleteRace('${race.id}')">Race verwijderen</button>
        </div>
        <ol class="race-drivers">${items}</ol>
      </article>
    `;
  }).join("");
}

function deleteRace(id) {
  const confirmed = window.confirm("Weet je zeker dat je deze race wilt verwijderen?");
  if (!confirmed) return;

  races = races.filter(function (race) {
    return race.id !== id;
  });

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
  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error("Bestand bevat geen race-lijst.");

      races = imported.map(function (race) {
        return {
          id: race.id || cryptoRandomId(),
          name: race.name || "Onbekende race",
          date: race.date || "",
          drivers: Array.isArray(race.drivers) ? race.drivers.map(function (driver) {
            return {
              name: driver.name || "",
              position: Number(driver.position),
              points: getPointsForPosition(Number(driver.position))
            };
          }) : []
        };
      });

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
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return "race_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

resetForm();
render();
