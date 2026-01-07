import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { loginWithEmail, loginWithGoogle } from "../services/auth/auth.service";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Redirect based on role after login or if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'teacher') {
        navigate('/teacher', { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="hh-auth">
        <div className="hh-auth__wrap">
          <div className="hh-card hh-auth__card" style={{ padding: '20px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--hh-muted)' }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  async function handleEmailLogin() {
    setLoading(true);
    setError(null);

    try {
      await loginWithEmail(email, password);
      console.log("✅ Email login successful");
      // Keep loading true - useEffect will redirect when user data is loaded
      // Loading will be reset when component unmounts or redirect happens
    } catch (err: any) {
      console.error("❌ Email login error:", err);
      setError(err.message || "Login mislukt");
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
      console.log("✅ Google login successful");
      // Keep loading true - useEffect will redirect when user data is loaded
      // Loading will be reset when component unmounts or redirect happens
    } catch (err: any) {
      console.error("❌ Google login error:", err);
      setError(err.message || "Google login mislukt");
      setLoading(false);
    }
  }

  return (
    <div className="hh-auth">
      <div className="hh-auth__wrap">
        <div className="hh-auth__header">
          <div className="hh-logo">HH</div>
          <div className="hh-title-sm">HabitHero</div>
        </div>

        <div className="hh-card hh-auth__card">
        <div className="hh-title" style={{ fontSize: 'clamp(18px, 4vw, 22px)' }}>Login</div>
        <div className="hh-hint" style={{ marginTop: 8 }}>
          Authenticate with your school email.
        </div>

        {error && (
          <div className="hh-hint" style={{ marginTop: 14, color: 'var(--hh-red, #ef4444)' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
          <div>
            <div className="hh-label">Email</div>
        <input
              ref={emailRef}
          type="email"
          value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  passwordRef.current?.focus();
                }
              }}
              placeholder="email@school.be"
              className="hh-input"
              style={{ marginTop: 8 }}
              disabled={loading}
            />
            <div className="hh-hint">Must be a valid school email (e.g. @school.be)</div>
          </div>

          <div>
            <div className="hh-label">Password</div>
        <input
              ref={passwordRef}
          type="password"
          value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  e.preventDefault();
                  handleEmailLogin();
                }
              }}
              placeholder="••••••••"
              className="hh-input"
              style={{ marginTop: 8 }}
              disabled={loading}
        />
          </div>

          <button
            type="button"
            onClick={handleEmailLogin}
            disabled={loading}
            className="hh-btn hh-btn-primary"
            style={{ width: '100%', paddingTop: 12, paddingBottom: 12 }}
          >
            {loading ? "Bezig..." : "Log in"}
        </button>

          <div className="hh-hint" style={{ textAlign: 'center' }}>
            of
      </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="hh-btn hh-btn-secondary"
            style={{ width: '100%', paddingTop: 12, paddingBottom: 12 }}
          >
            {loading ? "Bezig..." : "Login met Google"}
      </button>

          <div className="hh-hint" style={{ textAlign: 'center' }}>
            No account? <Link to="/register">Create account</Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
