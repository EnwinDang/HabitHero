import { useMemo, useState, cloneElement, Children } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useCourses } from '../../store/courseStore';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="hh-modal-overlay">
      <div className="hh-modal" style={{ maxWidth: 640 }}>
        <div className="hh-modal__head">
          <div>
            <div className="hh-label">Modules</div>
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

interface DropdownMenuProps {
  children: React.ReactNode;
  trigger: React.ReactElement;
}

function DropdownMenu({ children, trigger }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [triggerRect, setTriggerRect] = useState<{ top: number; right: number } | null>(null);

  const handleToggle = (e: React.MouseEvent) => {
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
    onClick: (e: React.MouseEvent) => {
      handleToggle(e);
      // Call original onClick if it exists
      if (trigger.props && typeof trigger.props === 'object' && 'onClick' in trigger.props) {
        const onClick = (trigger.props as any).onClick;
        if (typeof onClick === 'function') {
          onClick(e);
        }
      }
    },
  } as any);

  // Clone children to add close handler
  const childrenWithClose = Children.map(children, (child) => {
    if (child && typeof child === 'object' && 'type' in child) {
      return cloneElement(child as React.ReactElement, { onItemClick: handleClose } as any);
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

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  onItemClick?: () => void;
}

function DropdownMenuItem({ children, onClick, disabled = false, style: customStyle = {}, onItemClick }: DropdownMenuItemProps) {
  const handleClick = (e: React.MouseEvent) => {
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

export default function Modules() {
  const navigate = useNavigate();
  const {
    courses,
    loading,
    error,
    addModule,
    updateModule,
    setModuleActive,
    deleteModule,
  } = useCourses();

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  
  // Find the module being edited across all courses
  const editing = useMemo(() => {
    if (!editingId || !editingCourseId) return null;
    const course = courses.find((c) => c.id === editingCourseId);
    return course?.modules?.find((m) => m.id === editingId) || null;
  }, [courses, editingId, editingCourseId]);

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  function openCreate(courseId: string) {
    setEditingId(null);
    setEditingCourseId(courseId);
    setName('');
    setDescription('');
    setModalOpen(true);
  }

  function openEdit(module: { id: string; name: string; description: string }, courseId: string) {
    setEditingId(module.id);
    setEditingCourseId(courseId);
    setName(module.name);
    setDescription(module.description);
    setModalOpen(true);
  }

  async function save() {
    if (!name.trim()) return;
    if (!editingCourseId) return;

    try {
      if (editingId) {
        await updateModule(editingCourseId, editingId, {
          name: name.trim(),
          description: description.trim(),
        });
      } else {
        await addModule(editingCourseId, {
          name: name.trim(),
          description: description.trim(),
        });
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Error saving module:', err);
      // Error is handled in the store
    }
  }

  async function remove(courseId: string, moduleId: string) {
    if (!courseId) return;
    try {
      await deleteModule(courseId, moduleId);
    } catch (err) {
      console.error('Error deleting module:', err);
      // Error is handled in the store
    }
  }

  return (
    <div className="hh-page" style={{ display: 'grid', gap: 16 }}>
      <div>
        <div className="hh-label">Modules</div>
        <div className="hh-title" style={{ marginTop: 8 }}>
          Modules
        </div>
        <div className="hh-hint" style={{ marginTop: 8 }}>
          Manage your course modules and their exercises
        </div>
      </div>

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

      {loading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hh-card"
          style={{ padding: 48, textAlign: 'center' }}
        >
          <p style={{ fontSize: 14, color: 'var(--hh-muted)' }}>Loading courses...</p>
        </motion.div>
      ) : courses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hh-card"
          style={{ padding: 22, marginBottom: 24 }}
        >
          <div className="hh-title-sm">No courses</div>
          <div className="hh-hint" style={{ marginTop: 10 }}>
            Go to Course Management to add a course.
          </div>
          <div style={{ marginTop: 14 }}>
            <button 
              type="button"
              onClick={() => navigate('/teacher/courses')}
              className="hh-btn hh-btn-primary"
            >
              Go to Course Management
            </button>
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gap: 32 }}>
          {courses.map((course, courseIndex) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: courseIndex * 0.1 }}
            >
              {/* Course Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                    {course.name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {course.year && (
                      <span style={{ fontSize: 14, color: 'var(--hh-muted)' }}>
                        Year {course.year}
                      </span>
                    )}
                    {course.program && (
                      <span style={{ fontSize: 14, color: 'var(--hh-muted)' }}>
                        {course.program}
                      </span>
                    )}
                    {course.active === false ? (
                      <span className="hh-pill hh-pill--behind">
                        <span className="hh-pill-dot" />
                        Inactive
                      </span>
                    ) : (
                      <span className="hh-pill hh-pill--ahead">
                        <span className="hh-pill-dot" style={{ background: 'var(--hh-green)' }} />
                        Active
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openCreate(course.id)}
                  className="hh-btn hh-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Plus style={{ width: 16, height: 16 }} />
                  New Module
                </button>
              </div>

              {/* Modules Table */}
              {course.modules && course.modules.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: courseIndex * 0.1 + 0.1 }}
                  className="hh-table-wrap"
                >
                  <table className="hh-table">
                    <thead className="hh-thead">
                      <tr>
                        <th className="px-5 py-3">Module Name</th>
                        <th className="px-5 py-3">Exercises</th>
                        <th className="px-5 py-3">Avg Completion</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3" style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="hh-tbody">
                      {course.modules.map((m, index) => (
                        <motion.tr
                          key={m.id}
                          className="hh-trow"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: courseIndex * 0.1 + 0.15 + index * 0.03 }}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/teacher/modules/${m.id}`)}
                        >
                          <td className="px-5 py-4" style={{ fontWeight: 700, color: 'rgba(31,31,35,0.92)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 12,
                                  background: 'rgba(75, 74, 239, 0.10)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <BookOpen style={{ width: 20, height: 20, color: 'var(--hh-indigo)' }} />
                              </div>
                              <div>
                                <p style={{ fontSize: 14, fontWeight: 650, marginBottom: 2 }}>{m.name}</p>
                                <p
                                  style={{
                                    fontSize: 12,
                                    color: 'var(--hh-muted)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 300,
                                  }}
                                >
                                  {m.description}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4" style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 650 }}>{m.exercises || 0}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div style={{ width: 128 }}>
                              <div className="hh-progress">
                                <div 
                                  className="hh-progress__bar" 
                                  style={{ width: `${m.completion || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {m.active === false ? (
                              <span className="hh-pill hh-pill--behind">
                                <span className="hh-pill-dot" />
                                Inactive
                              </span>
                            ) : (
                              <span className="hh-pill hh-pill--ahead">
                                <span className="hh-pill-dot" style={{ background: 'var(--hh-green)' }} />
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4" style={{ textAlign: 'right' }}>
                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/teacher/modules/${m.id}`);
                                }}
                                className="hh-btn hh-btn-secondary"
                                style={{ padding: '6px 12px', fontSize: 12 }}
                              >
                                View
                              </button>
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
                                {m.active === false ? (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      try {
                                        await setModuleActive(course.id, m.id, true);
                                      } catch (err) {
                                        console.error('Error activating module:', err);
                                      }
                                    }}
                                  >
                                    Activate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      try {
                                        await setModuleActive(course.id, m.id, false);
                                      } catch (err) {
                                        console.error('Error deactivating module:', err);
                                      }
                                    }}
                                  >
                                    Deactivate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => openEdit(m, course.id)}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <Pencil style={{ width: 14, height: 14, marginRight: 8 }} />
                                    Edit
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => remove(course.id, m.id)}
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
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: courseIndex * 0.1 + 0.1 }}
                  className="hh-card"
                  style={{ padding: 32, textAlign: 'center' }}
                >
                  <p style={{ fontSize: 14, color: 'var(--hh-muted)', marginBottom: 8 }}>
                    No modules yet
                  </p>
                  <button
                    type="button"
                    onClick={() => openCreate(course.id)}
                    className="hh-btn hh-btn-secondary"
                    style={{ marginTop: 8 }}
                  >
                    <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
                    Create First Module
                  </button>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {modalOpen ? (
        <Modal title={editing ? 'Edit Module' : 'Create Module'} onClose={() => setModalOpen(false)}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <div className="hh-label">Module name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Module 7 – Advanced Functions"
                className="hh-input"
                style={{ marginTop: 8 }}
              />
            </div>
            <div>
              <div className="hh-label">Description</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the module content..."
                rows={4}
                className="hh-textarea"
                style={{ marginTop: 8 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, paddingTop: 16, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
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
                {editing ? 'Save Changes' : 'Create Module'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
