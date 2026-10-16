import { useEffect, useState } from 'react';
import { api } from './api.js';
import { today, currentMonth } from './constants.js';
import NavBar from './components/NavBar.jsx';
import Home from './components/Home.jsx';
import GymSession from './components/GymSession.jsx';
import History from './components/History.jsx';
import Settings from './components/Settings.jsx';
import AppFooter from './components/AppFooter.jsx';

export default function App() {
  const [view, setView] = useState('loading'); // loading | home | gym-session | history | settings
  const [daily, setDaily] = useState(null);
  const [nextWorkout, setNextWorkout] = useState('A');
  const [todaySession, setTodaySession] = useState(null);
  const [monthCells, setMonthCells] = useState(null);
  const [week, setWeek] = useState(null);
  const [gymSession, setGymSession] = useState(null);
  const [exercises, setExercises] = useState(null);
  const [workouts, setWorkouts] = useState(null);
  const [error, setError] = useState(null);

  const guard = (fn) => (...args) => Promise.resolve(fn(...args)).catch((err) => setError(err.message));

  const loadHome = async () => {
    const [dailyRes, nextRes, todayRes, heatmapRes, summaryRes] = await Promise.all([
      api.getDaily(today()),
      api.getNextWorkout(),
      api.getTodayGym(),
      api.getMonthHeatmap(currentMonth()),
      api.getSummary()
    ]);
    setDaily(dailyRes);
    setNextWorkout(nextRes.workout);
    setTodaySession(todayRes.session);
    setMonthCells(heatmapRes.cells);
    setWeek(summaryRes.week);
    setView('home');
  };

  const refreshWeek = () => {
    api.getSummary().then((res) => setWeek(res.week)).catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadHome().catch((err) => setError(err.message));
  }, []);

  // Hält die Mini-Heatmap auf der Startseite live in Sync, ohne bei jedem
  // Toggle/Abschluss den ganzen Monat neu vom Server zu laden.
  const updateTodayCell = (hasDaily, hasGym) => {
    setMonthCells((prev) => {
      if (!prev) return prev;
      const level = hasDaily && hasGym ? 2 : hasDaily || hasGym ? 1 : 0;
      return prev.map((c) => (c.date === today() ? { ...c, level } : c));
    });
  };

  const handleToggleDaily = guard(async (key) => {
    const result = await api.toggleDaily(today(), key);
    setDaily(result);
    updateTodayCell(Boolean(result.completed_at), Boolean(todaySession?.completed_at));
    refreshWeek();
  });

  const handleStartGym = guard(async () => {
    const { session } = await api.startGymSession();
    setGymSession(session);
    setTodaySession(session);
    setView('gym-session');
  });

  const handleContinueGym = () => {
    setGymSession(todaySession);
    setView('gym-session');
  };

  const handleLogSet = guard(async (exerciseKey, setNumber, repsDone, weightKg) => {
    const { session } = await api.logSet(gymSession.id, {
      exercise_key: exerciseKey,
      set_number: setNumber,
      reps_done: repsDone,
      weight_kg: weightKg
    });
    setGymSession(session);
    setTodaySession(session);
  });

  const handleUnlogSet = guard(async (exerciseKey, setNumber) => {
    const { session } = await api.unlogSet(gymSession.id, { exercise_key: exerciseKey, set_number: setNumber });
    setGymSession(session);
    setTodaySession(session);
  });

  const handleDiscardGym = guard(async () => {
    await api.deleteGymSession(gymSession.id);
    setGymSession(null);
    setTodaySession(null);
    setView('home');
  });

  const handleCompleteGym = guard(async (notes) => {
    const { session } = await api.completeGymSession(gymSession.id, notes);
    setTodaySession(session);
    updateTodayCell(Boolean(daily?.completed_at), true);
    refreshWeek();
    const { workout } = await api.getNextWorkout();
    setNextWorkout(workout);
    setGymSession(null);
    setView('home');
  });

  const loadSettings = guard(async () => {
    const [{ exercises: list }, { workouts: workoutList }] = await Promise.all([
      api.getExercises(),
      api.getWorkouts()
    ]);
    setExercises(list);
    setWorkouts(workoutList);
    setView('settings');
  });

  const handleUpdateExercise = guard(async (key, data) => {
    await api.updateExercise(key, data);
    const { exercises: list } = await api.getExercises();
    setExercises(list);
  });

  const handleAddExercise = guard(async (data) => {
    await api.createExercise(data);
    const { exercises: list } = await api.getExercises();
    setExercises(list);
  });

  const handleDeleteExercise = guard(async (key) => {
    await api.deleteExercise(key);
    const { exercises: list } = await api.getExercises();
    setExercises(list);
  });

  const handleReorderExercises = guard(async (category, workout, orderedKeys) => {
    const { exercises: updated } = await api.reorderExercises(category, workout, orderedKeys);
    setExercises((prev) => {
      const others = prev.filter((e) => !updated.some((u) => u.key === e.key));
      return [...others, ...updated];
    });
  });

  const handleAddWorkout = guard(async (name) => {
    await api.createWorkout(name);
    const { workouts: list } = await api.getWorkouts();
    setWorkouts(list);
  });

  const handleUpdateWorkout = guard(async (key, data) => {
    await api.updateWorkout(key, data);
    const { workouts: list } = await api.getWorkouts();
    setWorkouts(list);
  });

  const handleDeleteWorkout = guard(async (key) => {
    await api.deleteWorkout(key);
    const [{ workouts: list }, { exercises: exList }] = await Promise.all([api.getWorkouts(), api.getExercises()]);
    setWorkouts(list);
    setExercises(exList);
  });

  const handleNavChange = (tab) => {
    if (tab === 'home') loadHome().catch((err) => setError(err.message));
    else if (tab === 'history') setView('history');
    else if (tab === 'settings') loadSettings();
  };

  const activeTab = view === 'gym-session' ? 'home' : view === 'loading' ? 'home' : view;

  const renderView = () => {
    if (error) {
      return (
        <div className="content">
          <div className="card">
            <h1>Fehler</h1>
            <p className="error">{error}</p>
            <button className="btn-primary" onClick={() => { setError(null); loadHome().catch((err) => setError(err.message)); }}>
              Zurück zu Heute
            </button>
          </div>
        </div>
      );
    }

    switch (view) {
      case 'loading':
        return <div className="content"><p>Lade…</p></div>;

      case 'home':
        return (
          <Home
            daily={daily}
            monthCells={monthCells}
            week={week}
            onToggleDaily={handleToggleDaily}
            nextWorkout={nextWorkout}
            todaySession={todaySession}
            onStartGym={handleStartGym}
            onContinueGym={handleContinueGym}
          />
        );

      case 'gym-session':
        return (
          <GymSession
            session={gymSession}
            onLogSet={handleLogSet}
            onUnlogSet={handleUnlogSet}
            onComplete={handleCompleteGym}
            onDiscard={handleDiscardGym}
            onBack={() => setView('home')}
          />
        );

      case 'history':
        return <History />;

      case 'settings':
        return (
          <Settings
            exercises={exercises}
            workouts={workouts}
            onUpdate={handleUpdateExercise}
            onAdd={handleAddExercise}
            onDelete={handleDeleteExercise}
            onReorder={handleReorderExercises}
            onAddWorkout={handleAddWorkout}
            onUpdateWorkout={handleUpdateWorkout}
            onDeleteWorkout={handleDeleteWorkout}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      {renderView()}
      {view === 'settings' && <AppFooter />}
      {view !== 'gym-session' && <NavBar active={activeTab} onChange={handleNavChange} />}
    </div>
  );
}
