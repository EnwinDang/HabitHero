import { useMemo, useState, cloneElement, Children, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, MoreVertical, Pencil, Trash2, Calendar, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import { useCourses } from '../../store/courseStore.jsx';
import { loadTasks, createTask, updateTask, deleteTask } from '../../services/task.service';

// Helper functions to map between API format and UI format
function mapTaskFromAPI(apiTask) {
  return {
    id: apiTask.taskId,
    title: apiTask.title,
    description: apiTask.description || '',
    difficulty: apiTask.difficulty ? apiTask.difficulty.charAt(0).toUpperCase() + apiTask.difficulty.slice(1) : 'Easy',
    date: apiTask.dueAt ? new Date(apiTask.dueAt).toISOString().split('T')[0] : '',
    status: apiTask.isActive ? 'Active' : 'Inactive',
    completed: 0, // This would need to come from completion data
    total: 28, // This would need to come from enrollment data
    canvasUrl: '', // Not in API model
  };
}

function mapTaskToAPI(uiTask, moduleId) {
  return {
    taskId: uiTask.id || undefined,
    moduleId: moduleId,
    title: uiTask.title,
    description: uiTask.description || null,
    difficulty: (uiTask.difficulty || 'easy').toLowerCase(),
    dueAt: uiTask.date ? new Date(uiTask.date).getTime() : undefined,
    isActive: uiTask.status !== 'Inactive',
    isRepeatable: false,
    xp: 100, // Default values
    gold: 50,
  };
}

function DifficultyBadge({ value }) {
  const difficultyMap = {
    Easy: { className: 'hh-pill hh-pill--easy', dotColor: 'var(--hh-green)' },
    Medium: { className: 'hh-pill hh-pill--medium', dotColor: 'var(--hh-gold)' },
    Hard: { className: 'hh-pill hh-pill--hard', dotColor: 'rgb(239, 68, 68)' },
    easy: { className: 'hh-pill hh-pill--easy', dotColor: 'var(--hh-green)' },
    medium: { className: 'hh-pill hh-pill--medium', dotColor: 'var(--hh-gold)' },
    hard: { className: 'hh-pill hh-pill--hard', dotColor: 'rgb(239, 68, 68)' },
  };

  const config = difficultyMap[value] || difficultyMap.Easy;
  const displayValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

  return (
    <span className={config.className}>
      <span className="hh-pill-dot" style={{ background: config.dotColor }} />
      {displayValue}
    </span>
  );
}

function DropdownMenu({ children, trigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      // Get trigger button position for fixed positioning
      const rect = e.currentTarget.getBoundingClientRect();
      setTriggerRect({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTriggerRect(null);
  };

  // Clone trigger to add click handler
  const triggerWithClick = cloneElement(trigger, {
    onClick: (e) => {
      handleToggle(e);
      // Call original onClick if it exists
      if (trigger.props.onClick) {
        trigger.props.onClick(e);
      }
    },
  });

  // Clone children to add close handler
  const childrenWithClose = Children.map(children, (child) => {
    if (child && typeof child === 'object' && 'type' in child) {
      return cloneElement(child, { onItemClick: handleClose });
    }
    return child;
  });

  return (
    <div style={{ position: 'relative' }}>
      {triggerWithClick}
      {isOpen && triggerRect && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
            }}
            onClick={handleClose}
          />
          <div
            style={{
              position: 'fixed',
              top: `${triggerRect.top}px`,
              right: `${triggerRect.right}px`,
              zIndex: 1000,
              background: '#fff',
              border: '1px solid var(--hh-border)',
              borderRadius: 8,
              boxShadow: 'var(--hh-shadow)',
              minWidth: 160,
              padding: 4,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {childrenWithClose}
          </div>
        </>
      )}
    </div>
  );
}

function DropdownMenuItem({ children, onClick, disabled = false, style: customStyle = {}, onItemClick }) {
  const handleClick = (e) => {
    if (disabled) return;
    e.stopPropagation();
    if (onClick) onClick(e);
    if (onItemClick) {
      setTimeout(() => onItemClick(), 0);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      style={{
        width: '100%',
        justifyContent: 'flex-start',
        padding: '8px 12px',
        fontSize: 14,
        background: 'transparent',
        border: 'none',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        color: 'inherit',
        ...customStyle,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'rgba(31, 31, 35, 0.04)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="hh-modal-overlay">
      <div className="hh-modal" style={{ maxWidth: 760 }}>
        <div className="hh-modal__head">
          <div>
            <div className="hh-label">Exercises</div>
            <div className="hh-title-sm" style={{ marginTop: 6 }}>
              {title}
            </div>
          </div>
          <button type="button" onClick={onClose} className="hh-btn hh-btn-secondary">
            Close
          </button>
        </div>
        <div className="hh-modal__body">{children}</div>
      </div>
    </div>
  );
}

export default function ModuleDetail() {
  const { moduleId } = useParams();
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

  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Load exercises (tasks) from API
  useEffect(() => {
    if (moduleId) {
      loadExercises();
    }
  }, [moduleId]);

  async function loadExercises() {
    try {
      setLoading(true);
      setError(null);
      const tasks = await loadTasks(undefined, moduleId);
      const mapped = tasks.map(mapTaskFromAPI);
      setExercises(mapped);
    } catch (err) {
      console.error('Error loading exercises:', err);
      setError(err.message || 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  }

  const editing = useMemo(
    () => exercises.find((e) => e.id === editingId) || null,
    [exercises, editingId]
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [date, setDate] = useState('');
  const [canvasUrl, setCanvasUrl] = useState('');

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setDifficulty('Easy');
    setDate('');
    setCanvasUrl('');
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(ex) {
    setEditingId(ex.id);
    setTitle(ex.title || '');
    setDescription(ex.description || '');
    setDifficulty(ex.difficulty || 'Easy');
    setDate(ex.date || '');
    setCanvasUrl(ex.canvasUrl || '');
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
    if (!title.trim()) return;
    if (!moduleId) {
      setError('Module ID is required');
      return;
    }

    try {
      setError(null);
      const exerciseData = {
        id: editingId || '',
        title: title.trim(),
        description: description.trim(),
        difficulty,
        date,
        status: 'Active',
        canvasUrl: canvasUrl.trim(),
      };

      if (editingId) {
        // Update existing task
        const apiTask = mapTaskToAPI(exerciseData, moduleId);
        const updated = await updateTask(editingId, apiTask);
        const mapped = mapTaskFromAPI(updated);
        setExercises((prev) =>
          prev.map((e) => (e.id === editingId ? mapped : e))
        );
      } else {
        // Create new task
        const apiTask = mapTaskToAPI(exerciseData, moduleId);
        const created = await createTask(apiTask);
        const mapped = mapTaskFromAPI(created);
        setExercises((prev) => [mapped, ...prev]);
      }

      handleCloseModal();
    } catch (err) {
      console.error('Error saving exercise:', err);
      setError(err.message || 'Failed to save exercise');
    }
  }

  async function remove(id) {
    try {
      setError(null);
      await deleteTask(id);
      setExercises((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Error deleting exercise:', err);
      setError(err.message || 'Failed to delete exercise');
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

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div className="hh-card" style={{ padding: 24, flex: 1, minWidth: 300 }}>
            <h2 style={{ fontSize: 18, fontWeight: 650, marginBottom: 8 }}>
              {moduleFromStore?.description || 'Define exercises with difficulty and recommended dates.'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--hh-muted)' }}>
              {exercises.length} exercises • {totalCompletions} completions
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="hh-btn hh-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            Add Exercise
          </button>
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
                <th className="px-5 py-3">Difficulty</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3">Completed</th>
                <th className="px-5 py-3">Status</th>
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
                  <td className="px-5 py-4">
                    <DifficultyBadge value={e.difficulty} />
                  </td>
                  <td className="px-5 py-4">
                    {e.date ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
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
                  <td className="px-5 py-4">
                    <span style={{ fontSize: 14, fontWeight: 650 }}>
                      {e.completed || 0} / {e.total || 28}
                    </span>
                  </td>
                  <td className="px-5 py-4">
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
                            }}
                          >
                            <MoreVertical style={{ width: 16, height: 16 }} />
                          </button>
                        }
                      >
                        <DropdownMenuItem
                          onClick={() => openEdit(e)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Pencil style={{ width: 14, height: 14, marginRight: 8 }} />
                            Edit
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => remove(e.id)}
                          style={{ color: 'rgb(185, 28, 28)' }}
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
        <Modal title={editing ? 'Edit Exercise' : 'Add Exercise'} onClose={handleCloseModal}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
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
                onClick={save}
                className="hh-btn hh-btn-primary"
                style={{ flex: 1 }}
              >
                {editing ? 'Save Changes' : 'Add Exercise'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

