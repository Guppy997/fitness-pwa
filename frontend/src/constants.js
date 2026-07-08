const pad = (n) => String(n).padStart(2, '0');

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 17) return 'Guten Tag';
  return 'Guten Abend';
};

export const formatFullDate = () =>
  new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

export const currentMonth = () => today().slice(0, 7);

export const formatMonthLabel = (monthStr) => {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
};

export const shiftMonth = (monthStr, delta) => {
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const formatShortDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
};

export const formatSeconds = (unit, target) => {
  if (unit === 'seconds') {
    if (target >= 60) return `${Math.round(target / 60)} min`;
    return `${target} sec`;
  }
  return `${target} Wdh`;
};

export const formatClock = (totalSeconds) => {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${pad(rest)}`;
};

// mm:ss statt roher Sekundenzahl — für Ziel-Sekunden (Plank, Dehnen, …) und
// die Satzpause, die sich als reine Sekundenzahl schlecht liest ("90" vs "01:30")
export const formatMMSS = (totalSeconds) => {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

export const parseMMSS = (text) => {
  const match = /^(\d{1,3}):([0-5]?\d)$/.exec(String(text).trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

// Ein einziger, wiederverwendeter AudioContext (siehe lern-pwa: Browser
// suspendieren einen Context, der außerhalb einer echten Nutzergeste entsteht).
let audioCtx = null;
const getAudioContext = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
};

export const primeAudio = () => {
  try {
    getAudioContext()?.resume();
  } catch {
    // ignorieren
  }
};

export const playChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.5);
    });
  } catch {
    // Web Audio nicht verfügbar — Timer-UI zeigt das Ende ohnehin an
  }
};
