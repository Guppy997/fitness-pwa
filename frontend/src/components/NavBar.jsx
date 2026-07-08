import { IconToday, IconHistory, IconSettings } from '../icons.jsx';

const TABS = [
  { id: 'home', label: 'Heute', Icon: IconToday },
  { id: 'history', label: 'Verlauf', Icon: IconHistory },
  { id: 'settings', label: 'Einstellungen', Icon: IconSettings }
];

export default function NavBar({ active, onChange }) {
  return (
    <nav className="nav-bar">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`nav-item ${active === id ? 'active' : ''}`}
          onClick={() => onChange(id)}
        >
          <Icon className="nav-icon" />
          {label}
        </button>
      ))}
    </nav>
  );
}
