import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Zap, BarChart3, CheckCircle2, ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { useCourses } from '../../store/courseStore.jsx';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { loadTeacherDashboard } from '../../services/teacherDashboard.service';

const activities = [
  {
    type: 'completed',
    title: 'CodeWizard completed Exercise 5',
    description: 'Loops & Iteration module',
    timestamp: '2 min ago',
  },
  {
    type: 'created',
    title: 'New module created',
    description: 'Arrays & Lists',
    timestamp: '1 hour ago',
  },
  {
    type: 'completed',
    title: 'ByteRunner finished Module 2',
    description: 'Variables & Data Types',
    timestamp: '3 hours ago',
  },
  {
    type: 'achievement',
    title: 'LoopNinja earned Level 5',
    description: 'Reached 500 XP milestone',
    timestamp: '5 hours ago',
  },
  {
    type: 'module',
    title: 'Module 3 unlocked',
    description: 'For 8 students',
    timestamp: 'Yesterday',
  },
];

// KPI Card Component
function KPICard({ title, value, subtitle, icon: Icon, trend, variant = 'primary', delay = 0 }) {
  const variantColors = {
    primary: { bg: 'rgba(75, 74, 239, 0.10)', icon: 'var(--hh-indigo)', text: 'var(--hh-indigo)' },
    gold: { bg: 'rgba(255, 183, 77, 0.14)', icon: 'var(--hh-gold)', text: 'rgb(161, 98, 7)' },
    success: { bg: 'rgba(74, 222, 128, 0.10)', icon: 'var(--hh-green)', text: 'rgb(21, 128, 61)' },
  };
  const colors = variantColors[variant] || variantColors.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="hh-card"
      style={{ padding: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: 'var(--hh-muted)', marginBottom: 4 }}>{title}</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--hh-text)', marginBottom: 4 }}>{value}</p>
          <p style={{ fontSize: 12, color: 'var(--hh-muted)' }}>{subtitle}</p>
        </div>
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon style={{ width: 20, height: 20, color: colors.icon }} />
        </div>
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: trend.isPositive ? colors.text : 'rgb(185, 28, 28)' }}>
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{trend.value}%</span>
        </div>
      )}
    </motion.div>
  );
}

// Activity Item Component
function ActivityItem({ type, title, description, timestamp, delay = 0 }) {
  const typeColors = {
    completed: { dot: 'var(--hh-green)', bg: 'rgba(74, 222, 128, 0.10)' },
    created: { dot: 'var(--hh-indigo)', bg: 'rgba(75, 74, 239, 0.10)' },
    achievement: { dot: 'var(--hh-gold)', bg: 'rgba(255, 183, 77, 0.14)' },
    module: { dot: 'var(--hh-violet)', bg: 'rgba(108, 99, 255, 0.10)' },
  };
  const colors = typeColors[type] || typeColors.completed;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      style={{
        padding: 12,
        borderRadius: 8,
        background: 'rgba(31, 31, 35, 0.02)',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: colors.dot,
          marginTop: 6,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 650, color: 'var(--hh-text)', marginBottom: 2 }}>{title}</p>
        <p style={{ fontSize: 12, color: 'var(--hh-muted)', marginBottom: 4 }}>{description}</p>
        <p style={{ fontSize: 11, color: 'var(--hh-muted)' }}>{timestamp}</p>
      </div>
    </motion.div>
  );
}

// Progress Bar Component
function ProgressBar({ value, label, size = 'md' }) {
  const height = size === 'lg' ? 12 : 10;
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--hh-text)' }}>{label}</span>
          <span style={{ fontSize: 12, color: 'var(--hh-muted)' }}>{value}%</span>
        </div>
      )}
      <div className="hh-progress" style={{ height }}>
        <div className="hh-progress__bar" style={{ width: `${value}%`, height }} />
      </div>
    </div>
  );
}

