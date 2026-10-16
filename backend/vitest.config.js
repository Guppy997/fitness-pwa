import { defineConfig } from 'vitest/config';

// Jede Testdatei läuft in einem eigenen Prozess und bekommt so eine frische
// In-Memory-Datenbank; db.js legt Schema, Workouts A/B und Standard-Übungen an.
export default defineConfig({
  test: {
    env: {
      TZ: 'Europe/Berlin',
      DB_PATH: ':memory:'
    }
  }
});
