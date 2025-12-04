import { useState } from "react";
import { register } from "../services/api/auth";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister() {
    try {
      const uid = await register(email, password);
      alert("Account created! Level 1 hero ready.");
      window.location.href = "/home";
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div>
      <h2>Create Account</h2>

      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />

      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />

      <button onClick={handleRegister}>Register</button>
    </div>
  );
}
