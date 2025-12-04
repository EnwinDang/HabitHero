import { useState } from "react";
import { login } from "../services/api/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    try {
      const uid = await login(email, password);
      alert("Logged in!");
      window.location.href = "/home";
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div>
      <h2>Login</h2>

      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />

      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />

      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
