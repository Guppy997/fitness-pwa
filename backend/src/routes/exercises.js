import { Router } from 'express';
import { db } from '../db.js';
import { slugify } from '../util.js';

const router = Router();

router.get('/', (req, res) => {
  const { category, workout } = req.query;
  let sql = 'SELECT * FROM exercises WHERE 1=1';
  const params = [];
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (workout) {
    sql += ' AND workout = ?';
    params.push(workout);
  }
  sql += ' ORDER BY order_index ASC';
  res.json({ exercises: db.prepare(sql).all(...params) });
});

router.post('/', (req, res) => {
  const { name, category, workout, sets, target, unit, rest_seconds } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name erforderlich' });
  if (!['daily', 'gym'].includes(category)) return res.status(400).json({ error: 'category muss daily oder gym sein' });
  const workoutVal = category === 'gym' ? workout : null;
  if (category === 'gym' && !db.prepare('SELECT 1 FROM workouts WHERE key = ?').get(workoutVal)) {
    return res.status(400).json({ error: 'Unbekanntes Workout' });
  }
  if (!['reps', 'seconds'].includes(unit)) return res.status(400).json({ error: 'unit muss reps oder seconds sein' });

  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(order_index), 0) AS m FROM exercises WHERE category = ? AND workout IS ?')
    .get(category, workoutVal).m;

  let key = slugify(name);
  // Kollisionschance ist verschwindend gering (zufälliges Suffix), aber sicher ist sicher
  while (db.prepare('SELECT 1 FROM exercises WHERE key = ?').get(key)) {
    key = slugify(name);
  }

  db.prepare(`
    INSERT INTO exercises (key, name, category, workout, sets, target, unit, rest_seconds, order_index, optional, enabled)
    VALUES (@key, @name, @category, @workout, @sets, @target, @unit, @rest_seconds, @order_index, 0, 1)
  `).run({
    key,
    name: String(name).trim(),
    category,
    workout: workoutVal,
    sets: Number(sets) || 1,
    target: Number(target) || 1,
    unit,
    rest_seconds: Number(rest_seconds) || 0,
    order_index: maxOrder + 1
  });

  res.status(201).json({ exercise: db.prepare('SELECT * FROM exercises WHERE key = ?').get(key) });
});

router.delete('/:key', (req, res) => {
  const exercise = db.prepare('SELECT * FROM exercises WHERE key = ?').get(req.params.key);
  if (!exercise) return res.status(404).json({ error: 'Übung nicht gefunden' });
  db.prepare('DELETE FROM exercises WHERE key = ?').run(req.params.key);
  res.status(204).end();
});

// Bulk-Reorder fürs Drag&Drop im Frontend: eine fertig sortierte Liste von
// Keys rein, order_index wird 1..n danach neu vergeben. Ersetzt das alte
// schrittweise /move (up/down) — beim Ziehen landet man direkt an der
// Zielposition, ein Swap-basierter Ansatz würde das nur umständlich abbilden.
router.patch('/reorder', (req, res) => {
  const { category, workout, orderedKeys } = req.body;
  if (!['daily', 'gym'].includes(category)) return res.status(400).json({ error: 'category muss daily oder gym sein' });
  if (!Array.isArray(orderedKeys) || orderedKeys.length === 0) {
    return res.status(400).json({ error: 'orderedKeys erforderlich' });
  }
  const workoutVal = category === 'gym' ? workout : null;

  const siblings = db
    .prepare('SELECT key FROM exercises WHERE category = ? AND workout IS ?')
    .all(category, workoutVal)
    .map((r) => r.key);

  const sameSet = siblings.length === orderedKeys.length && siblings.every((k) => orderedKeys.includes(k));
  if (!sameSet) {
    return res.status(400).json({ error: 'orderedKeys muss genau die Übungen dieser Gruppe enthalten' });
  }

  const reorderTx = db.transaction(() => {
    orderedKeys.forEach((key, i) => {
      db.prepare('UPDATE exercises SET order_index = ? WHERE key = ?').run(i + 1, key);
    });
  });
  reorderTx();

  const updated = db
    .prepare('SELECT * FROM exercises WHERE category = ? AND workout IS ? ORDER BY order_index ASC')
    .all(category, workoutVal);
  res.json({ exercises: updated });
});

const ALLOWED_FIELDS = ['sets', 'target', 'rest_seconds', 'enabled', 'last_weight_kg'];

router.patch('/:key', (req, res) => {
  const exercise = db.prepare('SELECT * FROM exercises WHERE key = ?').get(req.params.key);
  if (!exercise) return res.status(404).json({ error: 'Übung nicht gefunden' });

  const updates = {};
  for (const field of ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Keine gültigen Felder übergeben' });
  }

  const setClause = Object.keys(updates).map((f) => `${f} = @${f}`).join(', ');
  db.prepare(`UPDATE exercises SET ${setClause} WHERE key = @key`).run({ ...updates, key: req.params.key });
  res.json({ exercise: db.prepare('SELECT * FROM exercises WHERE key = ?').get(req.params.key) });
});

export default router;
