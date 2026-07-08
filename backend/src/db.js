import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'fitness.sqlite');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,      -- 'daily' | 'gym'
    workout TEXT,                -- 'A' | 'B' | NULL (daily)
    sets INTEGER NOT NULL DEFAULT 1,
    target INTEGER NOT NULL,     -- Zielwert: Wiederholungen ODER Sekunden, je nach unit
    unit TEXT NOT NULL DEFAULT 'reps',   -- 'reps' | 'seconds'
    rest_seconds INTEGER NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    optional INTEGER NOT NULL DEFAULT 0, -- daily Zusatzübung, standardmäßig aus
    enabled INTEGER NOT NULL DEFAULT 1,
    last_weight_kg REAL
  );

  CREATE TABLE IF NOT EXISTS daily_logs (
    date TEXT PRIMARY KEY,
    done_keys TEXT NOT NULL DEFAULT '[]',
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS gym_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    workout TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS gym_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_session_id INTEGER NOT NULL REFERENCES gym_sessions(id),
    exercise_key TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    reps_done INTEGER,
    weight_kg REAL,
    done_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(gym_session_id, exercise_key, set_number)
  );

  CREATE TABLE IF NOT EXISTS rotation_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_workout TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_gym_sets_session ON gym_sets(gym_session_id);
  CREATE INDEX IF NOT EXISTS idx_gym_sessions_date ON gym_sessions(date);
