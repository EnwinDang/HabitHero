import React, { useEffect, useState } from 'react';
import { Search, Trash2, GraduationCap, Loader2, Mail, Shield, Coins, UserPlus, X, Trophy, Flame, Diamond } from 'lucide-react';
import { UsersAPI } from '../../api/users.api';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from '../../models/user.model';

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ displayName: '', email: '' });
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  const loadStudents = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // UsersAPI.list geeft { pagination: ..., data: User[] }
      const response = await UsersAPI.list({ role: 'student' });
      setStudents(response.data || []);
    } catch (error: any) {
      setError(error?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleStudentClick = async (student: User) => {
    setSelectedStudent(student);
    setLoadingDetails(true);

    try {
      if (student.uid) {
        // UsersAPI.get geeft direct User terug
        const freshStudentData = await UsersAPI.get(student.uid);
        setSelectedStudent(freshStudentData);
      }
    } catch (err) {
      console.error("Error fetching fresh student data:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // We bouwen een object dat voldoet aan de User interface
      // Let op: uid wordt vaak door de backend/firebase gegenereerd, 
      // dus we casten hier even naar 'any' voor de create payload als de API dat toestaat.
      const newUserPayload = {
        displayName: newStudent.displayName,
        email: newStudent.email,
        role: 'student',
        status: 'active',
        stats: {
          level: 1,
          xp: 0,
          gold: 0,
          hp: 100,
          streak: 0,
          gems: 0,
          focusSessionsCompleted: 0
        }
      };

      await UsersAPI.create(newUserPayload as any);

      await addDoc(collection(db, 'logs'), {
        action: `New Student Created: ${newStudent.displayName}`,
        user: 'Admin',
        timestamp: serverTimestamp(),
        type: 'user_management'
      });

      setIsModalOpen(false);
      setNewStudent({ displayName: '', email: '' });
      loadStudents();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDelete = async (uid: string, displayName: string): Promise<void> => {
    if (window.confirm(`Remove ${displayName}?`)) {
      try {
        await UsersAPI.delete(uid);
        setStudents(prev => prev.filter(s => s.uid !== uid));
        if (selectedStudent?.uid === uid) {
          setSelectedStudent(null);
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper om max XP te berekenen (voorbeeld logica, pas aan naar jouw game regels)
  const calculateMaxXP = (level: number) => level * 500;

  return (
    <div className="min-h-screen bg-violet-50 p-8 text-slate-900 font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
            <GraduationCap className="text-violet-500" size={32} />
            Student Academy
          </h1>
          <p className="text-slate-500 font-medium mt-1">Monitor heroes-in-training</p>
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
          placeholder="Search students..." 
          className="w-full bg-white border border-violet-100 rounded-2xl py-4 pl-14 pr-6 text-slate-900 shadow-sm focus:ring-2 focus:ring-violet-400 outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="text-center p-20 text-violet-500 animate-pulse font-semibold">
          <Loader2 className="animate-spin inline-block mr-2" size={20} /> Loading...
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student.uid}
              onClick={() => handleStudentClick(student)}
              className="bg-white border border-violet-100 p-5 rounded-[2rem] flex items-center justify-between hover:border-violet-300 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 font-black text-xl">
                  {student.displayName?.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-slate-900 font-bold text-xl group-hover:text-violet-600 transition-colors tracking-tight">
                    {student.displayName}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium flex items-center gap-1.5 mt-0.5">
                    <Mail size={14} className="text-slate-400 shrink-0" /> {student.email}
                  </p>
                  <div className="flex gap-3 mt-3">
                    <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                      <Shield size={12} className="text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        {/* AANGEPAST: stats.hp ipv stats.health */}
                        {student.stats?.hp ?? 100} HP
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">
                      <Coins size={12} className="text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                        {/* AANGEPAST: stats.gold */}
                        {student.stats?.gold ?? 0} GOLD
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(student.uid, student.displayName); }}
                className="p-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
              >
                <Trash2 size={22} />
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in duration-200 relative">
            
            {loadingDetails && (
              <div className="absolute top-4 right-14 text-violet-500 animate-pulse flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <Loader2 className="animate-spin" size={16} /> Updating...
              </div>
            )}

            <div className="flex justify-between items-start mb-8">
              <div className="w-20 h-20 bg-violet-100 rounded-3xl flex items-center justify-center text-violet-600 font-black text-2xl">
                {selectedStudent.displayName?.substring(0,2).toUpperCase()}
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">{selectedStudent.displayName}</h2>
            
            {/* AANGEPAST: stats.level */}
            <div className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-8">
              <Trophy size={14} /> Level {selectedStudent.stats?.level ?? 1} Hero
            </div>

            <div className="mb-8">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                <span>Experience</span>
                {/* AANGEPAST: stats.xp en berekening maxXP */}
                <span>{selectedStudent.stats?.xp || 0} / {calculateMaxXP(selectedStudent.stats?.level || 1)} XP</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-violet-500 rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(((selectedStudent.stats?.xp || 0) / calculateMaxXP(selectedStudent.stats?.level || 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-5 rounded-[2rem] border border-emerald-100">
                <Shield className="text-emerald-500 mb-2" size={20} />
                <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest leading-tight">Health</p>
                {/* AANGEPAST: stats.hp */}
                <p className="text-xl font-black text-emerald-700">{selectedStudent.stats?.hp || 100}</p>
              </div>
              <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-100">
                <Coins className="text-amber-500 mb-2" size={20} />
                <p className="text-[10px] font-bold text-amber-600/60 uppercase tracking-widest leading-tight">Gold</p>
                {/* AANGEPAST: stats.gold */}
                <p className="text-xl font-black text-amber-700">{selectedStudent.stats?.gold || 0}</p>
              </div>
              <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100">
                {/* AANGEPAST: Defense bestond niet in model, vervangen door Gems */}
                <Diamond className="text-blue-500 mb-2" size={20} />
                <p className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest leading-tight">Gems</p>
                <p className="text-xl font-black text-blue-700">{selectedStudent.stats?.gems || 0}</p>
              </div>
              <div className="bg-orange-50 p-5 rounded-[2rem] border border-orange-100">
                <Flame className="text-orange-500 mb-2" size={20} />
                <p className="text-[10px] font-bold text-orange-600/60 uppercase tracking-widest leading-tight">Streak</p>
                {/* AANGEPAST: stats.streak */}
                <p className="text-xl font-black text-orange-700">{selectedStudent.stats?.streak || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-black text-slate-900 mb-6">New Student</h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <input required value={newStudent.displayName} onChange={(e) => setNewStudent({...newStudent, displayName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/20" placeholder="Full Name" />
              <input required type="email" value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/20" placeholder="Email" />
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold uppercase text-xs tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;

