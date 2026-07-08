import express from 'express';
import './db.js';
import exercisesRouter from './routes/exercises.js';
import dailyRouter from './routes/daily.js';
import gymRouter from './routes/gym.js';
import statsRouter from './routes/stats.js';

// nginx proxied /api/ auf denselben Origin wie das Frontend — kein CORS nötig
// (siehe lern-pwa-Muster, gleicher Grund).
if (process.env.TZ !== 'Europe/Berlin') {
  console.error(
    `FEHLER: TZ ist "${process.env.TZ}", erwartet "Europe/Berlin". ` +
    `Tagesgrenzen/Streaks rechnen sonst falsch. Beende.`
  );
  process.exit(1);
}

const app = express();
app.use(express.json());

app.use('/api/exercises', exercisesRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/gym', gymRouter);
app.use('/api/stats', statsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Fitness-PWA backend läuft auf Port ${port}`));
