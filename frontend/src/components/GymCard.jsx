import { IconCheck } from '../icons.jsx';

export default function GymCard({ nextWorkout, todaySession, onStart, onContinue }) {
  if (todaySession?.completed_at) {
    return (
      <div className="card">
        <h2>Gym</h2>
        <span className="workout-badge">Workout {todaySession.workout}</span>
        <p className="done-hint"><IconCheck width={16} height={16} /> Heute schon erledigt.</p>
      </div>
    );
  }

  if (todaySession) {
    const donesets = todaySession.sets.length;
    const totalSets = todaySession.exercises.reduce((sum, e) => sum + e.sets, 0);
    return (
      <div className="card">
        <h2>Gym</h2>
        <span className="workout-badge">Workout {todaySession.workout}</span>
        <p>{donesets}/{totalSets} Sätze erledigt</p>
        <button className="btn-primary" onClick={onContinue}>Weiter</button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Gym</h2>
      <span className="workout-badge">Workout {nextWorkout}</span>
      <p>Nächstes Workout in der Rotation.</p>
      <button className="btn-primary" onClick={onStart}>Workout {nextWorkout} starten</button>
    </div>
  );
}
