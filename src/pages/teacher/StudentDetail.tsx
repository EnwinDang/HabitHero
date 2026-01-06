import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, CheckCircle2, Calendar } from "lucide-react";
import { useCourses } from "../../store/courseStore";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { loadCourseStudents } from "../../services/teacherDashboard.service";

interface StatusBadgeProps {
  variant: string;
}

function StatusBadge({ variant }: StatusBadgeProps) {
  const statusMap: { [key: string]: { className: string; label: string } } = {
    ahead: { className: 'hh-pill hh-pill--ahead', label: 'Ahead' },
    'on-track': { className: 'hh-pill hh-pill--ontrack', label: 'On track' },
    behind: { className: 'hh-pill hh-pill--behind', label: 'Behind' },
  };
  
  const config = statusMap[variant] || statusMap['on-track'];
  
  return (
    <span className={config.className}>
      <span className="hh-pill-dot" />
      {config.label}
    </span>
  );
}

interface ProgressBarProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}

function ProgressBar({ value, size = 'md' }: ProgressBarProps) {
  const height = size === 'sm' ? 8 : size === 'lg' ? 12 : 10;
  return (
    <div className="hh-progress" style={{ height }}>
      <div className="hh-progress__bar" style={{ width: `${value}%`, height }} />
    </div>
  );
}

interface ModuleProgress {
  name: string;
  completed: number;
  total: number;
}

interface TimelineItem {
  exercise: string;
  module: string;
  date: string;
}

interface StudentData {
  displayName: string;
  xpLevel: number;
  completionPercent: number;
  status: string;
  modules: ModuleProgress[];
  timeline: TimelineItem[];
}

