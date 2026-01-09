import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, MoreVertical, Pencil, Trash2, Calendar, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import { useCourses } from '../../store/courseStore';
import { loadTasks, createTask, updateTask, deleteTask } from '../../services/task.service';
import { CoursesAPI } from '../../api/courses.api';
import { Modal } from '../../components/Modal';
import { DropdownMenu } from '../../components/DropdownMenu';
import { DropdownMenuItem } from '../../components/DropdownMenuItem';

// Helper functions to map between API format and UI format
function mapTaskFromAPI(apiTask: any, totalStudents: number = 0) {
  return {
    id: apiTask.taskId,
    title: apiTask.title,
    description: apiTask.description || '',
    difficulty: apiTask.difficulty ? apiTask.difficulty.charAt(0).toUpperCase() + apiTask.difficulty.slice(1) : 'Easy',
    date: apiTask.dueAt ? new Date(apiTask.dueAt).toISOString().split('T')[0] : '',
    status: apiTask.isActive ? 'Active' : 'Inactive',
    completed: 0, // This would need to come from completion data
    total: totalStudents, // Number of students enrolled in the course
    canvasUrl: apiTask.canvasUrl || '',
  };
}

function mapTaskToAPI(uiTask: any, moduleId: string, courseId?: string) {
  const difficulty = (uiTask.difficulty || 'easy').toLowerCase();
  
  // Calculate XP and gold based on difficulty (25% increase per level)
  const difficultyMultipliers: Record<string, { xp: number; gold: number }> = {
    easy: { xp: 100, gold: 50 },
    medium: { xp: 125, gold: 63 },      // 25% increase from easy
    hard: { xp: 156, gold: 78 },        // 25% increase from medium
    extreme: { xp: 200, gold: 100 },    // Extreme difficulty
  };
  
  const rewards = difficultyMultipliers[difficulty] || difficultyMultipliers.medium;
  
  return {
    taskId: uiTask.id || undefined,
    courseId: courseId,
    moduleId: moduleId,
    title: uiTask.title,
    description: uiTask.description || null,
    difficulty: difficulty,
    dueAt: uiTask.date ? new Date(uiTask.date).getTime() : undefined,
    isActive: uiTask.status !== 'Inactive',
    isRepeatable: false,
    xp: rewards.xp,
    gold: rewards.gold,
    canvasUrl: uiTask.canvasUrl || null,
  };
}

interface DifficultyBadgeProps {
  value: string;
}

function DifficultyBadge({ value }: DifficultyBadgeProps) {
  const difficultyMap = {
    Easy: { className: 'hh-pill hh-pill--easy', dotColor: 'var(--hh-green)' },
    Medium: { className: 'hh-pill hh-pill--medium', dotColor: 'var(--hh-gold)' },
    Hard: { className: 'hh-pill hh-pill--hard', dotColor: 'rgb(239, 68, 68)' },
    Extreme: { className: 'hh-pill hh-pill--hard', dotColor: 'rgb(147, 51, 234)' },
    easy: { className: 'hh-pill hh-pill--easy', dotColor: 'var(--hh-green)' },
    medium: { className: 'hh-pill hh-pill--medium', dotColor: 'var(--hh-gold)' },
    hard: { className: 'hh-pill hh-pill--hard', dotColor: 'rgb(239, 68, 68)' },
    extreme: { className: 'hh-pill hh-pill--hard', dotColor: 'rgb(147, 51, 234)' },
  } as const;

  const config = difficultyMap[value as keyof typeof difficultyMap] || difficultyMap.Easy;
  const displayValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

  return (
    <span className={config.className}>
      <span className="hh-pill-dot" style={{ background: config.dotColor }} />
      {displayValue}
    </span>
  );
}


