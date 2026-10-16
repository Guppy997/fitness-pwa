// Legt eine Demo-Datenbank mit ausgedachtem Trainingsverlauf über gut zehn
// Wochen an — zum Ausprobieren der App und für die README-Screenshots.
//
//   cd backend && npm ci && cd ..
//   node scripts/seed-demo.mjs [pfad]        # Standard: backend/data/demo.sqlite
//
// Schreibt nur in eine LEERE Datenbank: steht dort schon ein Verlauf, bricht
// das Skript ab, damit es nie versehentlich echte Trainingsdaten vermischt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Gleiche Zeitzone wie das Backend, sonst landen Einheiten am falschen Kalendertag
process.env.TZ = 'Europe/Berlin';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.resolve(process.argv[2] ?? path.join(root, 'backend', 'data', 'demo.sqlite'));
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// db.js legt Schema, Standard-Workouts (A/B) und Standard-Übungen an,
// genau wie beim Start des Backends
process.env.DB_PATH = dbPath;
const { db } = await import('../backend/src/db.js');

const used = db
  .prepare('SELECT (SELECT COUNT(*) FROM daily_logs) + (SELECT COUNT(*) FROM gym_sessions) AS n')
  .get().n;
if (used > 0) {
  console.error(`Abbruch: ${dbPath} enthält schon einen Verlauf. Für Demo-Daten eine neue Datei angeben.`);
  process.exit(1);
}

// Fester Startwert: jeder Lauf erzeugt dieselben Daten (relativ zu heute)
let state = 11;
const rnd = () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// gym_sessions/gym_sets speichern wie datetime('now') in UTC, ohne "T" und "Z"
const sqlUtc = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
const at = (daysAgo, hour, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const DAYS = 75;
const STREAK = 9; // die letzten Tage lückenlos, damit die Serie etwas zeigt

const dailyKeys = db
  .prepare("SELECT key FROM exercises WHERE category = 'daily' AND enabled = 1 ORDER BY order_index")
  .all()
  .map((r) => r.key);
const gymExercises = db
  .prepare("SELECT * FROM exercises WHERE category = 'gym' AND enabled = 1 ORDER BY workout, order_index")
  .all();

// Startgewicht → Zielgewicht über den ganzen Zeitraum (kg). Ohne Eintrag:
// Übung ohne Gewicht (Zeit-Übungen, Superman/Bird-Dog).
const WEIGHTS = {
  squat_press_a: [60, 72.5],
  bench_press_a: [40, 47.5],
  shoulder_press_a: [22.5, 27.5],
  lunges_a: [10, 14],
  triceps_a: [20, 25],
  lat_pulldown_b: [45, 52.5],
  rows_b: [40, 47.5],
  leg_curl_b: [30, 37.5],
  hip_thrust_b: [50, 65],
  biceps_b: [10, 14]
};
const weightOn = (key, daysAgo) => {
  const range = WEIGHTS[key];
  if (!range) return null;
  const progress = 1 - daysAgo / DAYS;
  return Math.round((range[0] + (range[1] - range[0]) * progress) / 2.5) * 2.5;
};

const NOTES = ['Bankdrücken: neuer Bestwert', 'Wenig geschlafen, trotzdem durchgezogen', 'Laufband heute etwas länger'];

const insertDaily = db.prepare('INSERT INTO daily_logs (date, done_keys, completed_at) VALUES (?, ?, ?)');
const insertSession = db.prepare(
  'INSERT INTO gym_sessions (date, workout, started_at, completed_at, notes) VALUES (?, ?, ?, ?, ?)'
);
const insertSet = db.prepare(
  'INSERT INTO gym_sets (gym_session_id, exercise_key, set_number, reps_done, weight_kg, done_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const setLastWeight = db.prepare("UPDATE exercises SET last_weight_kg = ? WHERE key = ? AND category = 'gym'");

db.transaction(() => {
  let nextWorkout = 'A';
  let notesLeft = [...NOTES];

  for (let daysAgo = DAYS; daysAgo >= 1; daysAgo--) {
    const day = at(daysAgo, 12);
    const date = localDate(day);

    // Tägliche Einheit: meist komplett, manchmal angefangen, selten ausgefallen
    const r = rnd();
    if (daysAgo <= STREAK || r < 0.7) {
      insertDaily.run(date, JSON.stringify(dailyKeys), at(daysAgo, 7 + Math.floor(rnd() * 3), Math.floor(rnd() * 60)).toISOString());
    } else if (r < 0.85) {
      insertDaily.run(date, JSON.stringify(dailyKeys.slice(0, 2 + Math.floor(rnd() * 2))), null);
    }

    // Gym zweimal pro Woche, montags und donnerstags, ab und zu fällt es aus
    const weekday = day.getDay();
    if ((weekday === 1 || weekday === 4) && (daysAgo <= 7 || rnd() < 0.85)) {
      const started = at(daysAgo, 18, Math.floor(rnd() * 40));
      const note = rnd() < 0.15 && notesLeft.length ? notesLeft.shift() : null;
      let t = started.getTime();
      const id = insertSession.run(date, nextWorkout, sqlUtc(started), null, note).lastInsertRowid;
      for (const ex of gymExercises.filter((e) => e.workout === nextWorkout)) {
        const weight = weightOn(ex.key, daysAgo);
        for (let set = 1; set <= ex.sets; set++) {
          t += (ex.unit === 'seconds' ? ex.target : 60) * 1000 + ex.rest_seconds * 1000;
          insertSet.run(id, ex.key, set, ex.target, weight, sqlUtc(new Date(t)));
        }
        if (weight != null) setLastWeight.run(weight, ex.key);
      }
      db.prepare('UPDATE gym_sessions SET completed_at = ? WHERE id = ?').run(sqlUtc(new Date(t + 120_000)), id);
      db.prepare('UPDATE rotation_state SET last_workout = ? WHERE id = 1').run(nextWorkout);
      nextWorkout = nextWorkout === 'A' ? 'B' : 'A';
    }
  }

  // Heute: die tägliche Einheit ist angefangen, zwei Übungen sind abgehakt
  insertDaily.run(localDate(new Date()), JSON.stringify(dailyKeys.slice(0, 2)), null);
})();

const { daily, sessions } = db
  .prepare(
    `SELECT (SELECT COUNT(*) FROM daily_logs WHERE completed_at IS NOT NULL) AS daily,
            (SELECT COUNT(*) FROM gym_sessions) AS sessions`
  )
  .get();
console.log(`Demo-Daten angelegt: ${daily} komplette Tage, ${sessions} Gym-Sessions → ${dbPath}`);
db.close();
process.exit(0);
