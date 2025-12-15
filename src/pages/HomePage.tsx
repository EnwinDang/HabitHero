import { useEffect, useState } from "react";
import { getCurrentUser, logout } from "../services/auth/auth.service";
import { loadTasks } from "../services/task.service";
import type { User } from "../models/user.model";
import type { Task } from "../models/task.model";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const me = await getCurrentUser();

      if (!me) {
        navigate("/login");
        return;
      }

      setUser(me);
      const tasks = await loadTasks();
      setTasks(tasks);
      setLoading(false);
    }

    init();
  }, [navigate]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (loading) {
    return <p>Dashboard laden...</p>;
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <div>
          <h1>Welkom {user?.displayName}</h1>
          <p>Level {user?.stats.level}</p>
        </div>

        <button onClick={handleLogout}>Uitloggen</button>
      </header>

      <section className="stats">
        <div>
          <strong>XP</strong>
          <span>{user?.stats.xp}</span>
        </div>
        <div>
          <strong>Gold</strong>
          <span>{user?.stats.gold}</span>
        </div>
      </section>

      <section className="tasks">
        <h2>Vandaag</h2>

        {tasks.length === 0 ? (
          <p>Geen taken 🎉</p>
        ) : (
          <ul>
            {tasks.map(task => (
              <li key={task.taskId}>
                <strong>{task.title}</strong>
                <span> ({task.difficulty})</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
