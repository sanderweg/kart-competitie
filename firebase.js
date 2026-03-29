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

export const firebaseConfig = {
  apiKey: "AIzaSyAHJ_U7_H7rO1CLDEmgYm2bY-956R2B3jI",
  authDomain: "karting-competitie.firebaseapp.com",
  databaseURL: "https://karting-competitie-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "karting-competitie",
  storageBucket: "karting-competitie.firebasestorage.app",
  messagingSenderId: "915335846004",
  appId: "1:915335846004:web:5fbc6592f60a93a9031921"
};

export const DB_PATH = "kartCompetitie/races";
export const POINTS_MAP = {1:25,2:22,3:20,4:19,5:18,6:17,7:16,8:15,9:14,10:13,11:12,12:11,13:10,14:9,15:8,16:7,17:6,18:5,19:4,20:3,21:2,22:1};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

export { ref, push, set, remove, onValue, signInWithEmailAndPassword, signOut, onAuthStateChanged };

export function getPoints(position) {
  return POINTS_MAP[position] || 0;
}
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
export function formatDate(dateString) {
  if (!dateString) return "Geen datum";
  return new Date(dateString + "T00:00:00").toLocaleDateString("nl-NL");
}
export function mergeResults(sprint1Drivers, sprint2Drivers) {
  const totals = {};
  sprint1Drivers.forEach(driver => {
    const key = driver.name.toLowerCase();
    if (!totals[key]) totals[key] = { driver: driver.name, sprint1Position: "-", sprint2Position: "-", totalPoints: 0, bestSprint: 999 };
    totals[key].driver = driver.name;
    totals[key].sprint1Position = driver.position;
    totals[key].totalPoints += driver.points;
    totals[key].bestSprint = Math.min(totals[key].bestSprint, driver.position);
  });
  sprint2Drivers.forEach(driver => {
    const key = driver.name.toLowerCase();
    if (!totals[key]) totals[key] = { driver: driver.name, sprint1Position: "-", sprint2Position: "-", totalPoints: 0, bestSprint: 999 };
    totals[key].driver = driver.name;
    totals[key].sprint2Position = driver.position;
    totals[key].totalPoints += driver.points;
    totals[key].bestSprint = Math.min(totals[key].bestSprint, driver.position);
  });
  return Object.values(totals);
}
