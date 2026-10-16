import express from 'express';
import './db.js';
import exercisesRouter from './routes/exercises.js';
import dailyRouter from './routes/daily.js';
import gymRouter from './routes/gym.js';
import statsRouter from './routes/stats.js';
import workoutsRouter from './routes/workouts.js';

// Die Express-App ohne Server-Start: index.js startet sie, die API-Tests
// (test/) sprechen sie direkt über supertest an.
// nginx proxied /api/ auf denselben Origin wie das Frontend — kein CORS nötig.
export const app = express();
app.use(express.json());

app.use('/api/exercises', exercisesRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/gym', gymRouter);
app.use('/api/stats', statsRouter);
app.use('/api/workouts', workoutsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});
