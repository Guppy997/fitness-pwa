import { Router } from 'express';
import { db } from '../db.js';
import { slugify } from '../util.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ workouts: db.prepare('SELECT * FROM workouts ORDER BY order_index ASC').all() });
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name erforderlich' });

  let key = slugify(name);
  while (db.prepare('SELECT 1 FROM workouts WHERE key = ?').get(key)) {
    key = slugify(name);
  }

  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), 0) AS m FROM workouts').get().m;
  db.prepare('INSERT INTO workouts (key, name, enabled, order_index) VALUES (?, ?, 1, ?)').run(
    key,
    String(name).trim(),
    maxOrder + 1
  );

  res.status(201).json({ workout: db.prepare('SELECT * FROM workouts WHERE key = ?').get(key) });
});

router.patch('/:key', (req, res) => {
  const workout = db.prepare('SELECT * FROM workouts WHERE key = ?').get(req.params.key);
  if (!workout) return res.status(404).json({ error: 'Workout nicht gefunden' });

  const updates = {};
  if (req.body.name !== undefined) {
    if (!String(req.body.name).trim()) return res.status(400).json({ error: 'Name darf nicht leer sein' });
    updates.name = String(req.body.name).trim();
  }
  if (req.body.enabled !== undefined) updates.enabled = req.body.enabled ? 1 : 0;
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Keine gültigen Felder übergeben' });
  }

  const setClause = Object.keys(updates).map((f) => `${f} = @${f}`).join(', ');
  db.prepare(`UPDATE workouts SET ${setClause} WHERE key = @key`).run({ ...updates, key: req.params.key });
  res.json({ workout: db.prepare('SELECT * FROM workouts WHERE key = ?').get(req.params.key) });
});

// Löscht das Workout inkl. seiner Übungen. Vergangene gym_sessions bleiben
// erhalten (workout-Text bleibt als historisches Label stehen), nur Start
// eines neuen Workouts mit diesem Key ist danach nicht mehr möglich.
router.delete('/:key', (req, res) => {
  const workout = db.prepare('SELECT * FROM workouts WHERE key = ?').get(req.params.key);
  if (!workout) return res.status(404).json({ error: 'Workout nicht gefunden' });

  const deleteTx = db.transaction(() => {
    db.prepare("DELETE FROM exercises WHERE category = 'gym' AND workout = ?").run(req.params.key);
    db.prepare('DELETE FROM workouts WHERE key = ?').run(req.params.key);
  });
  deleteTx();

  res.status(204).end();
});

export default router;
