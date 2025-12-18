import React, { useEffect, useState } from 'react';
import { UsersAPI } from "../../api/users.api";
import { User } from "../../models/user.model";
import { Search, Trash2, X, ShieldCheck, Mail, UserPlus } from 'lucide-react';

const TeacherManagement: React.FC = () => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
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
    loadData();
  }, []);

  const handleDelete = async (uid: string) => {
    if (window.confirm("Delete teacher?")) {
      try {
        await UsersAPI.delete(uid);
        setTeachers(prev => prev.filter(t => t.uid !== uid));
      } catch (error) {
        console.error(error);
      }
    }
  };

  const filtered = teachers.filter(t => 
    t.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-violet-50 p-8 text-slate-900">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
          <ShieldCheck className="text-violet-500" size={32} />
          Teacher Management
        </h1>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl font-bold shadow-md shadow-violet-200 flex items-center gap-2"
        >
          <UserPlus size={22} /> New Teacher
        </button>
      </div>

      <div className="relative mb-10">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search teachers..." 
          className="w-full bg-white border border-violet-100 rounded-2xl py-4 pl-14 pr-6 text-slate-900 shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center p-20 text-violet-500 animate-pulse font-semibold italic">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((teacher) => (
            <div
              key={teacher.uid}
              className="bg-white border border-violet-100 p-6 rounded-3xl group transition-all hover:border-violet-300 hover:shadow-md"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-semibold text-emerald-600 uppercase bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                  {teacher.status || 'Active'}
                </span>
                <button
                  onClick={() => handleDelete(teacher.uid)}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mt-4">
                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center font-bold text-violet-600 border border-violet-200">
                  {teacher.displayName[0]}
                </div>
                <div>
                  <h3 className="text-slate-900 font-semibold text-xl group-hover:text-violet-600 transition-colors">
                    {teacher.displayName}
                  </h3>
                  <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                    <Mail size={12} className="text-slate-400" /> {teacher.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200">
                <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Faculty Staff</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-md">
          <div className="bg-white border border-violet-100 w-full max-w-md rounded-[2.5rem] p-8 text-center shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Add Teacher</h2>
            <p className="text-slate-500 mb-6 text-sm">Promote a student to teacher via the Student Management page.</p>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-2xl shadow-md"
            >
              Close
            </button>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-3 inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;
