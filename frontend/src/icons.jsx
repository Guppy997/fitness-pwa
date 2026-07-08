// Ein konsistentes, minimalistisches Icon-Set (Outline-Stil, currentColor) —
// ersetzt Emoji/Zeichen, die je nach Gerät unterschiedlich und unruhig aussehen.
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

export const IconToday = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 5-5.5" />
  </svg>
);

export const IconHistory = (props) => (
  <svg {...base} {...props}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 10h17" />
    <path d="M8 3v4M16 3v4" />
  </svg>
);

export const IconSettings = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.7 6.3l-1.55 1.55M7.85 16.15L6.3 17.7M17.7 17.7l-1.55-1.55M7.85 7.85L6.3 6.3" />
  </svg>
);

export const IconCheck = (props) => (
  <svg {...base} strokeWidth={2.6} {...props}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

export const IconPlus = (props) => (
  <svg {...base} {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconTrash = (props) => (
  <svg {...base} {...props}>
    <path d="M4 7h16" />
    <path d="M9 7V4.8c0-.44.36-.8.8-.8h4.4c.44 0 .8.36.8.8V7" />
    <path d="M6 7l.7 12.1c.05.99.87 1.9 1.86 1.9h6.88c.99 0 1.81-.91 1.86-1.9L18 7" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IconChevronUp = (props) => (
  <svg {...base} {...props}>
    <path d="M6 15l6-6 6 6" />
  </svg>
);

export const IconChevronDown = (props) => (
  <svg {...base} {...props}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const IconClose = (props) => (
  <svg {...base} {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconGrip = (props) => (
  <svg {...base} {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconDumbbell = (props) => (
  <svg {...base} {...props}>
    <path d="M6.5 9.5v5M4.5 10.7v2.6M17.5 9.5v5M19.5 10.7v2.6" />
    <path d="M6.5 12h11" />
  </svg>
);
