import React, { useEffect, useState } from 'react';
import { UsersAPI } from "../../api/users.api";
import { User } from "../../models/user.model";
import { Search, ShieldCheck, Mail, Loader2 } from 'lucide-react';

const TeacherManagement: React.FC = () => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await UsersAPI.list({ role: 'teacher' });
      setTeachers(response.data || []);
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to load teachers";
      console.error(error);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = teachers.filter(t => 
    t.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-violet-50 p-8 text-slate-900">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
          <ShieldCheck className="text-violet-500" size={32} />
          Teacher Management
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Manage and monitor faculty accounts
        </p>
      </div>

      <div className="relative mb-10">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search teachers..." 
          className="w-full bg-white border border-violet-100 rounded-2xl py-4 pl-14 pr-6 text-slate-900 shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-violet-500 font-semibold animate-pulse">
          <Loader2 className="animate-spin inline-block mr-2" /> Loading Faculty...
        </div>
      ) : error ? (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-8 text-center">
          <p className="text-rose-700 font-semibold mb-4">⚠️ {error}</p>
          <p className="text-rose-600 text-sm mb-6">Make sure you're logged in as an admin</p>
          <button 
            onClick={loadData}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all font-semibold"
          >
            🔄 Retry Loading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((teacher) => (
            <div
              key={teacher.uid}
              className="bg-white border border-violet-100 p-6 rounded-3xl group transition-all hover:border-violet-300 hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-semibold text-emerald-600 uppercase bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                  {teacher.status || 'Active'}
                </span>
              </div>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center font-bold text-violet-600 border border-violet-200 text-lg">
                  {teacher.displayName[0]}
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-slate-900 font-semibold text-xl group-hover:text-violet-600 transition-colors truncate">
                    {teacher.displayName}
                  </h3>
                  <p className="text-slate-500 text-xs flex items-center gap-1 mt-1 truncate">
                    <Mail size={12} className="text-slate-400 shrink-0" /> {teacher.email}
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

      {filtered.length === 0 && !loading && (
        <div className="text-center py-20 text-slate-400 italic">
          No teachers found matching your search.
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;
