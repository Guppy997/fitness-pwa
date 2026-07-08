import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { APP_VERSION, CHANGELOG } from '../changelog.js';
import { IconClose } from '../icons.jsx';

export default function AppFooter() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW();

  return (
    <div className="app-footer">
      {needRefresh && (
        <button type="button" className="update-badge" onClick={() => updateServiceWorker(true)}>
          Update verfügbar
        </button>
      )}

      <button
        type="button"
        className="version-badge"
        onClick={() => setHistoryOpen((o) => !o)}
        aria-expanded={historyOpen}
      >
        v{APP_VERSION}
      </button>

      {historyOpen && (
        <div className="version-history-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="version-history" onClick={(e) => e.stopPropagation()}>
            <div className="version-history-header">
              <p className="settings-group-title">Versionsverlauf</p>
              <button type="button" className="icon-btn" onClick={() => setHistoryOpen(false)} aria-label="Schließen">
                <IconClose width={18} height={18} />
              </button>
            </div>
            <ul>
              {CHANGELOG.map((entry) => (
                <li key={entry.version}>
                  <div className="version-history-head">
                    <strong>v{entry.version}</strong>
                    <span className="version-date">{entry.date}</span>
                  </div>
                  <ul>
                    {entry.notes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
