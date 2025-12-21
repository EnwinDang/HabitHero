import { useState } from "react";
import {
  registerWithEmail,
  loginWithGoogle,
} from "../services/auth/auth.service";
import { Link, useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setLoading(true);
    setError(null);

    try {
      await registerWithEmail(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registratie mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Google registratie mislukt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>Account aanmaken</h1>

      <p>Start je avontuur 🚀</p>

      {error && <div className="error">{error}</div>}

      <div className="form">
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Wachtwoord (min. 6 tekens)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleRegister} disabled={loading}>
          {loading ? "Bezig..." : "Registreren"}
        </button>
      </div>

      <div className="divider">of</div>

      <button onClick={handleGoogleRegister} disabled={loading}>
        Registreer met Google
      </button>

      <p className="auth-footer">
        Al een account? <Link to="/login">Log hier in</Link>
      </p>
    </div>
  );
}
