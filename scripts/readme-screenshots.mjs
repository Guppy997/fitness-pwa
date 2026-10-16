// Erzeugt die Screenshots für die README per headless Chrome (DevTools-Protokoll,
// keine zusätzlichen Pakete). Voraussetzungen: Node 22+, Google Chrome, und die
// App läuft mit DEMO-Daten (siehe scripts/seed-demo.mjs):
//
//   Backend:  cd backend && DB_PATH=data/demo.sqlite TZ=Europe/Berlin npm start
//   Frontend: cd frontend && npm run dev
//   Dann:     node scripts/readme-screenshots.mjs
//
// Umgebungsvariablen: APP_URL (Standard http://127.0.0.1:5173/), CHROME_PATH,
// OUT_DIR (Standard docs/screenshots), CDP_PORT (Standard 9334)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_URL = (process.env.APP_URL || 'http://127.0.0.1:5173/').replace(/\/?$/, '/');
const OUT_DIR = path.resolve(process.env.OUT_DIR || path.join(root, 'docs', 'screenshots'));
const CDP_PORT = Number(process.env.CDP_PORT) || 9334;
const CHROME_PATH =
  process.env.CHROME_PATH ||
  (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = (p, init) => fetch(`${APP_URL}api/${p}`, init).then((r) => r.json());

// Sicherung: nur mit Demo-Daten fotografieren, nie mit dem echten Verlauf.
// seed-demo.mjs hinterlässt eine Session mit genau dieser Notiz.
const history = await api('gym/history?limit=100').catch(() => null);
if (!history) {
  console.error(`Keine App unter ${APP_URL} erreichbar.`);
  process.exit(1);
}
if (!history.sessions.some((s) => s.notes === 'Bankdrücken: neuer Bestwert')) {
  console.error('Abbruch: Die App zeigt keine Demo-Daten. Backend mit DB_PATH auf die Demo-Datenbank starten.');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fitness-pwa-shots-'));
const chrome = spawn(
  CHROME_PATH,
  [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profileDir}`,
    'about:blank'
  ],
  { stdio: 'ignore' }
);

const cdpJson = async (p) => (await fetch(`http://127.0.0.1:${CDP_PORT}${p}`)).json();
let version;
for (let i = 0; i < 50 && !version; i++) {
  await sleep(200);
  try {
    version = await cdpJson('/json/version');
  } catch {
    // Chrome startet noch
  }
}
const connect = async (url) => {
  const ws = new WebSocket(url);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    pending.get(m.id)?.(m);
    pending.delete(m.id);
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const i = ++id;
      pending.set(i, resolve);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  return { ws, send };
};

const browser = await connect(version.webSocketDebuggerUrl);
const page = await connect((await cdpJson('/json')).find((t) => t.type === 'page').webSocketDebuggerUrl);
const { send } = page;

const evaluate = async (expr) =>
  (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result
    ?.value;
const waitFor = async (expr) => {
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    if (await evaluate(`Boolean(${expr})`)) return;
  }
  throw new Error(`Timeout beim Warten auf: ${expr}`);
};
const click = (selector, text) =>
  evaluate(`(() => {
  const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
    .find((e) => ${text ? `e.textContent.includes(${JSON.stringify(text)})` : 'true'});
  if (!el) throw new Error('Nicht gefunden: ${selector} ${text ?? ''}');
  el.click();
})()`);
const scrollTo = (selector, margin = 16) =>
  evaluate(
    `window.scrollTo(0, document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().top + scrollY - ${margin})`
  );
const open = async () => {
  await send('Page.navigate', { url: APP_URL });
  await waitFor('document.querySelector(".hero-greeting") && document.querySelector(".week-goal")');
  await sleep(700);
};
const shot = async (name) => {
  await sleep(400);
  const { result } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, name), Buffer.from(result.data, 'base64'));
  console.log(`✓ ${path.relative(root, path.join(OUT_DIR, name))}`);
};

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  // 1) Startseite: Begrüßung, Monatsübersicht, Wochenziel, Gym-Karte
  await open();
  await shot('heute-handy.png');

  // 2) Tägliche Einheit aufgeklappt
  await click('.daily-header');
  await waitFor('document.querySelector(".daily-list")');
  await scrollTo('.daily-header', 90);
  await shot('taeglich-handy.png');

  // 3) Gym-Session: zwei Sätze abgehakt, dann läuft die Satzpause
  await scrollTo('.btn-primary', 300);
  await click('.btn-primary', 'starten');
  await waitFor('document.querySelectorAll(".set-btn").length > 3');
  await evaluate(`document.querySelectorAll('.set-btn')[0].click()`);
  await sleep(400);
  await evaluate(`document.querySelectorAll('.set-btn')[1].click()`);
  await waitFor('document.querySelector(".timer-overlay")');
  await sleep(1300);
  await shot('pause-handy.png');
  await click('.timer-overlay button', 'Überspringen');
  await evaluate(`document.querySelectorAll('.set-btn')[2].click()`);
  await waitFor('document.querySelector(".timer-overlay")');
  await click('.timer-overlay button', 'Überspringen');
  await sleep(300);
  await evaluate('window.scrollTo(0, 0)');
  await shot('workout-handy.png');

  // 4) Verlauf: Monat mit Heatmap, Kennzahlen und Monatssummen
  await open();
  await click('.nav-item', 'Verlauf');
  await waitFor('document.querySelector(".stat-row")');
  await shot('verlauf-handy.png');

  // 5) Verlauf weiter unten: Bestleistungen
  await evaluate(`(() => {
    const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.includes('Bestleistungen'));
    window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 16);
  })()`);
  await shot('bestleistungen-handy.png');

  // 6) Einstellungen: Übungen und Workouts
  await click('.nav-item', 'Einstellungen');
  await waitFor('document.querySelectorAll(".card").length > 2');
  // Die App behält beim Tab-Wechsel die Scrollposition des Verlaufs
  await evaluate('window.scrollTo(0, 0)');
  await shot('einstellungen-handy.png');
} finally {
  // Aufräumen: die für die Bilder gestartete Gym-Session wieder verwerfen
  const today = await api('gym/today').catch(() => null);
  if (today?.session && !today.session.completed_at) {
    await fetch(`${APP_URL}api/gym/sessions/${today.session.id}`, { method: 'DELETE' });
  }
  page.ws.close();
  browser.ws.close();
  chrome.kill();
  await sleep(500); // Chrome schreibt beim Beenden noch kurz ins Profil
  fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3 });
}
