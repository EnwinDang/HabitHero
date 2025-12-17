import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  return (
    <div className="hh-page" style={{ display: 'grid', gap: 18 }}>
      <div>
        <div className="hh-label">Profile</div>
        <div className="hh-title" style={{ marginTop: 8 }}>
          Profile & Settings
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="hh-card" style={{ padding: 22 }}>
          <div className="hh-title-sm">Profile Info</div>
          <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
            <div>
              <div className="hh-label">Name</div>
              <input 
                defaultValue={user?.displayName || ''} 
                className="hh-input" 
                style={{ marginTop: 8 }} 
                readOnly
              />
            </div>
            <div>
              <div className="hh-label">Email</div>
              <input
                readOnly
                value={user?.email || ''}
                className="hh-input"
                style={{ marginTop: 8, background: 'rgba(244,244,248,0.9)', cursor: 'not-allowed' }}
              />
            </div>
          </div>
        </div>

        <div className="hh-card" style={{ padding: 22 }}>
          <div className="hh-title-sm">Account</div>
          <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
            <div>
              <div className="hh-label">Change password</div>
              <input
                type="password"
                placeholder="New password"
                className="hh-input"
                style={{ marginTop: 8 }}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                className="hh-input"
                style={{ marginTop: 10 }}
              />
            </div>
            <button type="button" className="hh-btn hh-btn-secondary" style={{ justifySelf: 'start' }}>
              Update password
            </button>
          </div>
        </div>

        <div className="hh-card" style={{ padding: 22, gridColumn: '1 / -1' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="hh-btn hh-btn-danger"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
