import { Router } from 'express';
import { db } from '../db.js';
import { today } from '../util.js';

const router = Router();

const getOrCreateLog = (date) => {
  db.prepare('INSERT OR IGNORE INTO daily_logs (date, done_keys) VALUES (?, ?)').run(date, '[]');
  return db.prepare('SELECT * FROM daily_logs WHERE date = ?').get(date);
};

const buildResponse = (date) => {
  const log = getOrCreateLog(date);
  const doneKeys = new Set(JSON.parse(log.done_keys));
  const exercises = db
    .prepare("SELECT * FROM exercises WHERE category = 'daily' AND enabled = 1 ORDER BY order_index ASC")
    .all()
    .map((ex) => ({ ...ex, done: doneKeys.has(ex.key) }));
  return { date, completed_at: log.completed_at, exercises };
};

router.get('/:date', (req, res) => {
  res.json(buildResponse(req.params.date));
});

router.post('/:date/toggle', (req, res) => {
  const { date } = req.params;
  const { key } = req.body;
  const exercise = db.prepare("SELECT * FROM exercises WHERE key = ? AND category = 'daily'").get(key);
  if (!exercise) return res.status(404).json({ error: 'Übung nicht gefunden' });

  const log = getOrCreateLog(date);
  const doneKeys = new Set(JSON.parse(log.done_keys));
  if (doneKeys.has(key)) doneKeys.delete(key);
  else doneKeys.add(key);

  const enabledKeys = db
    .prepare("SELECT key FROM exercises WHERE category = 'daily' AND enabled = 1")
    .all()
    .map((r) => r.key);
  const allDone = enabledKeys.length > 0 && enabledKeys.every((k) => doneKeys.has(k));
  // completed_at nur beim heutigen Tag automatisch neu setzen — sonst würde ein
  // Toggle in der Vergangenheit fälschlich "jetzt" als Abschlusszeit eintragen
  const completedAt = allDone ? (date === today() ? new Date().toISOString() : log.completed_at || new Date().toISOString()) : null;

  db.prepare('UPDATE daily_logs SET done_keys = ?, completed_at = ? WHERE date = ?').run(
    JSON.stringify([...doneKeys]),
    completedAt,
    date
  );

  res.json(buildResponse(date));
});

export default router;
