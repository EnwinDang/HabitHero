import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, MoreVertical, GraduationCap } from 'lucide-react';
import { UsersAPI } from '../../api/users.api';
import type { User } from '../../models/user.model';

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadStudents = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await UsersAPI.list({ role: 'student' });
      setStudents(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleDelete = async (uid: string): Promise<void> => {
    if (window.confirm("Weet je zeker dat je deze student wilt verwijderen?")) {
      try {
        await UsersAPI.delete(uid);
        setStudents(prev => prev.filter(s => s.uid !== uid));
      } catch (error) {
        console.error(error);
      }
    }
  };

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <GraduationCap className="text-indigo-500" size={32} />
            Student Management
          </h1>
          <p className="text-slate-500 mt-1 text-lg">Manage and monitor all active players</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-indigo-500/20 active:scale-95">
          <Plus size={22} /> Add Student
        </button>
      </div>

      <div className="relative mb-10 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={22} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search students by name or email..." 
          className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none transition-all backdrop-blur-sm placeholder:text-slate-600"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-indigo-500 gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium animate-pulse">Fetching data...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredStudents.map((student: User) => (
            <div key={student.uid} className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl flex items-center justify-between hover:border-indigo-500/40 hover:bg-slate-900/60 transition-all group">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <img 
                    src={student.photoURL || `https://ui-avatars.com/api/?name=${student.displayName}&background=4f46e5&color=fff`} 
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-700 relative z-10"
                    alt={student.displayName || ''}
                  />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-4 border-slate-950 rounded-full z-20 ${student.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl group-hover:text-indigo-300 transition-colors">{student.displayName}</h3>
                  <p className="text-slate-500 font-medium">{student.email}</p>
                  <div className="flex gap-3 mt-2">
                    <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      {(student.stats as any)?.hp ?? 100} HP
                    </span>
                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      {(student.stats as any)?.gold ?? 0} GOLD
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="text-right min-w-[140px]">
                  <div className="text-indigo-400 font-black text-2xl italic tracking-tighter">LVL {student.stats?.level ?? 1}</div>
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">{student.stats?.xp ?? 0} XP</div>
                  <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden border border-slate-700/50">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-600 via-indigo-400 to-cyan-400" 
                      style={{ width: `${Math.min(((student.stats?.xp ?? 0) / 1000) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all">
                    <MoreVertical size={22} />
                  </button>
                  <button 
                    onClick={() => handleDelete(student.uid)}
                    className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