`);

db.prepare(`INSERT OR IGNORE INTO rotation_state (id, last_workout) VALUES (1, NULL)`).run();

// Default-Übungen einmalig seeden — Bestand bleibt bei erneutem Start unangetastet,
// damit von Aaron editierte Werte (Sätze/Gewicht/enabled) nicht überschrieben werden.
const DEFAULT_EXERCISES = [
  // Täglich
  { key: 'squats', name: 'Kniebeugen', category: 'daily', workout: null, sets: 1, target: 10, unit: 'reps', rest_seconds: 30, order_index: 1, optional: 0 },
  { key: 'pushups', name: 'Liegestütze', category: 'daily', workout: null, sets: 1, target: 10, unit: 'reps', rest_seconds: 30, order_index: 2, optional: 0 },
  { key: 'superman', name: 'Superman', category: 'daily', workout: null, sets: 1, target: 10, unit: 'reps', rest_seconds: 20, order_index: 3, optional: 0 },
  { key: 'plank', name: 'Plank', category: 'daily', workout: null, sets: 1, target: 30, unit: 'seconds', rest_seconds: 20, order_index: 4, optional: 0 },
  { key: 'stretch', name: 'Dehnen', category: 'daily', workout: null, sets: 1, target: 240, unit: 'seconds', rest_seconds: 0, order_index: 5, optional: 0 },
  { key: 'glute_bridge', name: 'Glute Bridge', category: 'daily', workout: null, sets: 1, target: 15, unit: 'reps', rest_seconds: 30, order_index: 6, optional: 1, enabled: 0 },
  { key: 'neck_rolls', name: 'Nacken-/Schulterkreisen', category: 'daily', workout: null, sets: 1, target: 30, unit: 'seconds', rest_seconds: 0, order_index: 7, optional: 1, enabled: 0 },
  // Gym A — Push & Beine (immer Laufband-Start, Dehnen-Ende)
  { key: 'warmup_a', name: 'Aufwärmen (Laufband)', category: 'gym', workout: 'A', sets: 1, target: 300, unit: 'seconds', rest_seconds: 0, order_index: 1 },
  { key: 'squat_press_a', name: 'Kniebeugen / Beinpresse', category: 'gym', workout: 'A', sets: 3, target: 10, unit: 'reps', rest_seconds: 90, order_index: 2 },
  { key: 'bench_press_a', name: 'Bankdrücken / Brustpresse', category: 'gym', workout: 'A', sets: 3, target: 10, unit: 'reps', rest_seconds: 90, order_index: 3 },
  { key: 'shoulder_press_a', name: 'Schulterdrücken', category: 'gym', workout: 'A', sets: 3, target: 10, unit: 'reps', rest_seconds: 90, order_index: 4 },
  { key: 'lunges_a', name: 'Ausfallschritte (pro Bein)', category: 'gym', workout: 'A', sets: 2, target: 12, unit: 'reps', rest_seconds: 60, order_index: 5 },
  { key: 'triceps_a', name: 'Trizeps am Kabel', category: 'gym', workout: 'A', sets: 2, target: 12, unit: 'reps', rest_seconds: 60, order_index: 6 },
  { key: 'plank_a', name: 'Plank', category: 'gym', workout: 'A', sets: 3, target: 30, unit: 'seconds', rest_seconds: 45, order_index: 7 },
  { key: 'stretch_a', name: 'Dehnen', category: 'gym', workout: 'A', sets: 1, target: 240, unit: 'seconds', rest_seconds: 0, order_index: 8 },
  // Gym B — Pull & Ausdauer (immer Laufband-Start, Dehnen-Ende)
  { key: 'warmup_b', name: 'Aufwärmen (Laufband)', category: 'gym', workout: 'B', sets: 1, target: 300, unit: 'seconds', rest_seconds: 0, order_index: 1 },
  { key: 'lat_pulldown_b', name: 'Latzug / Klimmzüge', category: 'gym', workout: 'B', sets: 3, target: 10, unit: 'reps', rest_seconds: 90, order_index: 2 },
  { key: 'rows_b', name: 'Rudern vorgebeugt / Kabelzug', category: 'gym', workout: 'B', sets: 3, target: 10, unit: 'reps', rest_seconds: 90, order_index: 3 },
  { key: 'leg_curl_b', name: 'Beinbeuger', category: 'gym', workout: 'B', sets: 3, target: 12, unit: 'reps', rest_seconds: 60, order_index: 4 },
  { key: 'hip_thrust_b', name: 'Hüftheben / Glute Bridge Maschine', category: 'gym', workout: 'B', sets: 3, target: 12, unit: 'reps', rest_seconds: 60, order_index: 5 },
  { key: 'biceps_b', name: 'Bizeps-Curls', category: 'gym', workout: 'B', sets: 2, target: 12, unit: 'reps', rest_seconds: 60, order_index: 6 },
  { key: 'cardio_b', name: 'Cardio (Rad)', category: 'gym', workout: 'B', sets: 1, target: 1200, unit: 'seconds', rest_seconds: 0, order_index: 7 },
  { key: 'core_b', name: 'Superman / Bird-Dog', category: 'gym', workout: 'B', sets: 3, target: 12, unit: 'reps', rest_seconds: 45, order_index: 8 },
  { key: 'stretch_b', name: 'Dehnen', category: 'gym', workout: 'B', sets: 1, target: 240, unit: 'seconds', rest_seconds: 0, order_index: 9 }
];

const insertExercise = db.prepare(`
  INSERT OR IGNORE INTO exercises (key, name, category, workout, sets, target, unit, rest_seconds, order_index, optional, enabled)
  VALUES (@key, @name, @category, @workout, @sets, @target, @unit, @rest_seconds, @order_index, @optional, @enabled)
`);

const seedTx = db.transaction((rows) => {
  for (const row of rows) {
    insertExercise.run({ optional: 0, enabled: 1, ...row });
  }
});
seedTx(DEFAULT_EXERCISES);

// Migration für bereits laufende Installationen: alte Aufwärm-Namen (vor der
// Umstellung auf "immer Laufband") aktualisieren — INSERT OR IGNORE oben
// überschreibt bestehende Zeilen nicht, das muss hier explizit passieren.
db.prepare(`
  UPDATE exercises SET name = 'Aufwärmen (Laufband)'
  WHERE key IN ('warmup_a', 'warmup_b') AND name != 'Aufwärmen (Laufband)'
`).run();

// WAL-Datei klein halten (siehe lern-pwa-Muster)
const checkpointInterval = setInterval(() => {
  db.pragma('wal_checkpoint(PASSIVE)');
}, 5 * 60 * 1000).unref();

const shutdown = () => {
  clearInterval(checkpointInterval);
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