export default function StudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { selectedCourse, courses } = useCourses();
  const { firebaseUser } = useAuth();
  const currentCourse = selectedCourse || courses.find(c => c.active !== false) || courses[0];
  
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser?.uid || !studentId || !currentCourse?.id) {
      setLoading(false);
      if (!currentCourse?.id) {
        setError('No course selected');
      } else {
        setError('Missing required information');
      }
      return;
    }

    async function fetchStudentData() {
      try {
        setLoading(true);
        setError(null);
        
        if (!firebaseUser?.uid || !studentId || !currentCourse?.id) {
          setError('Missing required data');
          setStudent(null);
          setLoading(false);
          return;
        }
        
        const studentsData = await loadCourseStudents(firebaseUser.uid, currentCourse.id);
        
        if (!studentsData || !studentId || !studentsData[studentId]) {
          setError('Student not found');
          setStudent(null);
          return;
        }

        const studentInfo = studentsData[studentId];
        
        // Calculate total tasks from course modules
        const totalTasks = currentCourse.modules?.reduce((sum, m) => sum + (m.exercises || 0), 0) || 0;
        const completionPercent = totalTasks > 0 
          ? Math.round((studentInfo.tasksCompleted / totalTasks) * 100) 
          : 0;
        
        // Determine status
        let status = 'on-track';
        if (completionPercent >= 80) {
          status = 'ahead';
        } else if (completionPercent < 50) {
          status = 'behind';
        }
        
        // Calculate level from XP
        const xpLevel = Math.floor(studentInfo.totalXP / 100) + 1;
        
        // Build module progress from course modules, sorted alphabetically
        const modules: ModuleProgress[] = (currentCourse.modules || [])
          .map(module => {
            // For now, we'll estimate based on overall completion
            // In a real implementation, you'd fetch task completion per module
            const moduleTasks = module.exercises || 0;
            const completed = Math.round((completionPercent / 100) * moduleTasks);
            
            return {
              name: module.name,
              completed: completed,
              total: moduleTasks,
            };
          })
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
        
        // Timeline would need to come from task completion history
        // For now, we'll show an empty timeline
        const timeline: TimelineItem[] = [];
        
        setStudent({
          displayName: studentInfo.displayName,
          xpLevel,
          completionPercent,
          status,
          modules,
          timeline,
        });
      } catch (err) {
        console.error('Error loading student data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load student data');
        setStudent(null);
      } finally {
        setLoading(false);
      }
    }

    fetchStudentData();
  }, [firebaseUser?.uid, studentId, currentCourse?.id, currentCourse, courses]);

  if (loading) {
    return (
      <div className="hh-page" style={{ display: 'grid', gap: 16 }}>
        <div className="hh-card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--hh-muted)' }}>Loading student data...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="hh-page" style={{ display: 'grid', gap: 16 }}>
        <div>
          <div className="hh-label">Student Detail</div>
          <div className="hh-title" style={{ marginTop: 8 }}>
            Student Not Found
          </div>
        </div>
        <div className="hh-card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgb(185, 28, 28)', marginBottom: 16 }}>Error: {error || 'Student not found'}</p>
          <button
            type="button"
            onClick={() => navigate("/teacher/students")}
            className="hh-btn hh-btn-primary"
          >
            Back to Students
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hh-page" style={{ display: 'grid', gap: 16 }}>
      <div>
        <div className="hh-label">Student Detail</div>
        <div className="hh-title" style={{ marginTop: 8 }}>
          {student.displayName}
        </div>
        <div className="hh-hint" style={{ marginTop: 8 }}>
          Student · {currentCourse?.name || 'No course selected'}
        </div>
      </div>

      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate("/teacher/students")}
        className="hh-btn hh-btn-secondary"
        style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Back to Students
      </button>

      {/* Student Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hh-card"
        style={{ padding: '20px 16px', marginBottom: 24 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'linear-gradient(180deg, var(--hh-indigo), var(--hh-violet))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 22,
                boxShadow: '0 10px 22px rgba(75, 74, 239, 0.18)',
                flexShrink: 0,
              }}
            >
              {student.displayName.charAt(0)}
            </div>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <h2 style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>
                {student.displayName}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                <StatusBadge variant={student.status} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--hh-muted)' }}>
                  <Zap style={{ width: 14, height: 14, color: 'var(--hh-gold)' }} />
                  Level {student.xpLevel}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'left', paddingTop: 12, borderTop: '1px solid var(--hh-border)' }}>
            <p style={{ fontSize: 13, color: 'var(--hh-muted)', marginBottom: 4 }}>Course Completion</p>
            <p style={{ fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 700, lineHeight: 1.2 }}>
              {student.completionPercent}%
            </p>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
        {/* Module Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hh-card"
          style={{ padding: 24 }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 650, marginBottom: 16 }}>
            Module Progress
          </h3>
          
          <div style={{ display: 'grid', gap: 16 }}>
            {student.modules.length > 0 ? (
              student.modules.map((module, index) => {
                const percentage = module.total > 0 ? Math.round((module.completed / module.total) * 100) : 0;
                return (
                  <motion.div
                    key={module.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 650 }}>
                        {module.name}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--hh-muted)' }}>
                        {module.completed}/{module.total}
                      </span>
                    </div>
                    <ProgressBar
                      value={percentage}
                      size="sm"
                    />
                  </motion.div>
                );
              })
            ) : (
              <p style={{ fontSize: 14, color: 'var(--hh-muted)' }}>No modules available</p>
            )}
          </div>
        </motion.div>

        {/* Completion Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hh-card"
          style={{ padding: 24 }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 650, marginBottom: 16 }}>
            Completion Timeline
          </h3>
          
          <div style={{ display: 'grid', gap: 16 }}>
            {student.timeline.length > 0 ? (
              student.timeline.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(74, 222, 128, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <CheckCircle2 style={{ width: 16, height: 16, color: 'rgb(21, 128, 61)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 650, marginBottom: 2 }}>
                      {item.exercise}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--hh-muted)' }}>
                      {item.module}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--hh-muted)' }}>
                    <Calendar style={{ width: 12, height: 12 }} />
                    {item.date}
                  </div>
                </motion.div>
              ))
            ) : (
              <p style={{ fontSize: 14, color: 'var(--hh-muted)' }}>No completion history available</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

