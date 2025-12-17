import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCourses } from '../../store/courseStore.jsx';
import { useAuth } from '../../context/AuthContext';
import { loadCourseStudents } from '../../services/teacherDashboard.service';

function StatusPill({ value }) {
  const cls =
    value === 'Ahead'
      ? 'hh-pill hh-pill--ahead'
      : value === 'On track'
        ? 'hh-pill hh-pill--ontrack'
        : 'hh-pill hh-pill--behind';

  return (
    <span className={cls}>
      <span className="hh-pill-dot" />
      {value}
    </span>
  );
}

export default function Students() {
  const navigate = useNavigate();
  const { selectedCourse, courses } = useCourses();
  const { firebaseUser } = useAuth();
  const currentCourse = selectedCourse || courses.find(c => c.active !== false) || courses[0];
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('name');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch students from database
  useEffect(() => {
    if (!firebaseUser?.uid) {
      console.log('Students: No firebaseUser.uid');
      setLoading(false);
      setError('Not authenticated');
      return;
    }

    if (!currentCourse?.id) {
      console.log('Students: No currentCourse.id', { currentCourse, courses });
      setLoading(false);
      setError('No course selected. Please select a course first.');
      setStudents([]);
      return;
    }

    async function fetchStudents() {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching students for:', { teacherId: firebaseUser.uid, courseId: currentCourse.id });
        const studentsData = await loadCourseStudents(firebaseUser.uid, currentCourse.id);
        console.log('Students data received:', studentsData);
        
        if (studentsData) {
          // Convert students object to array and calculate status
          const studentsArray = Object.entries(studentsData).map(([studentId, studentInfo]) => {
            // Calculate completion percentage based on tasks completed
            // We'll need to get total tasks from course data or calculate it
            const totalTasks = currentCourse.modules?.reduce((sum, m) => sum + (m.exercises || 0), 0) || 0;
            const completion = totalTasks > 0 ? Math.round((studentInfo.tasksCompleted / totalTasks) * 100) : 0;
            
            // Determine status based on completion
            let studentStatus = 'On track';
            if (completion >= 80) {
              studentStatus = 'Ahead';
            } else if (completion < 50) {
              studentStatus = 'Behind';
            }
            
            // Calculate level from XP (assuming 100 XP per level for simplicity)
            const level = Math.floor(studentInfo.totalXP / 100) + 1;
            
            return {
              id: studentId,
              name: studentInfo.displayName,
              level: level,
              completed: studentInfo.tasksCompleted,
              total: totalTasks,
              status: studentStatus,
              totalXP: studentInfo.totalXP,
              currentModule: studentInfo.currentModule,
              lastActive: studentInfo.lastActive,
            };
          });
          
          console.log('Processed students array:', studentsArray);
          setStudents(studentsArray);
        } else {
          console.log('No students data found');
          setStudents([]);
        }
      } catch (err) {
        console.error('Error loading students:', err);
        setError(err instanceof Error ? err.message : 'Failed to load students');
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchStudents();
  }, [firebaseUser?.uid, currentCourse?.id, currentCourse, courses]);

  const rows = useMemo(() => {
    let filtered = students;
    if (status !== 'All') filtered = filtered.filter((s) => s.status === status);

    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'level') return b.level - a.level;
      if (sort === 'completion') return b.completed / b.total - a.completed / a.total;
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [students, status, sort]);

  if (loading) {
    return (
      <div className="hh-page" style={{ display: 'grid', gap: 16 }}>
        <div className="hh-card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--hh-muted)' }}>Loading students...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hh-page" style={{ display: 'grid', gap: 16 }}>
        <div>
          <div className="hh-label">Student Progress</div>
          <div className="hh-title" style={{ marginTop: 8 }}>
            Student Progress – {currentCourse?.name || 'No course selected'}
          </div>
        </div>
        <div className="hh-card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgb(185, 28, 28)', marginBottom: 8 }}>Error: {error}</p>
          {!currentCourse?.id && (
            <p style={{ fontSize: 12, color: 'var(--hh-muted)', marginBottom: 16 }}>
              Please select a course from the Courses page first.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              if (!currentCourse?.id) {
                navigate('/teacher/courses');
              } else {
                window.location.reload();
              }
            }}
            className="hh-btn hh-btn-primary"
          >
            {!currentCourse?.id ? 'Go to Courses' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="hh-page" 
      style={{ display: 'grid', gap: 16 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div>
          <div className="hh-label">Student Progress</div>
          <div className="hh-title" style={{ marginTop: 8 }}>
            Student Progress – {currentCourse?.name || 'No course selected'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="hh-label">Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="hh-select"
              style={{ marginTop: 8, width: 180 }}
            >
              <option>All</option>
              <option>Ahead</option>
              <option>On track</option>
              <option>Behind</option>
            </select>
          </div>
          <div>
            <div className="hh-label">Sort</div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="hh-select"
              style={{ marginTop: 8, width: 210 }}
            >
              <option value="name">by name</option>
              <option value="level">by level</option>
              <option value="completion">by completion</option>
            </select>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="hh-table-wrap"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <table className="hh-table">
          <thead className="hh-thead">
            <tr>
              <th className="px-5 py-3">Anonymous display name</th>
              <th className="px-5 py-3">XP level</th>
              <th className="px-5 py-3">Exercises completed</th>
              <th className="px-5 py-3">Overall completion</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="hh-tbody">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--hh-muted)' }}>
                  No students found for this course.
                </td>
              </tr>
            ) : (
              rows.map((s) => {
                const completion = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                return (
                  <tr
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/teacher/students/${s.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/teacher/students/${s.id}`)}
                    className="hh-trow"
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="px-5 py-4" style={{ fontWeight: 700, color: 'rgba(31,31,35,0.92)' }}>
                      {s.name}
                    </td>
                    <td className="px-5 py-4">{s.level}</td>
                    <td className="px-5 py-4">
                      {s.completed} / {s.total}
                    </td>
                    <td className="px-5 py-4">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="hh-progress" style={{ width: 140 }}>
                          <div className="hh-progress__bar" style={{ width: `${completion}%` }} />
                        </div>
                        <span className="hh-muted">{completion}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill value={s.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}

