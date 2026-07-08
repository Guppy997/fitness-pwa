import { useEffect, useRef, useState } from 'react';
import { formatClock, playChime } from '../constants.js';

export default function RestTimerOverlay({ seconds, exerciseName, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const left = seconds - elapsed;
      if (left <= 0) {
        setRemaining(0);
        if (!doneRef.current) {
          doneRef.current = true;
          playChime();
          clearInterval(id);
          onDone();
        }
      } else {
        setRemaining(left);
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="timer-overlay">
      <div className="timer-exercise">Pause — {exerciseName}</div>
      <div className="timer-count">{formatClock(remaining)}</div>
      <button className="btn-secondary" style={{ width: 'auto', padding: '10px 24px' }} onClick={onDone}>
        Überspringen
      </button>
    </div>
  );
}
