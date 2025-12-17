import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, CheckCircle2, Calendar } from "lucide-react";
import { useCourses } from "../../store/courseStore.jsx";

const studentsData = {
  s1: {
    displayName: "CodeWizard",
    xpLevel: 7,
    completionPercent: 95,
    status: "ahead",
    modules: [
      { name: "Module 1 – Introduction", completed: 5, total: 5 },
      { name: "Module 2 – Variables & Data Types", completed: 8, total: 8 },
      { name: "Module 3 – Loops & Iteration", completed: 10, total: 10 },
      { name: "Module 4 – Arrays & Lists", completed: 8, total: 8 },
      { name: "Module 5 – Functions", completed: 5, total: 6 },
      { name: "Module 6 – Objects & Classes", completed: 2, total: 3 },
    ],
    timeline: [
      { exercise: "Object Methods", module: "Objects & Classes", date: "Oct 28, 2024" },
      { exercise: "Creating Classes", module: "Objects & Classes", date: "Oct 27, 2024" },
      { exercise: "Higher-Order Functions", module: "Functions", date: "Oct 25, 2024" },
      { exercise: "Function Parameters", module: "Functions", date: "Oct 24, 2024" },
      { exercise: "Array Methods", module: "Arrays & Lists", date: "Oct 22, 2024" },
    ],
  },
  s2: {
    displayName: "ByteRunner",
    xpLevel: 6,
    completionPercent: 88,
    status: "ahead",
    modules: [
      { name: "Module 1 – Introduction", completed: 5, total: 5 },
      { name: "Module 2 – Variables & Data Types", completed: 8, total: 8 },
      { name: "Module 3 – Loops & Iteration", completed: 10, total: 10 },
      { name: "Module 4 – Arrays & Lists", completed: 7, total: 8 },
      { name: "Module 5 – Functions", completed: 4, total: 6 },
      { name: "Module 6 – Objects & Classes", completed: 1, total: 3 },
    ],
    timeline: [
      { exercise: "Creating Classes", module: "Objects & Classes", date: "Oct 28, 2024" },
      { exercise: "Function Scope", module: "Functions", date: "Oct 26, 2024" },
      { exercise: "Array Sorting", module: "Arrays & Lists", date: "Oct 24, 2024" },
    ],
  },
  s3: {
    displayName: "LoopNinja",
    xpLevel: 5,
    completionPercent: 75,
    status: "on-track",
    modules: [
      { name: "Module 1 – Introduction", completed: 5, total: 5 },
      { name: "Module 2 – Variables & Data Types", completed: 7, total: 8 },
      { name: "Module 3 – Loops & Iteration", completed: 8, total: 10 },
      { name: "Module 4 – Arrays & Lists", completed: 6, total: 8 },
      { name: "Module 5 – Functions", completed: 3, total: 6 },
      { name: "Module 6 – Objects & Classes", completed: 0, total: 3 },
    ],
    timeline: [
      { exercise: "Array Filtering", module: "Arrays & Lists", date: "Oct 25, 2024" },
      { exercise: "Nested Loops", module: "Loops & Iteration", date: "Oct 23, 2024" },
    ],
  },
  s4: {
    displayName: "ArraySage",
    xpLevel: 4,
    completionPercent: 60,
    status: "behind",
    modules: [
      { name: "Module 1 – Introduction", completed: 5, total: 5 },
      { name: "Module 2 – Variables & Data Types", completed: 6, total: 8 },
      { name: "Module 3 – Loops & Iteration", completed: 5, total: 10 },
      { name: "Module 4 – Arrays & Lists", completed: 4, total: 8 },
      { name: "Module 5 – Functions", completed: 2, total: 6 },
      { name: "Module 6 – Objects & Classes", completed: 0, total: 3 },
    ],
    timeline: [
      { exercise: "Basic Loops", module: "Loops & Iteration", date: "Oct 20, 2024" },
    ],
  },
};

// Status Badge Component
function StatusBadge({ variant }) {
  const statusMap = {
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

// Progress Bar Component
function ProgressBar({ value, size = 'md' }) {
  const height = size === 'sm' ? 8 : size === 'lg' ? 12 : 10;
  return (
    <div className="hh-progress" style={{ height }}>
      <div className="hh-progress__bar" style={{ width: `${value}%`, height }} />
    </div>
  );
}

export default function StudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { selectedCourse, courses } = useCourses();
  const currentCourse = selectedCourse || courses.find(c => c.active !== false) || courses[0];
  
  const student = studentsData[studentId] || studentsData.s1;

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
        style={{ padding: 24, marginBottom: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'linear-gradient(180deg, var(--hh-indigo), var(--hh-violet))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 24,
                boxShadow: '0 10px 22px rgba(75, 74, 239, 0.18)',
              }}
            >
              {student.displayName.charAt(0)}
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>
                {student.displayName}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                <StatusBadge variant={student.status} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: 'var(--hh-muted)' }}>
                  <Zap style={{ width: 16, height: 16, color: 'var(--hh-gold)' }} />
                  Level {student.xpLevel}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 14, color: 'var(--hh-muted)', marginBottom: 4 }}>Course Completion</p>
            <p style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>
              {student.completionPercent}%
            </p>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
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
            {student.modules.map((module, index) => {
              const percentage = Math.round((module.completed / module.total) * 100);
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
            })}
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
            {student.timeline.map((item, index) => (
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
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

