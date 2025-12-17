import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, MoreVertical, UserCheck, BookOpen } from 'lucide-react';
import { UsersAPI } from '../../api/users.api';
import type { User } from '../../models/user.model';

const TeacherManagement: React.FC = () => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadTeachers = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await UsersAPI.list({ role: 'teacher' });
      setTeachers(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleDelete = async (uid: string): Promise<void> => {
    if (window.confirm("Weet je zeker dat je deze docent wilt verwijderen?")) {
      try {
        await UsersAPI.delete(uid);
        setTeachers(prev => prev.filter(t => t.uid !== uid));
      } catch (error) {
        console.error(error);
      }
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <UserCheck className="text-indigo-500" size={32} />
            Teacher Management
          </h1>
          <p className="text-slate-500 mt-1 text-lg">Overzicht en beheer van alle docenten</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-indigo-500/20 active:scale-95">
          <Plus size={22} /> Add Teacher
        </button>
      </div>

      <div className="relative mb-10 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={22} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search teachers by name or email..." 
          className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none transition-all backdrop-blur-sm placeholder:text-slate-600"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-indigo-500 gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium animate-pulse">Laden van docenten...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTeachers.map((teacher: User) => (
            <div key={teacher.uid} className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl flex items-center justify-between hover:border-indigo-500/40 hover:bg-slate-900/60 transition-all group">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl blur opacity-10 group-hover:opacity-30 transition-opacity"></div>
                  <img 
                    src={teacher.photoURL || `https://ui-avatars.com/api/?name=${teacher.displayName}&background=6366f1&color=fff`} 
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-700 relative z-10"
                    alt=""
                  />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl group-hover:text-indigo-300 transition-colors">{teacher.displayName}</h3>
                  <p className="text-slate-500 font-medium">{teacher.email}</p>
                  
                  <div className="flex gap-2 mt-2">
                    <span className="flex items-center gap-1 text-[11px] font-black text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                      <BookOpen size={12} />
                      {(teacher as any).subject || "Geen vak toegewezen"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right mr-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${teacher.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {teacher.status?.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all">
                    <MoreVertical size={22} />
                  </button>
                  <button 
                    onClick={() => handleDelete(teacher.uid)}
                    className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredTeachers.length === 0 && !loading && (
            <div className="text-center py-20 text-slate-600 border border-dashed border-slate-800 rounded-3xl">
              Geen docenten gevonden.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;