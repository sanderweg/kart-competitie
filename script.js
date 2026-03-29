document.addEventListener('DOMContentLoaded', function () {
  var STORAGE_KEY = 'kart_competitie_races_stabiel_v1';
  var POINTS_MAP = {1:25,2:22,3:20,4:19,5:18,6:17,7:16,8:15,9:14,10:13,11:12,12:11,13:10,14:9,15:8,16:7,17:6,18:5,19:4,20:3,21:2,22:1};
  var races = loadRaces();

  var raceNameInput = document.getElementById('raceName');
  var raceDateInput = document.getElementById('raceDate');
  var driversList = document.getElementById('driversList');
  var messageEl = document.getElementById('message');
  var leaderboardBody = document.getElementById('leaderboardBody');
  var historyList = document.getElementById('historyList');
  var importInput = document.getElementById('importInput');

  document.getElementById('addDriverBtn').addEventListener('click', function () { addDriverRow('', ''); });
  document.getElementById('saveRaceBtn').addEventListener('click', function () { saveRace(); });
  document.getElementById('resetFormBtn').addEventListener('click', function () { resetForm(true); });
  document.getElementById('exportBtn').addEventListener('click', function () { exportData(); });
  document.getElementById('clearAllBtn').addEventListener('click', function () { clearAllData(); });
  importInput.addEventListener('change', function (event) { importData(event); });

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

  function addDriverRow(name, position) {
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
      if (!driversList.children.length) addDriverRow('', '');
    });

    updatePoints();
    driversList.appendChild(row);
  }

  function getDriversFromForm() {
    var rows = Array.prototype.slice.call(driversList.querySelectorAll('.driver-row'));
    return rows.map(function (row) {
      var name = row.querySelector('.driver-name').value.trim();
      var posText = row.querySelector('.driver-position').value.trim();
      var position = posText === '' ? NaN : Number(posText);
      return { name: name, position: position, points: getPointsForPosition(position) };
    }).filter(function (driver) {
      return driver.name !== '' || !Number.isNaN(driver.position);
    });
  }

  function saveRace() {
    try {
      var raceName = raceNameInput.value.trim();
      var raceDate = raceDateInput.value;
      var drivers = getDriversFromForm();

      if (!raceName) { setMessage('Vul eerst een racenaam in.', 'error'); return; }
      if (!raceDate) { setMessage('Kies eerst een datum.', 'error'); return; }
      if (!drivers.length) { setMessage('Voeg minimaal 1 driver toe.', 'error'); return; }

      var invalidDriver = drivers.find(function (driver) {
        return !driver.name || Number.isNaN(driver.position) || driver.position < 1 || driver.position > 22;
      });
      if (invalidDriver) { setMessage('Elke driver moet een naam en een positie tussen 1 en 22 hebben.', 'error'); return; }

      var positions = drivers.map(function (driver) { return driver.position; });
      for (var i = 0; i < positions.length; i++) {
        if (positions.indexOf(positions[i]) !== i) { setMessage('Positie ' + positions[i] + ' is dubbel ingevuld.', 'error'); return; }
      }

      var names = drivers.map(function (driver) { return driver.name.toLowerCase(); });
      for (var j = 0; j < names.length; j++) {
        if (names.indexOf(names[j]) !== j) { setMessage('Dezelfde driver staat dubbel in deze race.', 'error'); return; }
      }

      races.push({ id: makeId(), name: raceName, date: raceDate, drivers: drivers });
      races.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      persist();
      render();
      resetForm(false);
      setMessage('Race succesvol opgeslagen.', 'success');
    } catch (e) {
      console.error(e);
      setMessage('Opslaan mislukt door een scriptfout.', 'error');
    }
  }

  function resetForm(clearMessage) {
    raceNameInput.value = '';
    raceDateInput.value = '';
    driversList.innerHTML = '';
    addDriverRow('', '');
    addDriverRow('', '');
    if (clearMessage) setMessage('', '');
  }

  function buildLeaderboardRows() {
    var rows = [];
    races.forEach(function (race) {
      race.drivers.forEach(function (driver) {
        rows.push({
          driver: driver.name,
          race: race.name,
          position: Number(driver.position),
          points: getPointsForPosition(Number(driver.position)),
          date: race.date
        });
      });
    });

    rows.sort(function (a, b) {
      if (b.points !== a.points) return b.points - a.points;
      if (a.position !== b.position) return a.position - b.position;
      if (new Date(b.date) - new Date(a.date) !== 0) return new Date(b.date) - new Date(a.date);
      return a.driver.localeCompare(b.driver, 'nl');
    });

    return rows;
  }

  function renderLeaderboard() {
    var rows = buildLeaderboardRows();
    if (!rows.length) {
      leaderboardBody.innerHTML = '<tr><td colspan="5" class="empty">Nog geen races opgeslagen.</td></tr>';
      return;
    }
    leaderboardBody.innerHTML = rows.map(function (row, index) {
      return '<tr><td>' + (index + 1) + '</td><td>' + escapeHtml(row.driver) + '</td><td>' + escapeHtml(row.race) + '</td><td>P' + row.position + '</td><td>' + row.points + '</td></tr>';
    }).join('');
  }

  function renderHistory() {
    if (!races.length) {
      historyList.innerHTML = '<div class="empty">Nog geen racegeschiedenis beschikbaar.</div>';
      return;
    }

    historyList.innerHTML = races.map(function (race) {
      var items = race.drivers.slice().sort(function (a, b) {
        return Number(a.position) - Number(b.position);
      }).map(function (driver) {
        var position = Number(driver.position);
        return '<li>P' + position + ' · ' + escapeHtml(driver.name) + ' · ' + getPointsForPosition(position) + ' punten</li>';
      }).join('');

      return '<article class="race-item"><div class="race-top"><div><h3>' + escapeHtml(race.name) + '</h3><div class="race-meta">' + formatDate(race.date) + ' · ' + race.drivers.length + ' drivers</div></div><button type="button" class="danger delete-race-btn" data-id="' + race.id + '">Race verwijderen</button></div><ol class="race-drivers">' + items + '</ol></article>';
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
    a.download = 'kart-competitie-data.json';
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
          return {
            id: race.id || makeId(),
            name: race.name || 'Onbekende race',
            date: race.date || '',
            drivers: Array.isArray(race.drivers) ? race.drivers.map(function (driver) {
              return { name: driver.name || '', position: Number(driver.position), points: getPointsForPosition(Number(driver.position)) };
            }) : []
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
