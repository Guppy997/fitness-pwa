import { useState } from 'react';
import { APP_VERSION, CHANGELOG } from '../changelog.js';
import { IconClose } from '../icons.jsx';

// Registrierung des Service Workers passiert in App.jsx (immer), hier nur Anzeige
export default function AppFooter({ needRefresh, onUpdate }) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="app-footer">
      {needRefresh && (
        <button type="button" className="update-badge" onClick={onUpdate}>
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
