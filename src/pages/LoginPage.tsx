import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../services/api/firebase";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/home");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/home");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#0d0d0d] text-white">
      <div className="w-[420px] p-8 bg-black/40 rounded-xl shadow-lg border border-white/10">

        <h1 className="text-3xl font-bold text-center mb-6">HabitHero Login</h1>

        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

        <input 
          type="email" 
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="w-full p-3 mb-3 rounded bg-[#1a1a1a] border border-white/10"
        />

        <input 
          type="password" 
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          className="w-full p-3 mb-3 rounded bg-[#1a1a1a] border border-white/10"
        />

        <button 
          onClick={handleLogin}
          className="w-full bg-[#4c9aff] hover:bg-[#1f7aff] p-3 rounded-lg font-semibold mb-3">
          Login
        </button>

        <button 
          onClick={handleGoogleLogin}
          className="w-full bg-red-600 hover:bg-red-700 p-3 rounded-lg font-semibold">
          Sign in with Google
        </button>

        <p className="mt-4 text-center text-sm">
          No account? <Link className="text-blue-400" to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
