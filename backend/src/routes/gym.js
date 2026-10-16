import { Router } from 'express';
import { db } from '../db.js';
import { today } from '../util.js';

const router = Router();

// Rotiert reihum durch die aktivierten Workouts (Reihenfolge = order_index).
// Ist nur eins aktiv, bleibt es immer dasselbe ("fixiertes" Workout); ist
// keins aktiv, gibt es nichts zu starten.
const nextWorkout = () => {
  const enabled = db.prepare('SELECT key FROM workouts WHERE enabled = 1 ORDER BY order_index ASC').all();
  if (enabled.length === 0) return null;
  const state = db.prepare('SELECT last_workout FROM rotation_state WHERE id = 1').get();
  const lastIndex = enabled.findIndex((w) => w.key === state.last_workout);
  const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % enabled.length;
  return enabled[nextIndex].key;
};

const sessionDetail = (id) => {
  const session = db.prepare('SELECT * FROM gym_sessions WHERE id = ?').get(id);
  if (!session) return null;
  const exercises = db
    .prepare("SELECT * FROM exercises WHERE category = 'gym' AND workout = ? AND enabled = 1 ORDER BY order_index ASC")
    .all(session.workout);
  const sets = db.prepare('SELECT * FROM gym_sets WHERE gym_session_id = ?').all(id);
  return { ...session, exercises, sets };
};

router.get('/next', (req, res) => {
  res.json({ workout: nextWorkout() });
});

router.get('/today', (req, res) => {
  const session = db
    .prepare('SELECT * FROM gym_sessions WHERE date = ? ORDER BY id DESC LIMIT 1')
    .get(today());
  if (!session) return res.json({ session: null });
  res.json({ session: sessionDetail(session.id) });
});

router.get('/sessions/:id', (req, res) => {
  const detail = sessionDetail(req.params.id);
  if (!detail) return res.status(404).json({ error: 'Session nicht gefunden' });
  res.json({ session: detail });
});

router.get('/history', (req, res) => {
  let sessions;
  if (/^\d{4}-\d{2}$/.test(req.query.month || '')) {
    sessions = db
      .prepare('SELECT * FROM gym_sessions WHERE completed_at IS NOT NULL AND date LIKE ? ORDER BY date DESC, id DESC')
      .all(`${req.query.month}%`);
  } else {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    sessions = db
      .prepare('SELECT * FROM gym_sessions WHERE completed_at IS NOT NULL ORDER BY date DESC, id DESC LIMIT ?')
      .all(limit);
  }
  res.json({ sessions });
});

router.post('/sessions', (req, res) => {
  const requested = req.body.workout
    ? db.prepare('SELECT key FROM workouts WHERE key = ? AND enabled = 1').get(req.body.workout)?.key
    : null;
  const workout = requested || nextWorkout();
  if (!workout) return res.status(400).json({ error: 'Kein aktiviertes Workout vorhanden' });

  const result = db
    .prepare('INSERT INTO gym_sessions (date, workout) VALUES (?, ?)')
    .run(today(), workout);
  res.status(201).json({ session: sessionDetail(result.lastInsertRowid) });
});

router.put('/sessions/:id/sets', (req, res) => {
  const session = db.prepare('SELECT * FROM gym_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session nicht gefunden' });
  if (session.completed_at) return res.status(400).json({ error: 'Session bereits abgeschlossen' });

  const { exercise_key, set_number, reps_done, weight_kg } = req.body;
  if (!exercise_key || !set_number) {
    return res.status(400).json({ error: 'exercise_key und set_number erforderlich' });
  }

  db.prepare(`
    INSERT INTO gym_sets (gym_session_id, exercise_key, set_number, reps_done, weight_kg)
    VALUES (@sessionId, @key, @setNumber, @repsDone, @weightKg)
    ON CONFLICT(gym_session_id, exercise_key, set_number)
    DO UPDATE SET reps_done = @repsDone, weight_kg = @weightKg, done_at = datetime('now')
  `).run({
    sessionId: session.id,
    key: exercise_key,
    setNumber: set_number,
    repsDone: reps_done ?? null,
    weightKg: weight_kg ?? null
  });

  if (weight_kg !== undefined && weight_kg !== null) {
    db.prepare("UPDATE exercises SET last_weight_kg = ? WHERE key = ? AND category = 'gym'").run(weight_kg, exercise_key);
  }

  res.json({ session: sessionDetail(session.id) });
});

// Satz wieder entfernen — Gegenstück zum PUT, für den Fall dass man aus
// Versehen getippt hat (nochmal auf denselben Satz tippen macht ihn rückgängig).
router.delete('/sessions/:id/sets', (req, res) => {
  const session = db.prepare('SELECT * FROM gym_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session nicht gefunden' });
  if (session.completed_at) return res.status(400).json({ error: 'Session bereits abgeschlossen' });

  const { exercise_key, set_number } = req.body;
  if (!exercise_key || !set_number) {
    return res.status(400).json({ error: 'exercise_key und set_number erforderlich' });
  }

  db.prepare('DELETE FROM gym_sets WHERE gym_session_id = ? AND exercise_key = ? AND set_number = ?').run(
    session.id,
    exercise_key,
    set_number
  );

  res.json({ session: sessionDetail(session.id) });
});

// Ganzes Workout löschen — sowohl ein versehentlich gestartetes/laufendes
// als auch eine abgeschlossene Session aus dem Verlauf.
router.delete('/sessions/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM gym_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session nicht gefunden' });

  const deleteTx = db.transaction(() => {
    db.prepare('DELETE FROM gym_sets WHERE gym_session_id = ?').run(session.id);
    db.prepare('DELETE FROM gym_sessions WHERE id = ?').run(session.id);
  });
  deleteTx();

  res.status(204).end();
});

router.post('/sessions/:id/complete', (req, res) => {
  const session = db.prepare('SELECT * FROM gym_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session nicht gefunden' });

  db.prepare("UPDATE gym_sessions SET completed_at = datetime('now'), notes = ? WHERE id = ?").run(
    req.body.notes || null,
    session.id
  );
  db.prepare('UPDATE rotation_state SET last_workout = ? WHERE id = 1').run(session.workout);

  res.json({ session: sessionDetail(session.id) });
});

export default router;
