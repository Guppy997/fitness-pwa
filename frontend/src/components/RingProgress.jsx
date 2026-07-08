export default function RingProgress({ done, total, size = 96 }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const deg = (pct / 100) * 360;
  const innerSize = Math.round(size * 0.81);
  const fontSize = Math.max(12, Math.round(size * 0.23));

  return (
    <div className="ring-wrap" style={size !== 96 ? { marginBottom: 0 } : undefined}>
      <div
        className="ring"
        style={{ width: size, height: size, background: `conic-gradient(#10b981 ${deg}deg, #d1fae5 0deg)` }}
      >
        <div
          className="ring"
          style={{
            width: innerSize,
            height: innerSize,
            background: '#ffffff',
            position: 'absolute'
          }}
        >
          <span className="ring-label" style={{ fontSize }}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}
