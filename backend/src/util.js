const pad = (n) => String(n).padStart(2, '0');

// new Date() liefert lokale Feld-Getter im Prozess-TZ (TZ=Europe/Berlin, siehe
// docker-compose.yml) — kein manuelles Offset-Rechnen nötig, solange TZ gesetzt ist.
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const dateNDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Für frei angelegte Übungen: menschenlesbarer Basis-Key aus dem Namen +
// Zufalls-Suffix (Kollisionen bei Umlauten/Sonderzeichen sind sonst zu leicht möglich)
export const slugify = (name) => {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base || 'uebung'}-${Math.random().toString(36).slice(2, 7)}`;
};

// Montag als Wochenstart (ISO), Rückgabe als YYYY-MM-DD
export const startOfIsoWeek = () => {
  const d = new Date();
  const day = d.getDay() || 7; // Sonntag=0 -> 7
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
