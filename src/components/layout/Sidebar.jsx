import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  BookOpen, 
  Users, 
  User, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function NavItem({ to, label, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
    <NavLink
      to={to}
      className={({ isActive }) =>
        ['hh-nav__item', isActive ? 'hh-nav__item--active' : ''].join(' ')
      }
    >
        {Icon && (
          <Icon 
            style={{ 
              width: 16, 
              height: 16,
              flexShrink: 0
            }} 
          />
        )}
      <span className="hh-nav__label">{label}</span>
    </NavLink>
    </motion.div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  return (
    <aside className={`hh-sidebar ${isMobileMenuOpen ? 'hh-sidebar--open' : ''}`}>
      {/* Mobile menu toggle */}
      <button
        type="button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="hh-mobile-menu-toggle"
        style={{
          display: 'none',
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 100,
          padding: 8,
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid var(--hh-border)',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        {isMobileMenuOpen ? (
          <X style={{ width: 20, height: 20 }} />
        ) : (
          <Menu style={{ width: 20, height: 20 }} />
        )}
      </button>
      <motion.div 
        className="hh-sidebar__brand"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="hh-logo">HH</div>
        <div>
          <div className="hh-sidebar__brandTitle">HabitHero</div>
          <div className="hh-sidebar__brandSub">Teacher Portal</div>
        </div>
      </motion.div>

      <nav className="hh-nav">
        <motion.div 
          className="hh-nav__section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Workspace
        </motion.div>
        <NavItem 
          to="/teacher/dashboard" 
          label="Dashboard" 
          icon={LayoutDashboard}
          delay={0.15}
        />
        <NavItem 
          to="/teacher/courses" 
          label="Course Management" 
          icon={GraduationCap}
          delay={0.2}
        />
        <NavItem 
          to="/teacher/modules" 
          label="Modules" 
          icon={BookOpen}
          delay={0.25}
        />
        <NavItem 
          to="/teacher/students" 
          label="Student Progress" 
          icon={Users}
          delay={0.3}
        />
        <NavItem 
          to="/teacher/profile" 
          label="Profile & Settings" 
          icon={User}
          delay={0.35}
        />

        <motion.div 
          className="hh-divider" 
          style={{ margin: '10px 10px 6px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        />
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
        >
          <button
            type="button"
            onClick={handleLogout}
            className="hh-nav__item"
            style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <LogOut 
              style={{ 
                width: 16, 
                height: 16,
                flexShrink: 0
              }} 
            />
            <span className="hh-nav__label">Logout</span>
          </button>
        </motion.div>
      </nav>
    </aside>
  );
}
