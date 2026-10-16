import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { today } from '../src/util.js';

// Die Tests laufen nacheinander gegen dieselbe frische In-Memory-Datenbank
// (siehe vitest.config.js) und bauen aufeinander auf, wie ein echter Trainingstag.
const api = request(app);

describe('Grundgerüst', () => {
  it('meldet sich im Healthcheck', async () => {
    const res = await api.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('legt beim ersten Start Workouts A/B und die Standard-Übungen an', async () => {
    const workouts = await api.get('/api/workouts');
    expect(workouts.body.workouts.map((w) => w.key)).toEqual(['A', 'B']);

    const daily = await api.get('/api/exercises?category=daily');
    const enabled = daily.body.exercises.filter((e) => e.enabled).map((e) => e.key);
    expect(enabled).toEqual(['squats', 'pushups', 'superman', 'plank', 'stretch']);
  });
});

describe('Tägliche Einheit', () => {
  const date = today();

  it('hakt eine Übung ab und wieder auf', async () => {
    let res = await api.post(`/api/daily/${date}/toggle`).send({ key: 'squats' });
    expect(res.body.exercises.find((e) => e.key === 'squats').done).toBe(true);
    expect(res.body.completed_at).toBeNull();

    res = await api.post(`/api/daily/${date}/toggle`).send({ key: 'squats' });
    expect(res.body.exercises.find((e) => e.key === 'squats').done).toBe(false);
  });

  it('lehnt unbekannte Übungen ab', async () => {
    const res = await api.post(`/api/daily/${date}/toggle`).send({ key: 'gibt-es-nicht' });
    expect(res.status).toBe(404);
  });

  it('markiert den Tag als komplett, sobald alle aktiven Übungen erledigt sind', async () => {
    let res;
    for (const key of ['squats', 'pushups', 'superman', 'plank', 'stretch']) {
      res = await api.post(`/api/daily/${date}/toggle`).send({ key });
    }
    expect(res.body.completed_at).not.toBeNull();
  });
});

describe('Gym-Rotation und Sätze', () => {
  let sessionId;

  it('schlägt zuerst Workout A vor und startet es', async () => {
    expect((await api.get('/api/gym/next')).body.workout).toBe('A');
    const res = await api.post('/api/gym/sessions').send({});
    expect(res.status).toBe(201);
    expect(res.body.session.workout).toBe('A');
    sessionId = res.body.session.id;
  });

  it('speichert einen Satz und merkt sich das Gewicht für die Übung', async () => {
    const res = await api
      .put(`/api/gym/sessions/${sessionId}/sets`)
      .send({ exercise_key: 'bench_press_a', set_number: 1, reps_done: 10, weight_kg: 47.5 });
    expect(res.status).toBe(200);
    expect(res.body.session.sets).toHaveLength(1);

    const gym = await api.get('/api/exercises?category=gym&workout=A');
    expect(gym.body.exercises.find((e) => e.key === 'bench_press_a').last_weight_kg).toBe(47.5);
  });

  it('macht einen Satz durch erneutes Tippen rückgängig', async () => {
    await api.put(`/api/gym/sessions/${sessionId}/sets`).send({ exercise_key: 'squat_press_a', set_number: 1, weight_kg: 70 });
    const res = await api.delete(`/api/gym/sessions/${sessionId}/sets`).send({ exercise_key: 'squat_press_a', set_number: 1 });
    expect(res.body.session.sets.map((s) => s.exercise_key)).toEqual(['bench_press_a']);
  });

  it('lehnt Sätze ohne Übung oder Satznummer ab', async () => {
    const res = await api.put(`/api/gym/sessions/${sessionId}/sets`).send({ weight_kg: 10 });
    expect(res.status).toBe(400);
  });

  it('schließt das Workout ab, danach ist B dran und A nicht mehr änderbar', async () => {
    await api.post(`/api/gym/sessions/${sessionId}/complete`).send({});
    expect((await api.get('/api/gym/next')).body.workout).toBe('B');

    const late = await api.put(`/api/gym/sessions/${sessionId}/sets`).send({ exercise_key: 'bench_press_a', set_number: 2 });
    expect(late.status).toBe(400);
  });

  it('zeigt das höchste Gewicht als Bestleistung', async () => {
    const res = await api.get('/api/stats/records');
    expect(res.body.records).toEqual([
      { key: 'bench_press_a', name: 'Bankdrücken / Brustpresse', maxWeightKg: 47.5, maxReps: 10 }
    ]);
  });

  it('zählt Gym und tägliche Einheit ins Wochenziel (7× täglich + 2× Gym)', async () => {
    const res = await api.get('/api/stats/summary');
    expect(res.body.week).toMatchObject({ dailyDone: 1, gymDone: 1, done: 2, target: 9, pct: 22 });
    expect(res.body.streakDays).toBe(1);
  });
});

describe('Workouts verwalten', () => {
  it('überspringt deaktivierte Workouts in der Rotation', async () => {
    await api.patch('/api/workouts/B').send({ enabled: false });
    expect((await api.get('/api/gym/next')).body.workout).toBe('A');

    const session = await api.post('/api/gym/sessions').send({});
    await api.post(`/api/gym/sessions/${session.body.session.id}/complete`).send({});
    expect((await api.get('/api/gym/next')).body.workout).toBe('A');
  });

  it('kann ohne aktives Workout keins starten', async () => {
    await api.patch('/api/workouts/A').send({ enabled: false });
    expect((await api.get('/api/gym/next')).body.workout).toBeNull();
    expect((await api.post('/api/gym/sessions').send({})).status).toBe(400);
    await api.patch('/api/workouts/A').send({ enabled: true });
  });

  it('legt eigene Workouts an und prüft den Namen', async () => {
    expect((await api.post('/api/workouts').send({ name: '  ' })).status).toBe(400);
    const res = await api.post('/api/workouts').send({ name: 'C' });
    expect(res.status).toBe(201);
    expect(res.body.workout).toMatchObject({ name: 'C', enabled: 1 });
  });
});

describe('Übungen verwalten', () => {
  it('prüft neue Übungen auf Kategorie, Workout und Einheit', async () => {
    const base = { name: 'Wadenheben', sets: 3, target: 15, rest_seconds: 45 };
    expect((await api.post('/api/exercises').send({ ...base, category: 'cardio', unit: 'reps' })).status).toBe(400);
    expect((await api.post('/api/exercises').send({ ...base, category: 'gym', workout: 'X', unit: 'reps' })).status).toBe(400);
    expect((await api.post('/api/exercises').send({ ...base, category: 'gym', workout: 'A', unit: 'kg' })).status).toBe(400);

    const res = await api.post('/api/exercises').send({ ...base, category: 'gym', workout: 'A', unit: 'reps' });
    expect(res.status).toBe(201);
    expect(res.body.exercise).toMatchObject({ name: 'Wadenheben', workout: 'A', sets: 3, target: 15 });
  });

  it('ändert nur erlaubte Felder', async () => {
    const res = await api.patch('/api/exercises/plank').send({ target: 45, name: 'Umbenannt' });
    expect(res.body.exercise).toMatchObject({ key: 'plank', target: 45, name: 'Plank' });
  });

  it('sortiert nur mit genau den Übungen der Gruppe um', async () => {
    const daily = (await api.get('/api/exercises?category=daily')).body.exercises.map((e) => e.key);
    const wrong = await api.patch('/api/exercises/reorder').send({ category: 'daily', orderedKeys: daily.slice(1) });
    expect(wrong.status).toBe(400);

    const reversed = [...daily].reverse();
    const res = await api.patch('/api/exercises/reorder').send({ category: 'daily', orderedKeys: reversed });
    expect(res.body.exercises.map((e) => e.key)).toEqual(reversed);
  });
});
