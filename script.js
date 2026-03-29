let races = JSON.parse(localStorage.getItem("races")) || [];

function save() {
localStorage.setItem("races", JSON.stringify(races));
}

function addRace() {
const name = document.getElementById("raceName").value;
const data = document.getElementById("raceData").value;

const players = data.split("\n").map(line => {
const [name, points] = line.split(",");
return { name: name.trim(), points: parseInt(points) };
});

races.push({ name, players });
save();
render();
}

function render() {
const leaderboard = {};

races.forEach(race => {
race.players.forEach(p => {
leaderboard[p.name] = (leaderboard[p.name] || 0) + p.points;
});
});

const sorted = Object.entries(leaderboard)
.sort((a, b) => b[1] - a[1]);

document.getElementById("leaderboard").innerHTML =
sorted.map(p => `<li>${p[0]} - ${p[1]} pts</li>`).join("");

document.getElementById("history").innerHTML =
races.map((r, i) => `
<li>
${r.name}
<button onclick="deleteRace(${i})">❌</button>
</li>
`).join("");
}

function deleteRace(index) {
races.splice(index, 1);
save();
render();
}

function exportData() {
const blob = new Blob([JSON.stringify(races)], { type: "application/json" });
const a = document.createElement("a");
a.href = URL.createObjectURL(blob);
a.download = "kart-data.json";
a.click();
}

function importData(event) {
const file = event.target.files[0];
const reader = new FileReader();

reader.onload = function(e) {
races = JSON.parse(e.target.result);
save();
render();
};

reader.readAsText(file);
}

render();