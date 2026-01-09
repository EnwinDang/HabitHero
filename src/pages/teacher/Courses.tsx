import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCourses } from '../../store/courseStore';
import { Modal } from '../../components/Modal';

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
  const [courseCode, setCourseCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');

  function openCreate() {
    setEditingId(null);
    setName('');
    setCourseCode('');
    setDescription('');
    setStartDate('');
    setModalOpen(true);
  }

  function openEdit(course: { id: string; name?: string; courseCode?: string; description?: string; startDate?: string | null }) {
    setEditingId(course.id);
    setName(course.name || '');
    setCourseCode(course.courseCode || '');
    setDescription(course.description || '');
    setStartDate(course.startDate || '');
    setModalOpen(true);
  }

  async function save() {
    if (!name.trim() || !courseCode.trim()) return;

    try {
      if (editingId) {
        await updateCourse(editingId, { name, courseCode, description, startDate });
      } else {
        await addCourse({ name, courseCode, description, startDate });
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
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <div className="hh-label">Courses</div>
            <div className="hh-title" style={{ marginTop: 8 }}>
              Course Management
            </div>
            <div className="hh-hint" style={{ marginTop: 8 }}>
              Create and manage your courses.
            </div>
          </div>
          <button type="button" onClick={openCreate} className="hh-btn hh-btn-primary" style={{ flexShrink: 0 }}>
            + New Course
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
              <th className="px-5 py-3" style={{ textAlign: 'center' }}>Course code</th>
              <th className="px-5 py-3" style={{ textAlign: 'center' }}>Start date</th>
              <th className="px-5 py-3" style={{ textAlign: 'center' }}>Modules</th>
              <th className="px-5 py-3" style={{ textAlign: 'center' }}>Actions</th>
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
                <td className="px-5 py-4" style={{ textAlign: 'center' }}>{c.courseCode || '—'}</td>
                <td className="px-5 py-4" style={{ textAlign: 'center' }}>{c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}</td>
                <td className="px-5 py-4" style={{ textAlign: 'center' }}>{(c.modules || []).length}</td>
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
        <Modal 
          title={editing ? 'Edit course' : 'Create course'} 
          label="Course Management"
          maxWidth={720}
          onClose={() => setModalOpen(false)}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <div className="hh-label">Course name</div>
              <input value={name} onChange={(e) => setName(e.target.value)} className="hh-input" style={{ marginTop: 8 }} placeholder="Programming Essentials 1" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
              <div>
                <div className="hh-label">Course code</div>
                <input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} className="hh-input" style={{ marginTop: 8 }} placeholder="PE1-2026" />
              </div>
              <div>
                <div className="hh-label">Start date</div>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="hh-input" style={{ marginTop: 8 }} />
              </div>
            </div>
            <div>
              <div className="hh-label">Description</div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="hh-input" style={{ marginTop: 8, minHeight: 80 }} placeholder="Basis programmeren: variabelen, beslissingen en logica" />
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
