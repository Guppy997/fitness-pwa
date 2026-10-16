import { useEffect, useRef, useState } from 'react';
import { IconGrip, IconTrash, IconPlus } from '../icons.jsx';
import { formatMMSS, parseMMSS } from '../constants.js';

const DAILY_GROUP = { key: 'daily', title: 'Täglich', category: 'daily', workout: null, filter: (e) => e.category === 'daily' };

function AddWorkoutForm({ onAdd, onDone }) {
  const [name, setName] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    onDone();
  };

  return (
    <div className="add-workout-form">
      <input
        type="text"
        placeholder="Name des Workouts (z.B. C)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoFocus
      />
      <button className="btn-ghost" onClick={onDone}>Abbrechen</button>
      <button className="btn-secondary" style={{ width: 'auto', padding: '10px 20px' }} onClick={submit}>
        Anlegen
      </button>
    </div>
  );
}

function WorkoutGroupHeader({ workout, onRename, onToggleEnabled, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(workout.name);

  useEffect(() => {
    setName(workout.name);
  }, [workout.name]);

  const commitRename = () => {
    setEditing(false);
    if (name.trim() && name.trim() !== workout.name) onRename(name.trim());
    else setName(workout.name);
  };

  return (
    <div className="workout-group-header">
      {editing ? (
        <input
          className="workout-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => e.key === 'Enter' && commitRename()}
          autoFocus
        />
      ) : (
        <h2 onClick={() => setEditing(true)}>Gym — Workout {workout.name}</h2>
      )}
      <div className="workout-group-actions">
        <button
          type="button"
          className={`toggle ${workout.enabled ? 'on' : ''}`}
          aria-label="Workout aktiv"
          onClick={() => onToggleEnabled(workout.enabled ? 0 : 1)}
        />
        <button
          className="delete-btn"
          onClick={() => window.confirm(`Workout "${workout.name}" inkl. aller Übungen wirklich löschen?`) && onDelete()}
        >
          <IconTrash width={16} height={16} />
        </button>
      </div>
    </div>
  );
}

function AddExerciseForm({ group, onAdd, onDone }) {
  const [name, setName] = useState('');
  const [sets, setSets] = useState(group.category === 'gym' ? 3 : 1);
  const [targetReps, setTargetReps] = useState(10);
  const [targetTime, setTargetTime] = useState('00:30');
  const [unit, setUnit] = useState('reps');
  const [restTime, setRestTime] = useState(group.category === 'gym' ? '01:00' : '00:00');

  const submit = () => {
    if (!name.trim()) return;
    const target = unit === 'seconds' ? parseMMSS(targetTime) : targetReps;
    const restSeconds = parseMMSS(restTime);
    if (target === null || target <= 0 || restSeconds === null) return;
    onAdd({
      name: name.trim(),
      category: group.category,
      workout: group.workout,
      sets,
      target,
      unit,
      rest_seconds: restSeconds
    });
    onDone();
  };

  return (
    <div className="add-exercise-form">
      <input
        type="text"
        placeholder="Name der Übung"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <div className="add-exercise-fields">
        <label>
          Sätze
          <input type="number" min="1" value={sets} onChange={(e) => setSets(Number(e.target.value))} />
        </label>
        <label>
          Einheit
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="reps">Wdh</option>
            <option value="seconds">Zeit</option>
          </select>
        </label>
        {unit === 'seconds' ? (
          <label>
            Ziel (mm:ss)
            <input type="text" inputMode="numeric" placeholder="00:00" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
          </label>
        ) : (
          <label>
            Ziel
            <input type="number" min="1" value={targetReps} onChange={(e) => setTargetReps(Number(e.target.value))} />
          </label>
        )}
        <label>
          Pause (mm:ss)
          <input type="text" inputMode="numeric" placeholder="00:00" value={restTime} onChange={(e) => setRestTime(e.target.value)} />
        </label>
      </div>
      <div className="add-exercise-actions">
        <button className="btn-ghost" onClick={onDone}>Abbrechen</button>
        <button className="btn-secondary" style={{ width: 'auto', padding: '10px 20px' }} onClick={submit}>
          Hinzufügen
        </button>
      </div>
    </div>
  );
}

function ExerciseSettingsCard({ exercise, onUpdate, onDelete, onGrab, innerRef }) {
  const commit = (field, value) => {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return;
    onUpdate(exercise.key, { [field]: num });
  };

  const commitDuration = (field, value) => {
    const seconds = parseMMSS(value);
    if (seconds === null) return;
    onUpdate(exercise.key, { [field]: seconds });
  };

  return (
    <div className="exercise-card" ref={innerRef}>
      <div className="exercise-card-top">
        <button className="grip-handle" onPointerDown={onGrab} aria-label="Verschieben">
          <IconGrip width={18} height={18} />
        </button>
        <div className="exercise-card-name">{exercise.name}</div>
      </div>

      <div className="exercise-card-fields">
        <label>
          <span>Sätze</span>
          <input type="number" min="1" defaultValue={exercise.sets} onBlur={(e) => commit('sets', e.target.value)} />
        </label>
        <label>
          <span>{exercise.unit === 'seconds' ? 'Ziel (mm:ss)' : 'Wdh'}</span>
          {exercise.unit === 'seconds' ? (
            <input
              type="text"
              inputMode="numeric"
              placeholder="00:00"
              defaultValue={formatMMSS(exercise.target)}
              onBlur={(e) => commitDuration('target', e.target.value)}
            />
          ) : (
            <input type="number" min="1" defaultValue={exercise.target} onBlur={(e) => commit('target', e.target.value)} />
          )}
        </label>
        <label>
          <span>Pause (mm:ss)</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="00:00"
            defaultValue={formatMMSS(exercise.rest_seconds)}
            onBlur={(e) => commitDuration('rest_seconds', e.target.value)}
          />
        </label>
      </div>

      <div className="exercise-card-bottom">
        <button
          type="button"
          className="exercise-toggle-label"
          onClick={() => onUpdate(exercise.key, { enabled: exercise.enabled ? 0 : 1 })}
        >
          <span className={`toggle ${exercise.enabled ? 'on' : ''}`} />
          Aktiv
        </button>
        <button
          className="delete-btn"
          onClick={() => window.confirm(`"${exercise.name}" wirklich entfernen?`) && onDelete(exercise.key)}
        >
          <IconTrash width={16} height={16} /> Entfernen
        </button>
      </div>
    </div>
  );
}

function DraggableExerciseGroup({ group, exercises, onUpdate, onDelete, onReorder }) {
  const [order, setOrder] = useState(() => exercises.map((e) => e.key));
  const [dragKey, setDragKey] = useState(null);
  const [dragY, setDragY] = useState(0);
  const itemRefs = useRef({});
  const dragMeta = useRef(null);

  useEffect(() => {
    if (!dragKey) setOrder(exercises.map((e) => e.key));
  }, [exercises, dragKey]);

  const byKey = Object.fromEntries(exercises.map((e) => [e.key, e]));

  const handleGrabStart = (key) => (e) => {
    e.preventDefault();
    const positions = order
      .map((k) => {
        const el = itemRefs.current[k];
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { key: k, center: rect.top + rect.height / 2 };
      })
      .filter(Boolean);
    const rect = itemRefs.current[key].getBoundingClientRect();

    dragMeta.current = {
      startClientY: e.clientY,
      startRectTop: rect.top,
      rectLeft: rect.left,
      rectWidth: rect.width,
      rectHeight: rect.height,
      positions
    };
    setDragKey(key);
    setDragY(e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragKey || !dragMeta.current) return;
    setDragY(e.clientY);
    const deltaY = e.clientY - dragMeta.current.startClientY;
    const currentCenter = dragMeta.current.startRectTop + dragMeta.current.rectHeight / 2 + deltaY;

    let closestIndex = 0;
    let closestDist = Infinity;
    dragMeta.current.positions.forEach((p, i) => {
      const dist = Math.abs(p.center - currentCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    });

    setOrder((prev) => {
      const currentIndex = prev.indexOf(dragKey);
      if (currentIndex === closestIndex) return prev;
      const next = [...prev];
      next.splice(currentIndex, 1);
      next.splice(closestIndex, 0, dragKey);
      return next;
    });
  };

  const handlePointerUp = () => {
    if (!dragKey) return;
    setDragKey(null);
    dragMeta.current = null;
    onReorder(group.category, group.workout, order);
  };

  const draggedExercise = dragKey ? byKey[dragKey] : null;

  return (
    <div
      className="exercise-list"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {order.map((key) => {
        const ex = byKey[key];
        if (!ex) return null;
        if (key === dragKey) {
          return (
            <div
              key={key}
              className="exercise-card-placeholder"
              style={{ height: dragMeta.current?.rectHeight || 0 }}
            />
          );
        }
        return (
          <ExerciseSettingsCard
            key={key}
            exercise={ex}
            innerRef={(el) => {
              itemRefs.current[key] = el;
            }}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onGrab={handleGrabStart(key)}
          />
        );
      })}

      {draggedExercise && dragMeta.current && (
        <div
          className="exercise-card exercise-card-dragging"
          style={{
            top: dragMeta.current.startRectTop + (dragY - dragMeta.current.startClientY),
            left: dragMeta.current.rectLeft,
            width: dragMeta.current.rectWidth
          }}
        >
          <div className="exercise-card-top">
            <span className="grip-handle"><IconGrip width={18} height={18} /></span>
            <div className="exercise-card-name">{draggedExercise.name}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings({
  exercises,
  workouts,
  onUpdate,
  onAdd,
  onDelete,
  onReorder,
  onAddWorkout,
  onUpdateWorkout,
  onDeleteWorkout
}) {
  const [addingFor, setAddingFor] = useState(null);
  const [addingWorkout, setAddingWorkout] = useState(false);

  const groups = [
    DAILY_GROUP,
    ...workouts.map((w) => ({
      key: w.key,
      title: `Gym — Workout ${w.name}`,
      category: 'gym',
      workout: w.key,
      filter: (e) => e.category === 'gym' && e.workout === w.key
    }))
  ];

  return (
    <div className="content">
      <h1>Einstellungen</h1>
      <p style={{ marginBottom: 8 }}>
        Sätze, Ziel und Pause pro Übung anpassbar. Am Griff-Symbol ziehen, um die Reihenfolge zu ändern.
        Deaktivierte Workouts werden bei der Rotation übersprungen.
      </p>
      {groups.map((group) => {
        const list = exercises.filter(group.filter);
        const workout = workouts.find((w) => w.key === group.workout);
        return (
          <div className="card" key={group.key}>
            {workout ? (
              <WorkoutGroupHeader
                workout={workout}
                onRename={(name) => onUpdateWorkout(workout.key, { name })}
                onToggleEnabled={(enabled) => onUpdateWorkout(workout.key, { enabled })}
                onDelete={() => onDeleteWorkout(workout.key)}
              />
            ) : (
              <h2>{group.title}</h2>
            )}
            <DraggableExerciseGroup
              group={group}
              exercises={list}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onReorder={onReorder}
            />

            {addingFor === group.key ? (
              <AddExerciseForm group={group} onAdd={onAdd} onDone={() => setAddingFor(null)} />
            ) : (
              <button className="btn-ghost add-exercise-btn" onClick={() => setAddingFor(group.key)}>
                <IconPlus width={16} height={16} /> Übung hinzufügen
              </button>
            )}
          </div>
        );
      })}

      <div className="card">
        {addingWorkout ? (
          <AddWorkoutForm onAdd={onAddWorkout} onDone={() => setAddingWorkout(false)} />
        ) : (
          <button className="btn-ghost add-exercise-btn" onClick={() => setAddingWorkout(true)}>
            <IconPlus width={16} height={16} /> Neues Workout anlegen
          </button>
        )}
      </div>
    </div>
  );
}
