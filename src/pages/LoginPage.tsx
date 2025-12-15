import { useState } from "react";
import { loginWithEmail, loginWithGoogle } from "../services/auth/auth.service";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailLogin() {
    setLoading(true);
    setError(null);

    try {
      await loginWithEmail(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Google login mislukt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>Inloggen</h1>

      <p>Welkom terug 👋</p>

      {error && <div className="error">{error}</div>}

      <div className="form">
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Wachtwoord"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button onClick={handleEmailLogin} disabled={loading}>
          {loading ? "Bezig..." : "Login"}
        </button>
      </div>

      <div className="divider">of</div>

      <button onClick={handleGoogleLogin} disabled={loading}>
        Login met Google
      </button>

      <p className="auth-footer">
        Nog geen account?{" "}
        <Link to="/register">Registreer hier</Link>
      </p>
    </div>
  );
}
