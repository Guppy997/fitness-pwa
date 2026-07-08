// Dezentes GitHub-Stil-Raster für genau einen Monat: Wochen als Spalten,
// kleine Kästchen. Bewusst kompakt statt eines großen Kalenders — läuft neben
// dem Wochenziel-Ring auf der Startseite.
const buildWeeks = (cells) => {
  const firstDate = new Date(cells[0].date);
  const isoWeekday = (firstDate.getDay() + 6) % 7; // Montag=0 ... Sonntag=6
  const padded = [...Array.from({ length: isoWeekday }, () => null), ...cells];
  while (padded.length % 7 !== 0) padded.push(null);

  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  return weeks;
};

const levelLabel = (level) => (level === 2 ? 'Daily + Gym' : level === 1 ? 'Trainiert' : 'Keine Session');

export default function ContributionHeatmap({ cells }) {
  if (!cells.length) return null;

  const weeks = buildWeeks(cells);

  return (
    <div className="heatmap-grid">
      {weeks.map((week, wi) => (
        <div className="heatmap-week" key={wi}>
          {week.map((cell, di) =>
            cell ? (
              <div
                key={cell.date}
                className="heatmap-cell"
                data-level={cell.level}
                title={`${cell.date}: ${levelLabel(cell.level)}`}
              />
            ) : (
              <div key={`pad-${wi}-${di}`} className="heatmap-cell empty" />
            )
          )}
        </div>
      ))}
    </div>
  );
}
