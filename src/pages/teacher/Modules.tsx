import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useCourses } from '../../store/courseStore';
import { Modal } from '../../components/Modal';
import { DropdownMenuItem } from '../../components/DropdownMenuItem';

// Module-specific dropdown menu component
interface ModuleDropdownMenuProps {
  module: any;
  courseId: string;
  onEdit: (module: any, courseId: string) => void;
  onDelete: (courseId: string, moduleId: string) => void;
  onToggleActive: (courseId: string, moduleId: string, active: boolean) => void;
}

function ModuleDropdownMenu({ module, courseId, onEdit, onDelete, onToggleActive }: ModuleDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  const handleItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block', zIndex: 1001 }}>
      <button
        type="button"
        onClick={handleToggle}
        style={{
          width: 32,
          height: 32,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: 'pointer',
          background: '#ffffff',
          border: '1px solid var(--hh-border)',
          borderRadius: 8,
          minWidth: 32,
          minHeight: 32,
          opacity: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(31, 31, 35, 0.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff';
        }}
      >
        <MoreVertical style={{ width: 16, height: 16, color: 'var(--hh-text)', opacity: 1 }} />
      </button>
      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
              background: 'transparent',
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              zIndex: 1000,
              background: '#ffffff',
              border: '1px solid var(--hh-border)',
              borderRadius: 8,
              boxShadow: 'var(--hh-shadow)',
              minWidth: 160,
              padding: 4,
              opacity: 1,
              pointerEvents: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
          {module.active === false ? (
            <DropdownMenuItem
              onClick={() => handleItemClick(() => onToggleActive(courseId, module.id, true))}
            >
              Activate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => handleItemClick(() => onToggleActive(courseId, module.id, false))}
            >
              Deactivate
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => handleItemClick(() => onEdit(module, courseId))}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Pencil style={{ width: 14, height: 14, marginRight: 8 }} />
              Edit
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleItemClick(() => onDelete(courseId, module.id))}
            style={{ color: 'rgb(185, 28, 28)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Trash2 style={{ width: 14, height: 14, marginRight: 8 }} />
              Delete
            </div>
          </DropdownMenuItem>
          </div>
        </>
      )}
    </div>
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
  const [active, setActive] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  function openCreate(courseId: string) {
    setEditingId(null);
    setEditingCourseId(courseId);
    setName('');
    setDescription('');
    setActive(true);
    setModalOpen(true);
  }

  function openEdit(module: { id: string; name: string; description: string; active?: boolean }, courseId: string) {
    setEditingId(module.id);
    setEditingCourseId(courseId);
    setName(module.name);
    setDescription(module.description);
    setActive(module.active !== false);
    setModalOpen(true);
  }

  async function save() {
    if (!name.trim()) return;
    if (!editingCourseId) return;
    if (saving) return; // Prevent duplicate saves

    setSaving(true);
    try {
      if (editingId) {
        await updateModule(editingCourseId, editingId, {
          name: name.trim(),
          description: description.trim(),
        });
        // Update active status separately if it changed
        const currentModule = courses.find(c => c.id === editingCourseId)?.modules?.find(m => m.id === editingId);
        if (currentModule && currentModule.active !== active) {
          await setModuleActive(editingCourseId, editingId, active);
        }
      } else {
        await addModule(editingCourseId, {
          name: name.trim(),
          description: description.trim(),
        });
        // Note: New modules are created as active by default
        // If we need to set them as inactive, we'd need to wait for the module to be created first
        // For now, new modules will always be active
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Error saving module:', err);
      // Error is handled in the store
    } finally {
      setSaving(false);
    }
  }

  async function remove(courseId: string, moduleId: string) {
    if (!courseId) return;
    
    const module = courses.find(c => c.id === courseId)?.modules?.find(m => m.id === moduleId);
    const moduleName = module?.name || 'this module';
    
    if (!window.confirm(`Are you sure you want to delete "${moduleName}"? This action cannot be undone.`)) {
      return;
    }
    
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
                  flexDirection: 'column',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, marginBottom: 4 }}>
                      {course.name}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      {course.year && (
                        <span style={{ fontSize: 13, color: 'var(--hh-muted)' }}>
                          Year {course.year}
                        </span>
                      )}
                      {course.program && (
                        <span style={{ fontSize: 13, color: 'var(--hh-muted)' }}>
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
                    style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
                  >
                    <Plus style={{ width: 16, height: 16 }} />
                    <span style={{ whiteSpace: 'nowrap' }}>New Module</span>
                  </button>
                </div>
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
                      {[...course.modules]
                        .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
                        .map((m, index) => {
                          const handleRowClick = () => {
                            if (m.id && m.id.trim()) {
                              navigate(`/teacher/modules/${m.id}`);
                            } else {
                              console.error('Module missing ID:', m);
                              alert(`Module "${m.name}" is missing an ID. Please contact support or recreate this module.`);
                            }
                          };
                          
                          return (
                        <motion.tr
                          key={m.id || `module-${index}`}
                          className="hh-trow"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: courseIndex * 0.1 + 0.15 + index * 0.03 }}
                          style={{ 
                            cursor: m.id ? 'pointer' : 'not-allowed',
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 1
                          }}
                          onClick={handleRowClick}
                        >
                          <td 
                            className="px-5 py-4" 
                            style={{ fontWeight: 700, color: 'rgba(31,31,35,0.92)', cursor: m.id ? 'pointer' : 'not-allowed' }}
                            onClick={handleRowClick}
                          >
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
                          <td 
                            className="px-5 py-4" 
                            style={{ textAlign: 'center', cursor: m.id ? 'pointer' : 'not-allowed' }}
                            onClick={handleRowClick}
                          >
                            <span style={{ fontSize: 14, fontWeight: 650 }}>{m.exercises || 0}</span>
                          </td>
                          <td 
                            className="px-5 py-4"
                            style={{ cursor: m.id ? 'pointer' : 'not-allowed' }}
                            onClick={handleRowClick}
                          >
                            <div style={{ width: 128 }}>
                              <div className="hh-progress">
                                <div 
                                  className="hh-progress__bar" 
                                  style={{ width: `${m.completion || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td 
                            className="px-5 py-4"
                            style={{ cursor: m.id ? 'pointer' : 'not-allowed' }}
                            onClick={handleRowClick}
                          >
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
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}
                              onClick={(e) => e.stopPropagation()}
                            >
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(m, course.id);
                                }}
                                title="Edit"
                              >
                                <Pencil style={{ width: 16, height: 16, color: 'var(--hh-text)' }} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                          );
                        })}
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
        <Modal 
          title={editing ? 'Edit Module' : 'Create Module'} 
          label="Modules"
          maxWidth={640}
          onClose={() => setModalOpen(false)}
        >
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
            {editing && (
              <div>
                <div className="hh-label" style={{ marginBottom: 8 }}>Status</div>
                <label
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    style={{
                      opacity: 0,
                      width: 0,
                      height: 0,
                    }}
                  />
                  <span
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: 44,
                      height: 24,
                      backgroundColor: active ? 'var(--hh-green)' : 'rgba(31, 31, 35, 0.2)',
                      borderRadius: 24,
                      transition: 'background-color 0.3s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: 18,
                        width: 18,
                        left: active ? '22px' : '3px',
                        top: '3px',
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                        transition: 'left 0.3s',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                      }}
                    />
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--hh-text)' }}>
                    {active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, paddingTop: 16, justifyContent: 'space-between', alignItems: 'center' }}>
              {editing && editingId && editingCourseId ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${name || 'this module'}"? This action cannot be undone.`)) {
                      remove(editingCourseId, editingId);
                      setModalOpen(false);
                    }
                  }}
                  className="hh-btn hh-btn-danger"
                  style={{ 
                    minWidth: 120, 
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Trash2 style={{ width: 16, height: 16 }} />
                  <span>Delete</span>
                </button>
              ) : (
                <div />
              )}
              <div style={{ display: 'flex', gap: 12, flex: editing ? 0 : 1, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="hh-btn hh-btn-secondary"
                  style={{ flex: editing ? 0 : 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="hh-btn hh-btn-primary"
                  style={{ flex: editing ? 0 : 1 }}
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Module'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
