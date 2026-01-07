import React, { useEffect, useState } from 'react';
import { Search, Trash2, GraduationCap, Loader2, Mail, Shield, Coins, UserPlus, X } from 'lucide-react';
import { UsersAPI } from '../../api/users.api';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from '../../models/user.model';

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ displayName: '', email: '' });

  const loadStudents = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await UsersAPI.list({ role: 'student' });
      setStudents(response.data || []);
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to load students";
      console.error("Fout bij het laden van studenten:", error);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users'), {
        displayName: newStudent.displayName,
        email: newStudent.email,
        role: 'student',
        status: 'active',
        createdAt: serverTimestamp(),
        stats: { hp: 100, gold: 0, level: 1, xp: 0 },
        settings: { theme: 'light', language: 'nl', notificationsEnabled: true }
      });

      await addDoc(collection(db, 'logs'), {
        action: `New Student Added: ${newStudent.displayName}`,
        user: 'Admin',
        timestamp: serverTimestamp(),
        type: 'user_management'
      });

      setIsModalOpen(false);
      setNewStudent({ displayName: '', email: '' });
      loadStudents();
    } catch (err) {
      console.error("Fout bij toevoegen student:", err);
    }
  };

  const handleDelete = async (uid: string, displayName: string): Promise<void> => {
    if (window.confirm(`Wil je ${displayName} verwijderen uit de academie?`)) {
      try {
        await UsersAPI.delete(uid);
        
        await addDoc(collection(db, 'logs'), {
          action: `Student Removed: ${displayName}`,
          user: 'Admin',
          timestamp: serverTimestamp(),
          type: 'user_management'
        });

        setStudents(prev => prev.filter(s => s.uid !== uid));
      } catch (error) {
        console.error("Fout bij verwijderen student:", error);
      }
    }
  };

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-violet-50 p-8 text-slate-900 font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
            <GraduationCap className="text-violet-500" size={32} />
            Student Academy
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Monitor heroes-in-training and their combat readiness
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-violet-200 transition-all"
        >
          <UserPlus size={20} /> Add Student
        </button>
      </div>

      <div className="relative mb-10 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={22} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search students by name or EhB email..." 
          className="w-full bg-white border border-violet-100 rounded-2xl py-4 pl-14 pr-6 text-slate-900 shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="text-center p-20 text-violet-500 animate-pulse font-semibold">
          <Loader2 className="animate-spin inline-block mr-2" size={20} /> Loading academy data...
        </div>
      ) : error ? (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-8 text-center">
          <p className="text-rose-700 font-semibold mb-4"> {error}</p>
          <p className="text-rose-600 text-sm mb-6">Make sure you're logged in as an admin</p>
          <button 
            onClick={loadStudents}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all font-semibold"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student.uid}
              className="bg-white border border-violet-100 p-5 rounded-[2rem] flex items-center justify-between hover:border-violet-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img 
                    src={student.photoURL || `https://ui-avatars.com/api/?name=${student.displayName}&background=f5f3ff&color=8b5cf6`} 
                    className="w-16 h-16 rounded-2xl object-cover border border-violet-200 bg-violet-50 relative z-10"
                    alt=""
                  />
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 border-4 border-white rounded-full z-20 ${
                      student.status === 'active' ? 'bg-emerald-400' : 'bg-slate-300'
                    }`}
                  ></div>
                </div>

                <div>
                  <h3 className="text-slate-900 font-semibold text-xl group-hover:text-violet-600 transition-colors tracking-tight">
                    {student.displayName}
                  </h3>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-slate-500 text-sm font-medium flex items-center gap-1.5 mt-0.5">
                      <Mail size={14} className="text-slate-400 shrink-0" /> {student.email}
                    </p>
                  </div>
                  
                  <div className="flex gap-3 mt-3">
                    <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                      <Shield size={12} className="text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        {(student.stats as any)?.hp ?? 100} HP
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">
                      <Coins size={12} className="text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                        {(student.stats as any)?.gold ?? 0} GOLD
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pr-4">
                <button 
                  onClick={() => handleDelete(student.uid, student.displayName || 'Student')}
                  className="p-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                >
                  <Trash2 size={22} />
                </button>
              </div>
            </div>
          ))}

          {filteredStudents.length === 0 && (
            <div className="text-center p-20 text-slate-400 bg-white border border-dashed border-slate-200 rounded-[2rem]">
              No students found in the academy directory.
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Shield className="text-violet-500" /> New Student
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  required
                  value={newStudent.displayName}
                  onChange={(e) => setNewStudent({...newStudent, displayName: e.target.value})}
                  className="w-full mt-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  placeholder="e.g. Ash Ketchum"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Email</label>
                <input 
                  required
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                  className="w-full mt-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  placeholder="student@ehb.be"
                />
              </div>
              <div className="flex gap-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-violet-700 shadow-lg shadow-violet-100"
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

export default StudentManagement;
