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
      console.error("Fout bij het laden van studenten:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleDelete = async (uid: string): Promise<void> => {
    if (window.confirm("Delete student?")) {
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
    <div className="min-h-screen bg-violet-50 p-8 text-slate-900">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
            <GraduationCap className="text-violet-500" size={32} />
            Student Academy
          </h1>
          <p className="text-slate-600 mt-1 font-medium">Manage heroes-in-training and their progress</p>
        </div>
        <button className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-md shadow-violet-200 active:scale-95">
          <Plus size={22} /> Add Student
        </button>
      </div>

      <div className="relative mb-10 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={22} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search students..." 
          className="w-full bg-white border border-violet-100 rounded-2xl py-4 pl-14 pr-6 text-slate-900 shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="text-center p-20 text-violet-500 animate-pulse font-semibold italic">Loading academy data...</div>
      ) : (
        <div className="grid gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student.uid}
              className="bg-white border border-violet-100 p-5 rounded-3xl flex items-center justify-between hover:border-violet-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img 
                    src={student.photoURL || `https://ui-avatars.com/api/?name=${student.displayName}&background=ede9fe&color=4c1d95`} 
                    className="w-16 h-16 rounded-2xl object-cover border border-violet-200 bg-violet-50 relative z-10"
                    alt=""
                  />
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 border-4 border-white rounded-full z-20 ${
                      student.status === 'active' ? 'bg-emerald-400' : 'bg-rose-300'
                    }`}
                  ></div>
                </div>
                <div>
                  <h3 className="text-slate-900 font-semibold text-xl group-hover:text-violet-600 transition-colors">
                    {student.displayName}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium">{student.email}</p>
                  <div className="flex gap-3 mt-2">
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {(student.stats as any)?.hp ?? 100} HP
                    </span>
                    <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                      {(student.stats as any)?.gold ?? 0} GOLD
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                  <MoreVertical size={20} />
                </button>
                <button 
                  onClick={() => handleDelete(student.uid)}
                  className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
          {filteredStudents.length === 0 && (
            <div className="text-center p-10 text-slate-400 bg-white border border-dashed border-slate-200 rounded-3xl">
              No students found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
