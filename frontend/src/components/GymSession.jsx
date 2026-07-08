import { useState } from 'react';
import { formatSeconds, primeAudio } from '../constants.js';
import RestTimerOverlay from './RestTimerOverlay.jsx';
import { IconCheck } from '../icons.jsx';

export default function GymSession({ session, onLogSet, onUnlogSet, onComplete, onDiscard, onBack }) {
  const [weights, setWeights] = useState(() =>
    Object.fromEntries(session.exercises.map((e) => [e.key, e.last_weight_kg ?? '']))
  );
  const [restTimer, setRestTimer] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const isDone = (key, setNumber) =>
    session.sets.some((s) => s.exercise_key === key && s.set_number === setNumber);

  const handleSetTap = (ex, setNumber) => {
    if (isDone(ex.key, setNumber)) {
      onUnlogSet(ex.key, setNumber);
      return;
    }
    primeAudio();
    const weightVal = ex.unit === 'reps' && weights[ex.key] !== '' ? Number(weights[ex.key]) : null;
    onLogSet(ex.key, setNumber, ex.target, weightVal);
    if (ex.rest_seconds > 0) setRestTimer({ seconds: ex.rest_seconds, exerciseName: ex.name });
  };

  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets, 0);
  const doneSets = session.sets.length;

  return (
    <div className="content">
      <div className="gym-session-topbar">
        <button className="btn-ghost" onClick={onBack}>← Zurück</button>
        <button
          className="btn-ghost danger-text"
          onClick={() => window.confirm('Workout wirklich verwerfen? Alle Sätze gehen verloren.') && onDiscard()}
        >
          Verwerfen
        </button>
      </div>
      <h1>Workout {session.workout}</h1>

      <div className="card">
        <p>{doneSets}/{totalSets} Sätze erledigt</p>
        {session.exercises.map((ex) => (
          <div className="exercise-row" key={ex.key}>
            <div className="exercise-name">{ex.name}</div>
            <div className="exercise-meta">
              {ex.sets} × {formatSeconds(ex.unit, ex.target)}
              {ex.rest_seconds > 0 ? ` · ${ex.rest_seconds}s Pause` : ''}
            </div>
            <div className="set-grid">
              {Array.from({ length: ex.sets }, (_, i) => i + 1).map((setNumber) => (
                <div className="set-chip" key={setNumber}>
                  <span className="set-chip-label">Satz {setNumber}</span>
                  <button
                    className={`set-btn ${isDone(ex.key, setNumber) ? 'done' : ''}`}
                    onClick={() => handleSetTap(ex, setNumber)}
                  >
                    {isDone(ex.key, setNumber) ? <IconCheck width={18} height={18} /> : setNumber}
                  </button>
                </div>
              ))}
            </div>
            {ex.unit === 'reps' && (
              <div className="weight-input">
                <label htmlFor={`weight-${ex.key}`}>Gewicht</label>
                <input
                  id={`weight-${ex.key}`}
                  type="number"
                  inputMode="decimal"
                  placeholder="kg"
                  value={weights[ex.key]}
                  onChange={(e) => setWeights((prev) => ({ ...prev, [ex.key]: e.target.value }))}
                />
                <span>kg</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {showNotes ? (
        <div className="card">
          <h2>Notiz (optional)</h2>
          <textarea
            placeholder="z. B. Knie hat gezwickt, lief leichter als sonst…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div style={{ height: 12 }} />
          <button className="btn-primary" onClick={() => onComplete(notes)}>Workout abschließen</button>
        </div>
      ) : (
        <button className="btn-primary" onClick={() => setShowNotes(true)}>Workout abschließen</button>
      )}

      {restTimer && (
        <RestTimerOverlay
          seconds={restTimer.seconds}
          exerciseName={restTimer.exerciseName}
          onDone={() => setRestTimer(null)}
        />
      )}
    </div>
  );
}
