import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { currentMonth, formatMonthLabel, shiftMonth, formatShortDate, formatSeconds } from '../constants.js';
import { IconChevronUp, IconChevronDown, IconTrash } from '../icons.jsx';
import ContributionHeatmap from './ContributionHeatmap.jsx';

export default function History() {
  const [month, setMonth] = useState(currentMonth());
  const [monthCells, setMonthCells] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [records, setRecords] = useState(null);
  const [streak, setStreak] = useState(null);
  const [error, setError] = useState(null);

  // Streak/Bestleistungen sind bewusst nicht ans Monats-Umschalten gekoppelt —
  // Streak ist per Definition "bis heute", Bestleistungen gelten über alle Zeit.
  useEffect(() => {
    Promise.all([api.getRecords(), api.getSummary()])
      .then(([recordsRes, summaryRes]) => {
        setRecords(recordsRes.records);
        setStreak(summaryRes.streakDays);
      })
      .catch((err) => setError(err.message));
  }, []);

  const loadMonth = (m) => {
    Promise.all([api.getMonthHeatmap(m), api.getMonthlyStats(m), api.getGymHistoryForMonth(m)])
      .then(([heatmapRes, monthlyRes, historyRes]) => {
        setMonthCells(heatmapRes.cells);
        setMonthly(monthlyRes);
        setSessions(historyRes.sessions);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadMonth(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Dieses Workout wirklich löschen?')) return;
    try {
      await api.deleteGymSession(id);
      loadMonth(month);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) {
    return (
      <div className="content">
        <div className="card"><p className="error">{error}</p></div>
      </div>
    );
  }

  if (!monthCells || !monthly || !sessions || !records || streak === null) {
    return <div className="content"><p>Lade…</p></div>;
  }

  return (
    <div className="content">
      <h1>Verlauf</h1>

      <div className="card">
        <div className="month-nav">
          <button className="icon-btn" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Vorheriger Monat">
            <IconChevronUp width={18} height={18} style={{ transform: 'rotate(-90deg)' }} />
          </button>
          <h2 style={{ margin: 0 }}>{formatMonthLabel(month)}</h2>
          <button
            className="icon-btn"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={month >= currentMonth()}
            aria-label="Nächster Monat"
          >
            <IconChevronDown width={18} height={18} style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </div>

        <ContributionHeatmap cells={monthCells} />

        <div className="stat-row">
          <div className="stat-box">
            <div className="stat-value">{monthly.dailyCompletedDays}</div>
            <div className="stat-label">Tage komplett</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{monthly.gymSessionsCompleted}</div>
            <div className="stat-label">Gym-Sessions</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{streak}</div>
            <div className="stat-label">Tage Streak</div>
          </div>
        </div>

        {monthly.dailyTotals.length > 0 && (
          <>
            <p className="settings-group-title">Tägliche Übungen</p>
            {monthly.dailyTotals.map((t) => (
              <div className="total-row" key={t.key}>
                <span>{t.name}</span>
                <span className="total-value">{formatSeconds(t.unit, t.total)} · {t.days} Tage</span>
              </div>
            ))}
          </>
        )}

        {monthly.gymTotals.length > 0 && (
          <>
            <p className="settings-group-title">Gym-Übungen</p>
            {monthly.gymTotals.map((t) => (
              <div className="total-row" key={t.key}>
                <span>{t.name}</span>
                <span className="total-value">
                  {formatSeconds(t.unit, t.total)} · {t.setsLogged} Sätze
                  {t.maxWeightKg ? ` · ${t.maxWeightKg} kg` : ''}
                </span>
              </div>
            ))}
          </>
        )}

        {monthly.dailyTotals.length === 0 && monthly.gymTotals.length === 0 && (
          <div className="empty-hint">Keine Sessions in diesem Monat.</div>
        )}
      </div>

      {records.length > 0 && (
        <div className="card">
          <h2>Bestleistungen</h2>
          {records.map((r) => (
            <div className="total-row" key={r.key}>
              <span>{r.name}</span>
              <span className="total-value">{r.maxWeightKg} kg{r.maxReps ? ` · ${r.maxReps} Wdh` : ''}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Gym-Sessions — {formatMonthLabel(month)}</h2>
        {sessions.length === 0 && <div className="empty-hint">Keine abgeschlossene Session in diesem Monat.</div>}
        {sessions.map((s) => (
          <div className="checklist-item" key={s.id}>
            <div className="checklist-label">
              <div className="checklist-name">{formatShortDate(s.date)} — Workout {s.workout}</div>
              {s.notes && <div className="checklist-target">{s.notes}</div>}
            </div>
            <button className="icon-btn danger" onClick={() => handleDeleteSession(s.id)} aria-label="Workout löschen">
              <IconTrash width={16} height={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
