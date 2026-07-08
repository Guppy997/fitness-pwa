import { useState } from 'react';
import RingProgress from './RingProgress.jsx';
import { formatSeconds } from '../constants.js';
import { IconCheck, IconChevronDown } from '../icons.jsx';

export default function DailyChecklist({ daily, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const done = daily.exercises.filter((e) => e.done).length;
  const total = daily.exercises.length;

  return (
    <div className="card">
      <button className="daily-header" onClick={() => setExpanded((x) => !x)} aria-expanded={expanded}>
        <div className="daily-header-text">
          <h2>Tägliche Einheit</h2>
          <span className="daily-header-hint">{done}/{total} erledigt</span>
        </div>
        <RingProgress done={done} total={total} size={48} />
        <IconChevronDown
          width={18}
          height={18}
          className="daily-header-chevron"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {expanded && (
        <div className="daily-list">
          {daily.exercises.map((ex) => (
            <div className="checklist-item" key={ex.key} onClick={() => onToggle(ex.key)}>
              <div className={`checkbox ${ex.done ? 'checked' : ''}`}>{ex.done && <IconCheck width={16} height={16} />}</div>
              <div className="checklist-label">
                <div className={`checklist-name ${ex.done ? 'done' : ''}`}>{ex.name}</div>
                <div className="checklist-target">{formatSeconds(ex.unit, ex.target)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
