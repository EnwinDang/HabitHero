import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, db, googleProvider, set, ref } from "../services/api/firebase";
import { Link, useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const createNewHero = async (uid: string) => {
    await set(ref(db, "users/" + uid), {
      level: 1,
      xp: 0,
      gold: 0,
      stamina: 100,
      maxStamina: 100,
      heroStats: {
        damage: 5,
        defense: 5,
        health: 100,
        critChance: 0.05,
        critDamage: 1.5
      },
      createdAt: Date.now()
    });
  };

  const handleRegister = async () => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await createNewHero(userCred.user.uid);
      navigate("/home");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await createNewHero(res.user.uid);
      navigate("/home");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#0d0d0d] text-white">
      <div className="w-[420px] p-8 bg-black/40 rounded-xl shadow-lg border border-white/10">

        <h1 className="text-3xl font-bold text-center mb-6">Register</h1>

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
          onClick={handleRegister}
          className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold mb-3">
          Register
        </button>

        <button 
          onClick={handleGoogleRegister}
          className="w-full bg-red-600 hover:bg-red-700 p-3 rounded-lg font-semibold">
          Register with Google
        </button>

        <p className="mt-4 text-center text-sm">
          Already have an account? <Link className="text-blue-400" to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
