export function Button({ children, ...props }) {
  return (
    <button type="button" {...props}>
      {children}
    </button>
  );
}
export function Header({ onHome, onTheme }) {
  return (
    <header className="site-header">
      <button
        className="brand"
        onClick={onHome}
        aria-label="Retour à l’accueil"
      >
        <svg className="compass" viewBox="0 0 100 100" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <circle cx="50" cy="50" r="3" fill="#C9982F" />
          <polygon points="50,10 56,50 50,90 44,50" fill="#D65B44" />
          <polygon points="10,50 50,44 90,50 50,56" fill="#2F8F6D" />
          <text
            x="50"
            y="12"
            textAnchor="middle"
            fontFamily="Fraunces,serif"
            fontSize="9"
            fill="currentColor"
          >
            N
          </text>
        </svg>
        <span className="brand-copy">
          <small>Carnet de voyage</small>
          <strong>Atlas des Drapeaux</strong>
        </span>
      </button>
      <button
        className="theme-toggle"
        onClick={onTheme}
        aria-label="Basculer le mode sombre"
        title="Mode sombre / clair"
      >
        🌙
      </button>
    </header>
  );
}
export function Back({ go, children }) {
  return (
    <button type="button" className="top-link" onClick={go}>
      {children || "← Retour"}
    </button>
  );
}