export default function ModuleDetail() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { courses, selectedCourse } = useCourses();

  const moduleFromStore = useMemo(() => {
    const course = selectedCourse || courses.find(c => c.active !== false) || courses[0];
    const modules = course?.modules || [];
    return modules.find((m) => m.id === moduleId) || null;
  }, [courses, selectedCourse, moduleId]);

  const moduleName = useMemo(() => {
    return moduleFromStore?.name || `Module ${moduleId || ''}`;
  }, [moduleFromStore, moduleId]);

  const currentCourse = selectedCourse || courses.find(c => c.active !== false) || courses[0];

  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [totalStudents, setTotalStudents] = useState<number>(0);

  // Load number of students in the course
  useEffect(() => {
    async function loadStudentsCount() {
      if (!currentCourse?.id) return;
      
      try {
        const students = await CoursesAPI.listStudents(currentCourse.id);
        setTotalStudents(students.length);
      } catch (err) {
        console.error('Error loading students count:', err);
        // Keep totalStudents at 0 if API fails
      }
    }
    
    loadStudentsCount();
  }, [currentCourse?.id]);

  // Load exercises (tasks) from API
  useEffect(() => {
    async function loadExercises() {
      if (!moduleId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get courseId from currentCourse - wait for courses to load
        const courseId = currentCourse?.id;
        if (!courseId) {
          // Don't set error if courses are still loading
          if (courses.length === 0) {
            setLoading(false);
            return;
          }
          setError('Course not found');
          setLoading(false);
          return;
        }
        
        const tasks = await loadTasks(courseId, moduleId);
        const mapped = tasks.map(task => mapTaskFromAPI(task, totalStudents));
        setExercises(mapped);
      } catch (err) {
        console.error('Error loading exercises:', err);
        setError(err instanceof Error ? err.message : 'Failed to load exercises');
      } finally {
        setLoading(false);
      }
    }
    
    loadExercises();
  }, [moduleId, currentCourse?.id, courses.length, totalStudents]);

  const editing = useMemo(
    () => exercises.find((e) => e.id === editingId) || null,
    [exercises, editingId]
  );

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('Easy');
  const [date, setDate] = useState<string>('');
  const [canvasUrl, setCanvasUrl] = useState<string>('');
  const [status, setStatus] = useState<string>('Active');

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setDifficulty('Easy');
    setDate('');
    setCanvasUrl('');
    setStatus('Active');
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(ex: any) {
    setEditingId(ex.id);
    setTitle(ex.title || '');
    setDescription(ex.description || '');
    setDifficulty(ex.difficulty || 'Easy');
    setDate(ex.date || '');
    setCanvasUrl(ex.canvasUrl || '');
    setStatus(ex.status || 'Active');
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    // Reset form after a short delay to allow modal close animation
    setTimeout(() => {
      resetForm();
    }, 200);
  }

  async function save() {
    // Prevent double submission
    if (saving) {
      console.log('⚠️ [ModuleDetail] Save already in progress, ignoring duplicate call');
      return;
    }

    if (!title.trim()) return;
    if (!moduleId || !moduleId.trim()) {
      setError('Module ID is required');
      console.error('❌ [ModuleDetail] Missing or empty moduleId:', moduleId);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const exerciseData = {
        id: editingId || '',
        title: title.trim(),
        description: description.trim(),
        difficulty,
        date,
        status: status,
        canvasUrl: canvasUrl.trim(),
      };

      const courseId = currentCourse?.id;
      if (!courseId || !courseId.trim()) {
        setError('Course not found');
        console.error('❌ [ModuleDetail] Missing or empty courseId:', courseId);
        setSaving(false);
        return;
      }
      
      console.log('✅ [ModuleDetail] Valid IDs:', { moduleId, courseId, title: exerciseData.title });

      if (editingId) {
        // Update existing task
        const apiTask = mapTaskToAPI(exerciseData, moduleId, courseId);
        console.log('🔄 [ModuleDetail] Updating task:', { editingId, apiTask });
        console.log('📋 [ModuleDetail] Full apiTask data:', JSON.stringify(apiTask, null, 2));
        await updateTask(editingId, apiTask);
      } else {
        // Create new task
        const apiTask = mapTaskToAPI(exerciseData, moduleId, courseId);
        console.log('➕ [ModuleDetail] Creating task:', { moduleId, courseId, apiTask });
        const created = await createTask(apiTask);
        console.log('✅ [ModuleDetail] Task created:', created);
      }

      // Reload exercises to ensure we have the latest data from the server
      // This ensures tasks are correctly filtered by moduleId
      const tasks = await loadTasks(courseId, moduleId);
      const mapped = tasks.map(task => mapTaskFromAPI(task, totalStudents));
      setExercises(mapped);

      handleCloseModal();
    } catch (err) {
      console.error('Error saving exercise:', err);
      setError(err instanceof Error ? err.message : 'Failed to save exercise');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    try {
      setError(null);
      const courseId = currentCourse?.id;
      if (!courseId || !moduleId) {
        setError('Course or module not found');
        return;
      }
      
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const exercise = exercises.find(e => e.id === id);
      if (!exercise) return;
      
      const exerciseData = {
        ...exercise,
        status: newStatus,
      };
      
      const apiTask = mapTaskToAPI(exerciseData, moduleId, courseId);
      await updateTask(id, apiTask);
      
      // Reload exercises to ensure we have the latest data from the server
      const tasks = await loadTasks(courseId, moduleId);
      const mapped = tasks.map(task => mapTaskFromAPI(task, totalStudents));
      setExercises(mapped);
    } catch (err) {
      console.error('Error toggling exercise status:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle exercise status');
    }
  }

  async function remove(id: string) {
    try {
      setError(null);
      const courseId = currentCourse?.id;
      if (!courseId || !moduleId) {
        setError('Course or module not found');
        return;
      }
      await deleteTask(id, courseId, moduleId);
      
      // Reload exercises to ensure we have the latest data from the server
      const tasks = await loadTasks(courseId, moduleId);
      const mapped = tasks.map(task => mapTaskFromAPI(task, totalStudents));
      setExercises(mapped);
    } catch (err) {
      console.error('Error deleting exercise:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete exercise');
    }
  }

  const totalCompletions = exercises.reduce((acc, e) => acc + (e.completed || 0), 0);

  return (
    <div className="hh-page" style={{ display: 'grid', gap: 16 }}>
      <div>
        <div className="hh-label">Module Detail</div>
        <div className="hh-title" style={{ marginTop: 8 }}>
          {moduleName}
        </div>
        <div className="hh-hint" style={{ marginTop: 8 }}>
          {currentCourse?.name || 'No course selected'} › Modules
        </div>
      </div>

      {/* Back button and description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        <button
          type="button"
          onClick={() => navigate('/teacher/modules')}
          className="hh-btn hh-btn-secondary"
          style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back to Modules
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div className="hh-card" style={{ padding: '20px 16px', flex: '1 1 200px', minWidth: 0 }}>
              <h2 style={{ fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 650, marginBottom: 8 }}>
                {moduleFromStore?.description || 'Define exercises with difficulty and recommended dates.'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--hh-muted)' }}>
                {exercises.length} exercises • {totalCompletions} completions
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="hh-btn hh-btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              <span style={{ whiteSpace: 'nowrap' }}>Add Exercise</span>
            </button>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hh-card"
          style={{ padding: 16, background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
        >
          <p style={{ fontSize: 14, color: 'rgb(185, 28, 28)' }}>{error}</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="hh-table-wrap"
      >
        {loading ? (
          <div className="hh-card" style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--hh-muted)' }}>Loading exercises...</p>
          </div>
        ) : exercises.length === 0 ? (
          <div className="hh-card" style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontSize: 16, color: 'var(--hh-muted)', marginBottom: 8 }}>
              No exercises yet.
            </p>
            <p style={{ fontSize: 14, color: 'var(--hh-muted)' }}>
              Create your first exercise!
            </p>
          </div>
        ) : (
          <table className="hh-table">
            <thead className="hh-thead">
              <tr>
                <th className="px-5 py-3">Exercise</th>
                <th className="px-5 py-3" style={{ textAlign: 'center' }}>Difficulty</th>
                <th className="px-5 py-3" style={{ textAlign: 'center' }}>Due Date</th>
                <th className="px-5 py-3" style={{ textAlign: 'center' }}>Completed</th>
                <th className="px-5 py-3" style={{ textAlign: 'center' }}>Status</th>
                <th className="px-5 py-3" style={{ width: 48 }}></th>
              </tr>
            </thead>
            <tbody className="hh-tbody">
              {exercises.map((e, index) => (
                <motion.tr
                  key={e.id}
                  className="hh-trow"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.03 }}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openEdit(e)}
                >
                  <td className="px-5 py-4" style={{ fontWeight: 650, color: 'rgba(31,31,35,0.92)' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 650, marginBottom: 2 }}>{e.title}</p>
                      {e.description && (
                        <p
                          style={{
                            fontSize: 12,
                            color: 'var(--hh-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 250,
                          }}
                        >
                          {e.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4" style={{ textAlign: 'center' }}>
                    <DifficultyBadge value={e.difficulty} />
                  </td>
                  <td className="px-5 py-4" style={{ textAlign: 'center' }}>
                    {e.date ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14 }}>
                        <Calendar style={{ width: 14, height: 14, color: 'var(--hh-muted)' }} />
                        {new Date(e.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-4" style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 650 }}>
                      {!e.total || e.total === 0 ? 'No students' : `${e.completed || 0} / ${e.total} students`}
                    </span>
                  </td>
                  <td className="px-5 py-4" style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 650,
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: e.status === 'Active' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(31, 31, 35, 0.06)',
                        color: e.status === 'Active' ? 'rgb(21, 128, 61)' : 'var(--hh-muted)',
                      }}
                    >
                      {e.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-4" style={{ textAlign: 'right' }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu
                        trigger={
                          <button
                            type="button"
                            className="hh-btn hh-btn-secondary"
                            style={{
                              width: 32,
                              height: 32,
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              zIndex: 10,
                              cursor: 'pointer',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical style={{ width: 16, height: 16, color: 'var(--hh-text)' }} />
                          </button>
                        }
                      >
                        {e.status === 'Active' ? (
                          <DropdownMenuItem
                            onClick={() => toggleStatus(e.id, e.status)}
                            background="transparent"
                          >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              Set Inactive
                            </div>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => toggleStatus(e.id, e.status)}
                            background="transparent"
                          >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              Set Active
                            </div>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => openEdit(e)}
                          background="transparent"
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Pencil style={{ width: 14, height: 14, marginRight: 8 }} />
                            Edit
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => remove(e.id)}
                          style={{ color: 'rgb(185, 28, 28)' }}
                          background="transparent"
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Trash2 style={{ width: 14, height: 14, marginRight: 8 }} />
                            Delete
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {modalOpen ? (
        <Modal 
          title={editing ? 'Edit Exercise' : 'Add Exercise'} 
          label="Exercises"
          maxWidth={720}
          onClose={handleCloseModal}
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <div className="hh-label">Exercise Title</div>
              <input
                value={title}
                onChange={(ev) => setTitle(ev.target.value)}
                placeholder="e.g., Introduction to Loops"
                className="hh-input"
                style={{ marginTop: 8 }}
              />
            </div>
            <div>
              <div className="hh-label">Description / Instructions</div>
              <textarea
                value={description}
                onChange={(ev) => setDescription(ev.target.value)}
                placeholder="Describe the exercise and its requirements..."
                rows={4}
                className="hh-textarea"
                style={{ marginTop: 8 }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              <div>
                <div className="hh-label">Difficulty</div>
                <select
                  value={difficulty}
                  onChange={(ev) => setDifficulty(ev.target.value)}
                  className="hh-select"
                  style={{ marginTop: 8 }}
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                  <option>Extreme</option>
                </select>
              </div>
              <div>
                <div className="hh-label">Due Date</div>
                <input
                  type="date"
                  value={date}
                  onChange={(ev) => setDate(ev.target.value)}
                  className="hh-input"
                  style={{ marginTop: 8 }}
                />
              </div>
            </div>
            <div>
              <div className="hh-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LinkIcon style={{ width: 14, height: 14 }} />
                Canvas URL (optional)
              </div>
              <input
                value={canvasUrl}
                onChange={(ev) => setCanvasUrl(ev.target.value)}
                placeholder="https://canvas.school.be/courses/..."
                className="hh-input"
                style={{ marginTop: 8 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, paddingTop: 16, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCloseModal}
                className="hh-btn hh-btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  save();
                }}
                disabled={saving}
                className="hh-btn hh-btn-primary"
                style={{ flex: 1, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Exercise'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

