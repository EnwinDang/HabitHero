import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { UserPlus, Shield, Trash2, CheckCircle, X } from 'lucide-react';
import { UsersAPI } from '../../api/users.api';

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ displayName: '', email: '' });

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const unsub = onSnapshot(q, (snap) => {
      setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await UsersAPI.create({
        displayName: newTeacher.displayName,
        email: newTeacher.email,
        role: 'teacher'
      } as any);

      await addDoc(collection(db, 'logs'), {
        action: `New Teacher Created: ${newTeacher.displayName}`,
        user: 'Admin',
        timestamp: serverTimestamp(),
        type: 'user_management'
      });

      setIsModalOpen(false);
      setNewTeacher({ displayName: '', email: '' });
      alert("Teacher account created. Default password: ehbleerkracht.123");
    } catch (err: any) {
      console.error("Error adding teacher:", err);
      alert("Failed to create teacher: " + err.message);
    }
  };

  const handleToggleStatus = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await UsersAPI.patch(uid, { status: newStatus });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name}?`)) {
      try {
        await deleteDoc(doc(db, 'users', id));
        await addDoc(collection(db, 'logs'), {
          action: `Teacher Removed: ${name}`,
          user: 'Admin',
          timestamp: serverTimestamp(),
          type: 'user_management'
        });
      } catch (err) {
        console.error("Error deleting teacher:", err);
      }
    }
  };

  return (
    <div className="p-8 bg-violet-50/40 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Teacher Management</h1>
          <p className="text-slate-400 font-medium">Beheer alle docenten binnen HabitHero</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-violet-200 transition-all"
        >
          <UserPlus size={20} /> Add Teacher
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-violet-100/50 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {teachers.map((teacher) => (
              <tr key={teacher.id} className="hover:bg-violet-50/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600 font-black text-xs">
                      {teacher.displayName?.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-700">{teacher.displayName}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-slate-500 font-medium text-sm">{teacher.email}</td>
                <td className="px-8 py-5">
                  <button
                    onClick={() => handleToggleStatus(teacher.id, teacher.status)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                      teacher.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                        : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                    }`}
                  >
                    {teacher.status === 'active' ? (
                      <>
                        <CheckCircle size={12} /> Active
                      </>
                    ) : (
                      <>
                        <X size={12} /> Inactive
                      </>
                    )}
                  </button>
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => handleDeleteTeacher(teacher.id, teacher.displayName)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 mb-6">
              <Shield size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">New Teacher</h2>
            <p className="text-sm text-slate-400 font-medium mb-8">Voeg een nieuwe docent toe met standaard wachtwoord.</p>
            
            <form onSubmit={handleAddTeacher} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  required
                  value={newTeacher.displayName}
                  onChange={(e) => setNewTeacher({...newTeacher, displayName: e.target.value})}
                  className="w-full mt-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  placeholder="e.g. Professor Oak"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  required
                  type="email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                  className="w-full mt-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  placeholder="teacher@ehb.be"
                />
              </div>
              <div className="flex gap-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-violet-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-violet-700 shadow-lg shadow-violet-100 transition-all"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;
