import { firebaseConfig } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let races = [];

document.getElementById("saveRaceBtn").onclick = saveRace;
document.getElementById("exportBtn").onclick = exportData;

function saveRace(){
  const raceName = document.getElementById("raceName").value;
  if(!raceName) return alert("Naam nodig");

  const raceRef = push(ref(db, "races"));
  set(raceRef, {name: raceName});

  alert("Opgeslagen!");
}

function exportData(){
  const blob = new Blob([JSON.stringify(races,null,2)],{type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "export.json";
  a.click();
}

onValue(ref(db,"races"), snap=>{
  const data = snap.val() || {};
  races = Object.values(data);

  document.getElementById("historyList").innerHTML =
    races.map(r=>"<div>"+r.name+"</div>").join("");
});
