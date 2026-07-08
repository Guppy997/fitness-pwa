import DailyChecklist from './DailyChecklist.jsx';
import GymCard from './GymCard.jsx';
import ContributionHeatmap from './ContributionHeatmap.jsx';
import RingProgress from './RingProgress.jsx';
import { greeting, formatFullDate, formatMonthLabel, currentMonth } from '../constants.js';

export default function Home({ daily, monthCells, week, onToggleDaily, nextWorkout, todaySession, onStartGym, onContinueGym }) {
  return (
    <div className="content">
      <div className="hero">
        <div className="hero-greeting">{greeting()}</div>
        <div className="hero-date">{formatFullDate()}</div>
      </div>

      {monthCells && (
        <div className="card">
          <h2>{formatMonthLabel(currentMonth())}</h2>
          <div className="month-week-row">
            <div className="heatmap-block">
              <ContributionHeatmap cells={monthCells} />
            </div>
            {week && (
              <>
                <div className="month-week-divider" />
                <div className="week-goal">
                  <RingProgress done={week.done} total={week.target} size={64} />
                  <div className="week-goal-label">Wochenziel</div>
                  <div className="week-goal-detail">
                    {week.dailyDone}/{week.dailyTarget} täglich<br />{week.gymDone}/{week.gymTarget} Gym
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <DailyChecklist daily={daily} onToggle={onToggleDaily} />
      <GymCard
        nextWorkout={nextWorkout}
        todaySession={todaySession}
        onStart={onStartGym}
        onContinue={onContinueGym}
      />
    </div>
  );
}
