import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCourses } from '../../store/courseStore';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="hh-modal-overlay">
      <div className="hh-modal" style={{ maxWidth: 720 }}>
        <div className="hh-modal__head">
          <div>
            <div className="hh-label">Course Management</div>
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

export default function Courses() {
  const navigate = useNavigate();
  const {
    courses,
    loading,
    error,
    addCourse,
    updateCourse,
    setCourseActive,
    deleteCourse,
  } = useCourses();

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = useMemo(() => courses.find((c) => c.id === editingId) || null, [courses, editingId]);

  const [name, setName] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [program, setProgram] = useState<string>('');

  function openCreate() {
    setEditingId(null);
    setName('');
    setYear('');
    setProgram('');
    setModalOpen(true);
  }

  function openEdit(course: { id: string; name?: string; year?: string; program?: string }) {
    setEditingId(course.id);
    setName(course.name || '');
    setYear(course.year || '');
    setProgram(course.program || '');
    setModalOpen(true);
  }

  async function save() {
    if (!name.trim()) return;

    try {
      if (editingId) {
        await updateCourse(editingId, { name, year, program });
      } else {
        await addCourse({ name, year, program });
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Error saving course:', err);
      // Error is handled in the store
    }
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
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div>
          <div className="hh-label">Courses</div>
          <div className="hh-title" style={{ marginTop: 8 }}>
            Course Management
          </div>
          <div className="hh-hint" style={{ marginTop: 8 }}>
            Create and manage your courses.
          </div>
        </div>
        <button type="button" onClick={openCreate} className="hh-btn hh-btn-primary">
          + New Course
        </button>
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

      {loading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hh-card"
          style={{ padding: 48, textAlign: 'center' }}
        >
          <p style={{ fontSize: 14, color: 'var(--hh-muted)' }}>Loading courses...</p>
        </motion.div>
      ) : (
        <motion.div 
          className="hh-table-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <table className="hh-table">
          <thead className="hh-thead">
            <tr>
              <th className="px-5 py-3">Course name</th>
              <th className="px-5 py-3">Year</th>
              <th className="px-5 py-3">Program</th>
              <th className="px-5 py-3">Modules</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="hh-tbody">
            {courses.map((c) => (
              <tr
                key={c.id}
                className="hh-trow"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/teacher/modules')}
              >
                <td className="px-5 py-4" style={{ fontWeight: 750, color: 'rgba(31,31,35,0.92)' }}>
                  {c.name}
                  {c.active === false ? (
                    <span className="hh-pill hh-pill--behind" style={{ marginLeft: 10 }}>
                      <span className="hh-pill-dot" />
                      Inactive
                    </span>
                  ) : (
                    <span className="hh-pill hh-pill--ahead" style={{ marginLeft: 10 }}>
                      <span className="hh-pill-dot" style={{ background: 'var(--hh-green)' }} />
                      Active
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">{c.year || '—'}</td>
                <td className="px-5 py-4">{c.program || '—'}</td>
                <td className="px-5 py-4">{(c.modules || []).length}</td>
                <td className="px-5 py-4">
                  <div
                    className="flex"
                    style={{ gap: 10, flexWrap: 'wrap' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {c.active === false ? (
                      <button
                        type="button"
                        onClick={() => setCourseActive(c.id, true)}
                        className="hh-btn hh-btn-secondary"
                        style={{ paddingTop: 8, paddingBottom: 8, fontSize: 12 }}
                      >
                        Activate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await setCourseActive(c.id, false);
                          } catch (err) {
                            console.error('Error deactivating course:', err);
                          }
                        }}
                        className="hh-btn hh-btn-secondary"
                        style={{ paddingTop: 8, paddingBottom: 8, fontSize: 12 }}
                      >
                        Deactivate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="hh-btn hh-btn-secondary"
                      style={{ paddingTop: 8, paddingBottom: 8, fontSize: 12 }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this course?')) {
                          try {
                            await deleteCourse(c.id);
                          } catch (err) {
                            console.error('Error deleting course:', err);
                          }
                        }
                      }}
                      className="hh-btn hh-btn-danger"
                      style={{ paddingTop: 8, paddingBottom: 8, fontSize: 12 }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </motion.div>
      )}

      {modalOpen ? (
        <Modal title={editing ? 'Edit course' : 'Create course'} onClose={() => setModalOpen(false)}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <div className="hh-label">Course name</div>
              <input value={name} onChange={(e) => setName(e.target.value)} className="hh-input" style={{ marginTop: 8 }} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="hh-label">Year</div>
                <input value={year} onChange={(e) => setYear(e.target.value)} className="hh-input" style={{ marginTop: 8 }} />
              </div>
              <div>
                <div className="hh-label">Program</div>
                <input value={program} onChange={(e) => setProgram(e.target.value)} className="hh-input" style={{ marginTop: 8 }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={() => setModalOpen(false)} className="hh-btn hh-btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={save} className="hh-btn hh-btn-primary">
                Save course
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </motion.div>
  );
}
