import { Router } from 'express';
import { db } from '../db.js';
import { today, dateNDaysAgo, startOfIsoWeek } from '../util.js';

const router = Router();

router.get('/heatmap', (req, res) => {
  const pad = (n) => String(n).padStart(2, '0');
  let since;
  let end;

  if (/^\d{4}-\d{2}$/.test(req.query.month || '')) {
    // Kompakte Monatsansicht fürs Dashboard: kompletter Kalendermonat, auch
    // zukünftige Tage werden mitgerendert (level 0) für ein rechteckiges Raster.
    const [y, m] = req.query.month.split('-').map(Number);
    since = `${req.query.month}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    end = `${req.query.month}-${pad(lastDay)}`;
  } else {
    const days = Math.min(Number(req.query.days) || 365, 366);
    since = dateNDaysAgo(days);
    end = today();
  }

  const dailyDates = new Set(
    db.prepare('SELECT date FROM daily_logs WHERE completed_at IS NOT NULL AND date >= ? AND date <= ?').all(since, end).map((r) => r.date)
  );
  const gymDates = new Set(
    db.prepare('SELECT date FROM gym_sessions WHERE completed_at IS NOT NULL AND date >= ? AND date <= ?').all(since, end).map((r) => r.date)
  );

  // Volle Zeitreihe zurückgeben (auch leere Tage) — sonst hat die Heatmap im
  // Frontend Lücken statt durchgehender Wochenspalten.
  const cells = [];
  const cursor = new Date(since);
  const endDate = new Date(end);
  while (cursor <= endDate) {
    const date = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
    const hasDaily = dailyDates.has(date);
    const hasGym = gymDates.has(date);
    cells.push({ date, level: hasDaily && hasGym ? 2 : hasDaily || hasGym ? 1 : 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  res.json({ cells });
});

router.get('/summary', (req, res) => {
  const dailyDates = new Set(
    db.prepare('SELECT date FROM daily_logs WHERE completed_at IS NOT NULL').all().map((r) => r.date)
  );

  let streak = 0;
  const cursor = new Date();
  // Heute zählt nur mit, wenn schon erledigt — sonst würde die Streak-Anzeige
  // morgens fälschlich um 1 zu hoch wirken, bevor überhaupt trainiert wurde
  if (!dailyDates.has(today())) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
    if (!dailyDates.has(dateStr)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const monthPrefix = today().slice(0, 7);
  const activeDaysThisMonth = db
    .prepare(`
      SELECT COUNT(*) AS n FROM (
        SELECT date FROM daily_logs WHERE completed_at IS NOT NULL AND date LIKE ?
        UNION
        SELECT date FROM gym_sessions WHERE completed_at IS NOT NULL AND date LIKE ?
      )
    `)
    .get(`${monthPrefix}%`, `${monthPrefix}%`).n;

  const gymDoneThisWeek = db
    .prepare('SELECT COUNT(*) AS n FROM gym_sessions WHERE completed_at IS NOT NULL AND date >= ?')
    .get(startOfIsoWeek()).n;
  const dailyDoneThisWeek = db
    .prepare('SELECT COUNT(*) AS n FROM daily_logs WHERE completed_at IS NOT NULL AND date >= ?')
    .get(startOfIsoWeek()).n;

  // Wochenziel: 1x täglich (7 Tage) + 2x Gym — als eine gemeinsame Prozentzahl
  // fürs Motivations-Widget auf der Startseite.
  const DAILY_TARGET = 7;
  const GYM_TARGET = 2;
  const weekDone = Math.min(dailyDoneThisWeek, DAILY_TARGET) + Math.min(gymDoneThisWeek, GYM_TARGET);
  const weekTarget = DAILY_TARGET + GYM_TARGET;

  res.json({
    streakDays: streak,
    activeDaysThisMonth,
    gymThisWeek: { done: gymDoneThisWeek, target: GYM_TARGET },
    week: {
      dailyDone: dailyDoneThisWeek,
      dailyTarget: DAILY_TARGET,
      gymDone: gymDoneThisWeek,
      gymTarget: GYM_TARGET,
      done: weekDone,
      target: weekTarget,
      pct: Math.round((weekDone / weekTarget) * 100)
    }
  });
});

router.get('/monthly', (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : today().slice(0, 7);
  const like = `${month}%`;

  const exerciseByKey = new Map(db.prepare('SELECT * FROM exercises').all().map((e) => [e.key, e]));
  const fallback = (key) => ({ key, name: key, unit: 'reps', target: 1 });

  // Tägliche Übungen: done_keys wird gezählt unabhängig davon, ob der ganze
  // Tag "komplett" war — auch Teil-Tage sollen in die Monatssumme einfließen.
  const dailyRows = db.prepare('SELECT done_keys FROM daily_logs WHERE date LIKE ?').all(like);
  const dailyCounts = {};
  for (const row of dailyRows) {
    for (const key of JSON.parse(row.done_keys)) {
      dailyCounts[key] = (dailyCounts[key] || 0) + 1;
    }
  }
  const dailyTotals = Object.entries(dailyCounts).map(([key, days]) => {
    const ex = exerciseByKey.get(key) || fallback(key);
    return { key, name: ex.name, unit: ex.unit, days, total: days * (ex.target || 1) };
  });

  const gymRows = db
    .prepare(`
      SELECT gs.exercise_key AS key, COUNT(*) AS setsLogged, SUM(gs.reps_done) AS totalReps, MAX(gs.weight_kg) AS maxWeight
      FROM gym_sets gs
      JOIN gym_sessions s ON s.id = gs.gym_session_id
      WHERE s.date LIKE ?
      GROUP BY gs.exercise_key
    `)
    .all(like);
  const gymTotals = gymRows.map((row) => {
    const ex = exerciseByKey.get(row.key) || fallback(row.key);
    return {
      key: row.key,
      name: ex.name,
      unit: ex.unit,
      setsLogged: row.setsLogged,
      total: row.totalReps || 0,
      maxWeightKg: row.maxWeight
    };
  });

  const gymSessionsCompleted = db
    .prepare('SELECT COUNT(*) AS n FROM gym_sessions WHERE completed_at IS NOT NULL AND date LIKE ?')
    .get(like).n;
  const dailyCompletedDays = db
    .prepare('SELECT COUNT(*) AS n FROM daily_logs WHERE completed_at IS NOT NULL AND date LIKE ?')
    .get(like).n;

  res.json({
    month,
    dailyTotals: dailyTotals.sort((a, b) => a.name.localeCompare(b.name)),
    gymTotals: gymTotals.sort((a, b) => a.name.localeCompare(b.name)),
    gymSessionsCompleted,
    dailyCompletedDays
  });
});

router.get('/records', (req, res) => {
  const exerciseByKey = new Map(db.prepare('SELECT * FROM exercises').all().map((e) => [e.key, e]));
  const rows = db
    .prepare(`
      SELECT exercise_key AS key, MAX(weight_kg) AS maxWeight, MAX(reps_done) AS maxReps
      FROM gym_sets
      GROUP BY exercise_key
    `)
    .all();

  const records = rows
    .filter((r) => r.maxWeight !== null)
    .map((r) => {
      const ex = exerciseByKey.get(r.key);
      return { key: r.key, name: ex ? ex.name : r.key, maxWeightKg: r.maxWeight, maxReps: r.maxReps };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  res.json({ records });
});

export default router;
