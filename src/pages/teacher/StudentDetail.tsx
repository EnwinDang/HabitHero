import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, CheckCircle2, Calendar } from "lucide-react";
import { useCourses } from "../../store/courseStore";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { loadCourseStudents } from "../../services/teacherDashboard.service";
import { SubmissionsAPI } from "../../api/submissions.api";
import { TasksAPI } from "../../api/tasks.api";

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

interface StudentSubmission {
  taskName: string;
  taskId: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

interface StudentData {
  displayName: string;
  xpLevel: number;
  completionPercent: number;
  status: string;
  modules: ModuleProgress[];
  timeline: TimelineItem[];
  submissions?: StudentSubmission[];
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
        
        // Load all tasks for real completion calculation
        const allTasks: any[] = [];
        if (currentCourse.modules) {
          for (const module of currentCourse.modules) {
            try {
              const tasks = await TasksAPI.list({
                courseId: currentCourse.id,
                moduleId: module.id,
              });
              allTasks.push(...tasks.map(t => ({ ...t, moduleId: module.id })));
            } catch (err) {
              console.warn(`Failed to load tasks for module ${module.id}:`, err);
            }
          }
        }
        
        const totalTasks = allTasks.length;
        
        // Calculate real approved count for this student
        let approvedCount = 0;
        for (const task of allTasks) {
          try {
            const submissions = await SubmissionsAPI.list(
              task.taskId,
              currentCourse.id,
              task.moduleId
            );
            
            const studentSubmissions = (submissions as any[]).filter(
              s => s.studentId === studentId
            );
            
            if (studentSubmissions.length > 0) {
              const latest = studentSubmissions[0];
              if (latest.status === 'approved') {
                approvedCount++;
              }
            }
          } catch (err) {
            console.warn(`Failed to check submissions for task ${task.taskId}:`, err);
          }
        }
        
        const completionPercent = totalTasks > 0 
          ? Math.round((approvedCount / totalTasks) * 100) 
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
        
        // Build real module progress from actual submissions
        const modules: ModuleProgress[] = [];
        
        for (const module of (currentCourse.modules || [])) {
          try {
            const tasks = await TasksAPI.list({
              courseId: currentCourse.id,
              moduleId: module.id,
            });
            
            let moduleApprovedCount = 0;
            for (const task of tasks) {
              try {
                const submissions = await SubmissionsAPI.list(
                  task.taskId,
                  currentCourse.id,
                  module.id
                );
                
                const studentSubmissions = (submissions as any[]).filter(
                  s => s.studentId === studentId
                );
                
                if (studentSubmissions.length > 0) {
                  const latest = studentSubmissions[0];
                  if (latest.status === 'approved') {
                    moduleApprovedCount++;
                  }
                }
              } catch (err) {
                console.warn(`Failed to check submissions for task ${task.taskId}:`, err);
              }
            }
            
            modules.push({
              name: module.name,
              completed: moduleApprovedCount,
              total: tasks.length,
            });
          } catch (err) {
            console.warn(`Failed to load tasks for module ${module.id}:`, err);
            modules.push({
              name: module.name,
              completed: 0,
              total: 0,
            });
          }
        }
        
        // Sort modules alphabetically
        modules.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
        
        // Load student submissions
        const submissions: StudentSubmission[] = [];
        try {
          const allSubmissions = await SubmissionsAPI.listForTeacher();
          const studentSubmissions = allSubmissions.filter((sub: any) => sub.studentId === studentId);
          const sorted = studentSubmissions.sort((a: any, b: any) => {
            const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          submissions.push(...sorted.map((sub: any) => ({
            taskName: sub.taskName || 'Task',
            taskId: sub.taskId,
            status: sub.status || 'pending',
            submittedAt: new Date(sub.submittedAt || sub.createdAt).toLocaleDateString(),
          })));
        } catch (err) {
          console.warn('Failed to load student submissions:', err);
        }
        
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
          submissions,
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
                background: 'var(--hh-indigo)',
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

        {/* Student Submissions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hh-card"
          style={{ padding: 24 }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 650, marginBottom: 16 }}>
            Submissions
          </h3>
          
          <div style={{ display: 'grid', gap: 12 }}>
            {student.submissions && student.submissions.length > 0 ? (
              student.submissions.map((submission, index) => {
                const statusColors: { [key: string]: { bg: string; text: string; dot: string } } = {
                  pending: { bg: 'rgba(255, 193, 7, 0.10)', text: 'rgb(161, 98, 7)', dot: 'var(--hh-gold)' },
                  approved: { bg: 'rgba(74, 222, 128, 0.10)', text: 'rgb(21, 128, 61)', dot: 'var(--hh-green)' },
                  rejected: { bg: 'rgba(239, 68, 68, 0.10)', text: 'rgb(127, 29, 29)', dot: 'rgb(239, 68, 68)' },
                };
                const colors = statusColors[submission.status] || statusColors.pending;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: colors.bg,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: colors.dot,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 650, color: 'var(--hh-text)', marginBottom: 2 }}>
                        {submission.taskName}
                      </p>
                      <p style={{ fontSize: 12, color: colors.text }}>
                        {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                      </p>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--hh-muted)' }}>
                      {submission.submittedAt}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <p style={{ fontSize: 14, color: 'var(--hh-muted)', textAlign: 'center', padding: 16 }}>No submissions yet</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