// Course Overview Card Component
function CourseOverviewCard({ courseId, courseData, courseInfo, delay = 0, onViewModules }) {
  const overview = courseData?.overview || {};
  const modules = courseData?.modules || {};
  const students = courseData?.students || {};
  
  const totalModules = Object.keys(modules).length;
  const totalTasks = Object.values(modules).reduce((sum, m) => sum + (m.totalTasks || 0), 0);
  const avgCompletionRate = totalModules > 0 
    ? Math.round(Object.values(modules).reduce((sum, m) => sum + (m.completionRate || 0), 0) / totalModules)
    : 0;
  
  // Calculate student status distribution (simplified - would need more data for accurate calculation)
  const totalStudents = overview.totalStudents || Object.keys(students).length || 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="hh-card"
      style={{ padding: 24 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 650, marginBottom: 4 }}>
            {courseInfo?.name || courseId || 'No course'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--hh-muted)' }}>
            {courseInfo?.description || ''}
          </p>
        </div>
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: 'rgba(75, 74, 239, 0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GraduationCap style={{ width: 24, height: 24, color: 'var(--hh-indigo)' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14 }}>
          <span style={{ color: 'var(--hh-muted)', width: 96 }}>Students:</span>
          <span style={{ fontWeight: 650 }}>{totalStudents} enrolled</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14 }}>
          <span style={{ color: 'var(--hh-muted)', width: 96 }}>Modules:</span>
          <span style={{ fontWeight: 650 }}>
            {totalModules} modules • {totalTasks} exercises
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14 }}>
          <span style={{ color: 'var(--hh-muted)', width: 96 }}>Avg XP:</span>
          <span style={{ fontWeight: 650 }}>{overview.averageXP || 0} XP</span>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <ProgressBar
          value={avgCompletionRate}
          label="Average Completion"
          size="lg"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(74, 222, 128, 0.10)', textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 850, color: 'rgb(21, 128, 61)', marginBottom: 4 }}>
            {overview.modulesCompleted || 0}
          </p>
          <p style={{ fontSize: 12, color: 'var(--hh-muted)' }}>Modules Completed</p>
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(59, 130, 246, 0.10)', textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 850, color: 'rgb(29, 78, 216)', marginBottom: 4 }}>
            {overview.tasksCompletedToday || 0}
          </p>
          <p style={{ fontSize: 12, color: 'var(--hh-muted)' }}>Tasks Today</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onViewModules}
        className="hh-btn hh-btn-secondary"
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <BookOpen style={{ width: 16, height: 16 }} />
        Go to Modules
        <span style={{ marginLeft: 'auto' }}>
          <ArrowRight style={{ width: 16, height: 16 }} />
        </span>
      </button>
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { courses, selectedCourse, setSelectedCourse } = useCourses();
  const { firebaseUser, user } = useAuth();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch teacher dashboard data
  useEffect(() => {
    if (!firebaseUser?.uid) {
      setLoading(false);
      return;
    }

    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);
        const data = await loadTeacherDashboard(firebaseUser.uid);
        setDashboardData(data);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [firebaseUser?.uid]);

  // Calculate aggregated KPIs from dashboard data
  const kpis = useMemo(() => {
    if (!dashboardData?.managedCourses) {
      return {
        totalStudents: 0,
        averageXP: 0,
        avgCompletionRate: 0,
        tasksCompletedToday: 0,
      };
    }

    const courses = Object.values(dashboardData.managedCourses);
    let totalStudents = 0;
    let totalXP = 0;
    let totalCompletionRate = 0;
    let totalTasksToday = 0;
    let coursesWithData = 0;

    courses.forEach((course) => {
      if (course.overview) {
        totalStudents += course.overview.totalStudents || 0;
        totalXP += course.overview.averageXP || 0;
        totalTasksToday += course.overview.tasksCompletedToday || 0;
        coursesWithData++;
      }

      // Calculate average completion rate from modules
      if (course.modules) {
        const moduleRates = Object.values(course.modules).map((m) => m.completionRate || 0);
        if (moduleRates.length > 0) {
          totalCompletionRate += moduleRates.reduce((a, b) => a + b, 0) / moduleRates.length;
        }
      }
    });

    return {
      totalStudents,
      averageXP: coursesWithData > 0 ? Math.round(totalXP / coursesWithData) : 0,
      avgCompletionRate: courses.length > 0 ? Math.round(totalCompletionRate / courses.length) : 0,
      tasksCompletedToday: totalTasksToday,
    };
  }, [dashboardData]);

  // Get courses to display (from dashboard data, limit to 2)
  const coursesToDisplay = useMemo(() => {
    if (!dashboardData?.managedCourses) return [];
    
    const courseEntries = Object.entries(dashboardData.managedCourses);
    return courseEntries.slice(0, 2).map(([courseId, courseData]) => {
      // Try to find matching course info from courseStore
      const courseInfo = courses.find(c => c.id === courseId);
      return { courseId, courseData, courseInfo };
    });
  }, [dashboardData, courses]);

  const hasMoreCourses = dashboardData?.managedCourses 
    ? Object.keys(dashboardData.managedCourses).length > 2 
    : false;

  if (loading) {
    return (
      <div className="hh-page" style={{ display: 'grid', gap: 16 }}>
        <div className="hh-card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--hh-muted)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hh-page" style={{ display: 'grid', gap: 16 }}>
        <div className="hh-card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgb(185, 28, 28)', marginBottom: 16 }}>Error: {error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="hh-btn hh-btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hh-page" style={{ display: 'grid', gap: 16 }}>
      <div>
        <div className="hh-label">Dashboard</div>
        <div className="hh-title" style={{ marginTop: 8 }}>
          Dashboard
        </div>
        <div className="hh-hint" style={{ marginTop: 8 }}>
          Overview
          {user?.role && (
            <span style={{ marginLeft: 12, padding: '4px 8px', borderRadius: 6, background: 'rgba(75, 74, 239, 0.10)', color: 'var(--hh-indigo)', fontSize: 11, fontWeight: 650 }}>
              Role: {user.role}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 32 }}>
        <KPICard
          title="Students Enrolled"
          value={kpis.totalStudents}
          subtitle="Active learners"
          icon={Users}
          variant="primary"
          delay={0}
        />
        <KPICard
          title="Average XP"
          value={kpis.averageXP}
          subtitle="Class average"
          icon={Zap}
          variant="gold"
          delay={0.1}
        />
        <KPICard
          title="Module Completion"
          value={`${kpis.avgCompletionRate}%`}
          subtitle="Overall progress"
          icon={BarChart3}
          variant="success"
          delay={0.2}
        />
        <KPICard
          title="Tasks Today"
          value={kpis.tasksCompletedToday}
          subtitle="Completed today"
          icon={CheckCircle2}
          delay={0.3}
        />
      </div>

      {/* Course Overviews */}
      {coursesToDisplay.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 24 }}>
          {coursesToDisplay.map(({ courseId, courseData, courseInfo }, index) => (
            <CourseOverviewCard
              key={courseId}
              courseId={courseId}
              courseData={courseData}
              courseInfo={courseInfo}
              delay={0.4 + index * 0.1}
              onViewModules={() => {
                const matchingCourse = courses.find(c => c.id === courseId);
                if (matchingCourse) {
                  setSelectedCourse(matchingCourse);
                }
                navigate('/teacher/modules');
              }}
            />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="hh-card"
          style={{ padding: 24, marginBottom: 24 }}
        >
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, color: 'var(--hh-muted)', marginBottom: 16 }}>
              No courses available. Create your first course to get started.
            </p>
            <button
              type="button"
              onClick={() => navigate('/teacher/courses')}
              className="hh-btn hh-btn-primary"
            >
              Go to Course Management
            </button>
          </div>
        </motion.div>
      )}

      {/* View All Courses Button */}
      {hasMoreCourses && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{ marginBottom: 24 }}
        >
          <button
            type="button"
            onClick={() => navigate('/teacher/courses')}
            className="hh-btn hh-btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            View All Courses
            <ArrowRight style={{ width: 16, height: 16 }} />
          </button>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

        {/* Activity Snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="hh-card"
          style={{ padding: 24 }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 650, marginBottom: 16 }}>
            Recent Activity
          </h2>
          
          <div style={{ display: 'grid', gap: 4 }}>
            {activities.map((activity, index) => (
              <ActivityItem
                key={index}
                {...activity}
                delay={0.6 + index * 0.05}
              />
            ))}
          </div>

          <button
            type="button"
            className="hh-btn hh-btn-secondary"
            style={{ width: '100%', marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => navigate('/teacher/students')}
          >
            View all students
            <ArrowRight style={{ width: 16, height: 16, marginLeft: 'auto' }} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

