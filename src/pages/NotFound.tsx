import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="hh-page">
      <div className="hh-card" style={{ padding: 22, maxWidth: 680, margin: '24px auto' }}>
        <div className="hh-label">Error</div>
        <div className="hh-title" style={{ marginTop: 8 }}>
          Page not found
        </div>
        <div className="hh-hint" style={{ marginTop: 10 }}>
          The page you are looking for doesn't exist.
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            to="/dashboard"
            className="hh-btn hh-btn-primary"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/login"
            className="hh-btn hh-btn-secondary"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

