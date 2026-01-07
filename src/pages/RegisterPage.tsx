import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  registerWithEmail,
  loginWithGoogle,
} from "../services/auth/auth.service";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  // Redirect based on role after registration or if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      if (user.role === 'teacher' || user.role === 'admin') {
        navigate('/teacher', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
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

  async function handleRegister() {
    setLoading(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      await registerWithEmail(email, password, fullName.trim() || undefined);
      console.log("✅ Registration successful");
      // Keep loading true - useEffect will redirect when user data is loaded
      // Loading will be reset when component unmounts or redirect happens
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
      console.log("✅ Google registration successful");
      // Keep loading true - useEffect will redirect when user data is loaded
      // Loading will be reset when component unmounts or redirect happens
    } catch (err: any) {
      setError(err.message || "Google registration failed");
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
          <div className="hh-title" style={{ fontSize: 'clamp(18px, 4vw, 22px)' }}>Create Account</div>
          <div className="hh-hint" style={{ marginTop: 8 }}>
            Set up your profile.
          </div>

          {error && (
            <div className="hh-hint" style={{ marginTop: 14, color: 'var(--hh-red, #ef4444)' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
            <div>
              <div className="hh-label">Full name</div>
              <input
                ref={fullNameRef}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    emailRef.current?.focus();
                  }
                }}
                placeholder="Full name"
                className="hh-input"
                style={{ marginTop: 8 }}
                disabled={loading}
              />
            </div>
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
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmPasswordRef.current?.focus();
                  }
                }}
                placeholder="••••••••"
                className="hh-input"
                style={{ marginTop: 8 }}
                disabled={loading}
              />
              <div className="hh-hint">Minimum 6 characters</div>
            </div>
            <div>
              <div className="hh-label">Confirm password</div>
              <input
                ref={confirmPasswordRef}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    e.preventDefault();
                    handleRegister();
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
              onClick={handleRegister}
              disabled={loading}
              className="hh-btn hh-btn-primary"
              style={{ width: '100%', paddingTop: 12, paddingBottom: 12 }}
            >
              {loading ? "Bezig..." : "Create account"}
        </button>

            <div className="hh-hint" style={{ textAlign: 'center' }}>
              of
      </div>

            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={loading}
              className="hh-btn hh-btn-secondary"
              style={{ width: '100%', paddingTop: 12, paddingBottom: 12 }}
            >
              {loading ? "Bezig..." : "Register with Google"}
      </button>

            <div className="hh-hint" style={{ textAlign: 'center' }}>
              Already have an account? <Link to="/login">Log in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
