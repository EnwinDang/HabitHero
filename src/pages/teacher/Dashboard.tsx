import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, BarChart3, FileText, ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { useCourses } from '../../store/courseStore';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { loadTeacherDashboard, type TeacherDashboard } from '../../services/teacherDashboard.service';
import { SubmissionsAPI } from '../../api/submissions.api';
import { cache, cacheKeys } from '../../utils/cache';

// Activities will be fetched from backend in the future
interface Activity {
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

const activities: Activity[] = [];

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  trend?: { isPositive: boolean; value: number };
  variant?: 'primary' | 'gold' | 'success';
  delay?: number;
}

function KPICard({ title, value, subtitle, icon: Icon, trend, variant = 'primary', delay = 0 }: KPICardProps) {
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
      style={{ padding: '16px 14px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, color: 'var(--hh-muted)', marginBottom: 4 }}>{title}</p>
          <p style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: 'var(--hh-text)', marginBottom: 4 }}>{value}</p>
          <p style={{ fontSize: 11, color: 'var(--hh-muted)' }}>{subtitle}</p>
        </div>
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            background: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 18, height: 18, color: colors.icon }} />
        </div>
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: trend.isPositive ? colors.text : 'rgb(185, 28, 28)' }}>
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{trend.value}%</span>
        </div>
      )}
    </motion.div>
  );
}

// Activity Item Component
interface ActivityItemProps {
  type: 'completed' | 'created' | 'achievement' | 'module' | string;
  title: string;
  description: string;
  timestamp: string;
  delay?: number;
}

function ActivityItem({ type, title, description, timestamp, delay = 0 }: ActivityItemProps) {
  const typeColors: Record<string, { dot: string; bg: string }> = {
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
interface ProgressBarProps {
  value: number;
  label?: string;
  size?: 'md' | 'lg';
}

function ProgressBar({ value, label, size = 'md' }: ProgressBarProps) {
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
interface CourseOverviewCardProps {
  courseId: string;
  courseData: any;
  courseInfo: any;
  delay?: number;
  onViewModules: () => void;
}

function CourseOverviewCard({ courseId, courseData, courseInfo, delay = 0, onViewModules }: CourseOverviewCardProps) {
  const overview = courseData?.overview || {};
  const modules = courseData?.modules || {};
  const students = courseData?.students || {};
  
  const totalModules = Object.keys(modules).length;
  const totalTasks = Object.values(modules).reduce((sum: number, m: any) => sum + (m?.totalTasks || 0), 0);
  const avgCompletionRate = totalModules > 0 
    ? Math.round(Object.values(modules).reduce((sum: number, m: any) => sum + (m?.completionRate || 0), 0) / totalModules)
    : 0;
  
  // Get student count from overview (updated by API) or count students object as fallback
  const totalStudents = overview?.totalStudents ?? (students ? Object.keys(students).length : 0);
  
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
            {totalModules} modules • {String(totalTasks)} exercises
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <ProgressBar
          value={avgCompletionRate}
          label="Average Completion"
          size="lg"
        />
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
  
  const [dashboardData, setDashboardData] = useState<TeacherDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);

  // Fetch teacher dashboard data
  useEffect(() => {
    if (!firebaseUser?.uid) {
      setLoading(false);
      return;
    }

    async function fetchDashboard() {
      if (!firebaseUser?.uid) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const data = await loadTeacherDashboard(firebaseUser.uid);
        setDashboardData(data);
        
        // Load pending submissions count
        try {
          const pendingSubs = await SubmissionsAPI.listForTeacher('pending');
          setPendingCount(pendingSubs.length);
        } catch (err) {
          console.warn('Failed to load pending submissions count:', err);
          setPendingCount(0);
        }

        // Load recent submissions (3 most recent pending submissions)
        try {
          const pendingSubs = await SubmissionsAPI.listForTeacher('pending');
          const sorted = pendingSubs.sort((a: any, b: any) => {
            const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          setRecentSubmissions(sorted.slice(0, 3));
        } catch (err) {
          console.warn('Failed to load recent submissions:', err);
          setRecentSubmissions([]);
        }
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

    courses.forEach((course: any) => {
      if (course?.overview) {
        totalStudents += course.overview.totalStudents || 0;
        totalXP += course.overview.averageXP || 0;
        totalTasksToday += course.overview.tasksCompletedToday || 0;
        coursesWithData++;
      }

      // Calculate average completion rate from modules
      if (course?.modules) {
        const moduleRates = Object.values(course.modules).map((m: any) => m?.completionRate || 0);
        if (moduleRates.length > 0) {
          totalCompletionRate += moduleRates.reduce((a: number, b: number) => a + b, 0) / moduleRates.length;
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

  // Get courses to display (from dashboard data, show all)
  const coursesToDisplay = useMemo(() => {
    if (!dashboardData?.managedCourses) return [];
    
    const courseEntries = Object.entries(dashboardData.managedCourses);
    return courseEntries.map(([courseId, courseData]) => {
      // Try to find matching course info from courseStore
      const courseInfo = courses.find(c => c.id === courseId);
      return { courseId, courseData, courseInfo };
    });
  }, [dashboardData, courses]);

  const hasMoreCourses = false;

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
        <div className="hh-hint" style={{ marginTop: 8 }}>
          Overview
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px 16px', marginBottom: 32 }}>
        <KPICard
          title="Students Enrolled"
          value={kpis.totalStudents}
          subtitle="Active learners"
          icon={Users}
          variant="primary"
          delay={0}
        />
        <KPICard
          title="Module Completion"
          value={`${kpis.avgCompletionRate}%`}
          subtitle="Overall progress"
          icon={BarChart3}
          variant="success"
          delay={0.1}
        />
        <KPICard
          title="Submissions to Review"
          value={pendingCount}
          subtitle="Pending submissions"
          icon={FileText}
          delay={0.2}
        />
      </div>

      {/* Course Overviews */}
      {coursesToDisplay.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 24, marginBottom: 24 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 24 }}>

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
            {recentSubmissions.length > 0 ? (
              recentSubmissions.map((submission, index) => (
                <ActivityItem
                  key={index}
                  type="completed"
                  title={submission.studentName || 'Student'}
                  description={`Submitted: ${submission.taskName || 'Assignment'}`}
                  timestamp={new Date(submission.submittedAt || submission.createdAt).toLocaleDateString()}
                  delay={0.6 + index * 0.05}
                />
              ))
            ) : (
              <p style={{ fontSize: 14, color: 'var(--hh-muted)', textAlign: 'center', padding: 16 }}>
                No recent submissions
              </p>
            )}
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

