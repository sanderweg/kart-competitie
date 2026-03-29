document.addEventListener('DOMContentLoaded', function () {
  var STORAGE_KEY = 'kart_competitie_races_2sprints_v1';
  var POINTS_MAP = {1:25,2:22,3:20,4:19,5:18,6:17,7:16,8:15,9:14,10:13,11:12,12:11,13:10,14:9,15:8,16:7,17:6,18:5,19:4,20:3,21:2,22:1};
  var races = loadRaces();

  var raceNameInput = document.getElementById('raceName');
  var raceDateInput = document.getElementById('raceDate');
  var sprint1DriversList = document.getElementById('sprint1DriversList');
  var sprint2DriversList = document.getElementById('sprint2DriversList');
  var messageEl = document.getElementById('message');
  var leaderboardBody = document.getElementById('leaderboardBody');
  var historyList = document.getElementById('historyList');
  var importInput = document.getElementById('importInput');

  document.getElementById('addSprint1DriverBtn').addEventListener('click', function () { addDriverRow(sprint1DriversList, '', ''); });
  document.getElementById('addSprint2DriverBtn').addEventListener('click', function () { addDriverRow(sprint2DriversList, '', ''); });
  document.getElementById('saveRaceBtn').addEventListener('click', saveRace);
  document.getElementById('resetFormBtn').addEventListener('click', function () { resetForm(true); });
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllData);
  importInput.addEventListener('change', importData);

  function loadRaces() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(races));
  }

  function setMessage(text, type) {
    messageEl.textContent = text || '';
    messageEl.className = type ? 'message ' + type : 'message';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getPointsForPosition(position) {
    return POINTS_MAP[position] || 0;
  }

  function formatDate(dateString) {
    if (!dateString) return 'Geen datum';
    var date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('nl-NL');
  }

  function makeId() {
    return 'race_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function addDriverRow(targetList, name, position) {
    var row = document.createElement('div');
    row.className = 'driver-row';
    row.innerHTML =
      '<div class="field"><label>Driver naam</label><input type="text" class="driver-name" placeholder="Bijv. Max" value="' + escapeHtml(name || '') + '"></div>' +
      '<div class="field"><label>Positie</label><input type="number" class="driver-position" placeholder="Bijv. 1" min="1" max="22" value="' + escapeHtml(position || '') + '"></div>' +
      '<div class="field"><label>Punten</label><input type="number" class="driver-points-preview" disabled></div>' +
      '<button type="button" class="remove-driver">Verwijderen</button>';

    var positionInput = row.querySelector('.driver-position');
    var pointsInput = row.querySelector('.driver-points-preview');
    var removeBtn = row.querySelector('.remove-driver');

    function updatePoints() {
      var positionNumber = Number(positionInput.value);
      pointsInput.value = positionInput.value ? getPointsForPosition(positionNumber) : '';
    }

    positionInput.addEventListener('input', updatePoints);
    removeBtn.addEventListener('click', function () {
      row.remove();
      if (!targetList.children.length) addDriverRow(targetList, '', '');
    });

    updatePoints();
    targetList.appendChild(row);
  }

  function getDriversFromList(targetList) {
    var rows = Array.prototype.slice.call(targetList.querySelectorAll('.driver-row'));
    return rows.map(function (row) {
      var name = row.querySelector('.driver-name').value.trim();
      var posText = row.querySelector('.driver-position').value.trim();
      var position = posText === '' ? NaN : Number(posText);
      return { name: name, position: position, points: getPointsForPosition(position) };
    }).filter(function (driver) {
      return driver.name !== '' || !Number.isNaN(driver.position);
    });
  }

  function validateSprintDrivers(drivers, sprintLabel) {
    if (!drivers.length) return sprintLabel + ' heeft nog geen drivers.';
    var invalidDriver = drivers.find(function (driver) {
      return !driver.name || Number.isNaN(driver.position) || driver.position < 1 || driver.position > 22;
    });
    if (invalidDriver) return sprintLabel + ' heeft een driver zonder geldige naam of positie (1 t/m 22).';

    var positions = drivers.map(function (driver) { return driver.position; });
    for (var i = 0; i < positions.length; i++) {
      if (positions.indexOf(positions[i]) !== i) return sprintLabel + ': positie ' + positions[i] + ' is dubbel ingevuld.';
    }

    var names = drivers.map(function (driver) { return driver.name.toLowerCase(); });
    for (var j = 0; j < names.length; j++) {
      if (names.indexOf(names[j]) !== j) return sprintLabel + ': dezelfde driver staat dubbel.';
    }

    return '';
  }

  function mergeSprintResults(sprint1Drivers, sprint2Drivers) {
    var totals = {};

    sprint1Drivers.forEach(function (driver) {
      var key = driver.name.toLowerCase();
      if (!totals[key]) {
        totals[key] = { driver: driver.name, sprint1Position: '', sprint1Points: 0, sprint2Position: '', sprint2Points: 0, totalPoints: 0 };
      }
      totals[key].driver = driver.name;
      totals[key].sprint1Position = driver.position;
      totals[key].sprint1Points = driver.points;
      totals[key].totalPoints += driver.points;
    });

    sprint2Drivers.forEach(function (driver) {
      var key = driver.name.toLowerCase();
      if (!totals[key]) {
        totals[key] = { driver: driver.name, sprint1Position: '', sprint1Points: 0, sprint2Position: '', sprint2Points: 0, totalPoints: 0 };
      }
      totals[key].driver = driver.name;
      totals[key].sprint2Position = driver.position;
      totals[key].sprint2Points = driver.points;
      totals[key].totalPoints += driver.points;
    });

    return Object.keys(totals).map(function (key) { return totals[key]; });
  }

  function saveRace() {
    try {
      var raceName = raceNameInput.value.trim();
      var raceDate = raceDateInput.value;
      var sprint1Drivers = getDriversFromList(sprint1DriversList);
      var sprint2Drivers = getDriversFromList(sprint2DriversList);

      if (!raceName) { setMessage('Vul eerst een racenaam in.', 'error'); return; }
      if (!raceDate) { setMessage('Kies eerst een datum.', 'error'); return; }

      var sprint1Error = validateSprintDrivers(sprint1Drivers, 'Sprint 1');
      if (sprint1Error) { setMessage(sprint1Error, 'error'); return; }

      var sprint2Error = validateSprintDrivers(sprint2Drivers, 'Sprint 2');
      if (sprint2Error) { setMessage(sprint2Error, 'error'); return; }

      var mergedResults = mergeSprintResults(sprint1Drivers, sprint2Drivers);

      races.push({
        id: makeId(),
        name: raceName,
        date: raceDate,
        sprint1Drivers: sprint1Drivers,
        sprint2Drivers: sprint2Drivers,
        results: mergedResults
      });

      races.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      persist();
      render();
      resetForm(false);
      setMessage('Race met 2 sprints succesvol opgeslagen.', 'success');
    } catch (e) {
      console.error(e);
      setMessage('Opslaan mislukt door een scriptfout.', 'error');
    }
  }

  function resetForm(clearMessage) {
    raceNameInput.value = '';
    raceDateInput.value = '';
    sprint1DriversList.innerHTML = '';
    sprint2DriversList.innerHTML = '';
    addDriverRow(sprint1DriversList, '', '');
    addDriverRow(sprint1DriversList, '', '');
    addDriverRow(sprint2DriversList, '', '');
    addDriverRow(sprint2DriversList, '', '');
    if (clearMessage) setMessage('', '');
  }

  function buildLeaderboardRows() {
    var rows = [];
    races.forEach(function (race) {
      (race.results || []).forEach(function (result) {
        rows.push({
          driver: result.driver,
          race: race.name,
          sprint1Position: result.sprint1Position || '-',
          sprint2Position: result.sprint2Position || '-',
          totalPoints: result.totalPoints || 0,
          date: race.date
        });
      });
    });

    rows.sort(function (a, b) {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (a.sprint1Position !== '-' && b.sprint1Position !== '-' && a.sprint1Position !== b.sprint1Position) return a.sprint1Position - b.sprint1Position;
      return a.driver.localeCompare(b.driver, 'nl');
    });

    return rows;
  }

  function renderLeaderboard() {
    var rows = buildLeaderboardRows();
    if (!rows.length) {
      leaderboardBody.innerHTML = '<tr><td colspan="6" class="empty">Nog geen races opgeslagen.</td></tr>';
      return;
    }
    leaderboardBody.innerHTML = rows.map(function (row, index) {
      return '<tr><td>' + (index + 1) + '</td><td>' + escapeHtml(row.driver) + '</td><td>' + escapeHtml(row.race) + '</td><td>' + row.sprint1Position + '</td><td>' + row.sprint2Position + '</td><td>' + row.totalPoints + '</td></tr>';
    }).join('');
  }

  function renderHistory() {
    if (!races.length) {
      historyList.innerHTML = '<div class="empty">Nog geen racegeschiedenis beschikbaar.</div>';
      return;
    }

    historyList.innerHTML = races.map(function (race) {
      var sprint1Items = (race.sprint1Drivers || []).slice().sort(function (a, b) { return Number(a.position) - Number(b.position); }).map(function (driver) {
        return '<li>P' + driver.position + ' · ' + escapeHtml(driver.name) + ' · ' + driver.points + ' punten</li>';
      }).join('');

      var sprint2Items = (race.sprint2Drivers || []).slice().sort(function (a, b) { return Number(a.position) - Number(b.position); }).map(function (driver) {
        return '<li>P' + driver.position + ' · ' + escapeHtml(driver.name) + ' · ' + driver.points + ' punten</li>';
      }).join('');

      return '<article class="race-item">' +
        '<div class="race-top"><div><h3>' + escapeHtml(race.name) + '</h3><div class="race-meta">' + formatDate(race.date) + ' · 2 sprint races van 10 minuten</div></div><button type="button" class="danger delete-race-btn" data-id="' + race.id + '">Race verwijderen</button></div>' +
        '<div class="split-columns">' +
          '<div><h4>Sprint 1</h4><ol class="race-drivers">' + sprint1Items + '</ol></div>' +
          '<div><h4>Sprint 2</h4><ol class="race-drivers">' + sprint2Items + '</ol></div>' +
        '</div>' +
      '</article>';
    }).join('');

    Array.prototype.slice.call(document.querySelectorAll('.delete-race-btn')).forEach(function (btn) {
      btn.addEventListener('click', function () { deleteRace(btn.getAttribute('data-id')); });
    });
  }

  function deleteRace(id) {
    if (!window.confirm('Weet je zeker dat je deze race wilt verwijderen?')) return;
    races = races.filter(function (race) { return race.id !== id; });
    persist();
    render();
    setMessage('Race verwijderd.', 'success');
  }

  function clearAllData() {
    if (!races.length) return;
    if (!window.confirm('Alles wissen? Alle races en leaderboard-data worden verwijderd.')) return;
    races = [];
    persist();
    render();
    setMessage('Alle data is verwijderd.', 'success');
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(races, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'kart-competitie-2-sprints-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) throw new Error('Geen geldige array');
        races = imported.map(function (race) {
          var sprint1Drivers = Array.isArray(race.sprint1Drivers) ? race.sprint1Drivers.map(function (driver) {
            return { name: driver.name || '', position: Number(driver.position), points: getPointsForPosition(Number(driver.position)) };
          }) : [];
          var sprint2Drivers = Array.isArray(race.sprint2Drivers) ? race.sprint2Drivers.map(function (driver) {
            return { name: driver.name || '', position: Number(driver.position), points: getPointsForPosition(Number(driver.position)) };
          }) : [];
          return {
            id: race.id || makeId(),
            name: race.name || 'Onbekende race',
            date: race.date || '',
            sprint1Drivers: sprint1Drivers,
            sprint2Drivers: sprint2Drivers,
            results: mergeSprintResults(sprint1Drivers, sprint2Drivers)
          };
        });
        persist();
        render();
        setMessage('Data succesvol geïmporteerd.', 'success');
      } catch (err) {
        console.error(err);
        setMessage('Import mislukt. Kies een geldig JSON-bestand.', 'error');
      }
      importInput.value = '';
    };
    reader.readAsText(file);
  }

  function render() {
    renderLeaderboard();
    renderHistory();
  }

  resetForm(true);
  render();
});
