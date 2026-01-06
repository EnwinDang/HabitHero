import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Users, UserCheck, GraduationCap, LayoutGrid, Clock, Zap, Activity } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [counts, setCounts] = useState({
    users: 0,
    teachers: 0,
    students: 0,
    courses: 0
  });
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      setCounts(prev => ({ ...prev, courses: snap.size }));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const allUsers = snap.docs.map(doc => doc.data());
      setCounts(prev => ({ 
        ...prev, 
        users: snap.size,
        teachers: allUsers.filter(u => u.role === 'teacher').length,
        students: allUsers.filter(u => u.role === 'student').length
      }));
    });

    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(4));
    const unsubLogs = onSnapshot(q, (snap) => {
      const logsData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivities(logsData);
    });

    return () => {
      unsubCourses();
      unsubUsers();
      unsubLogs();
    };
  }, []);

  return (
    <div className="min-h-screen bg-violet-50/40 p-8 text-slate-900 font-sans">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-400 font-medium mt-1">Welcome back, Nolween Sine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-[2rem] border border-violet-100/50 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-violet-100/50 text-violet-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Users</p>
            <p className="text-2xl font-black text-slate-900">{counts.users}</p>
          </div>
        </div>

        <Link to="/admin/teachers" className="bg-white p-6 rounded-[2rem] border border-violet-100/50 shadow-sm flex items-center gap-5 transition-all hover:scale-105 hover:shadow-md active:scale-95">
          <div className="w-14 h-14 bg-violet-100/50 text-violet-600 rounded-2xl flex items-center justify-center">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teachers</p>
            <p className="text-2xl font-black text-slate-900">{counts.teachers}</p>
          </div>
        </Link>

        <Link to="/admin/students" className="bg-white p-6 rounded-[2rem] border border-violet-100/50 shadow-sm flex items-center gap-5 transition-all hover:scale-105 hover:shadow-md active:scale-95">
          <div className="w-14 h-14 bg-violet-100/50 text-violet-600 rounded-2xl flex items-center justify-center">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Students</p>
            <p className="text-2xl font-black text-slate-900">{counts.students}</p>
          </div>
        </Link>

        <Link to="/admin/courses" className="bg-white p-6 rounded-[2rem] border border-violet-100/50 shadow-sm flex items-center gap-5 transition-all hover:scale-105 hover:shadow-md active:scale-95">
          <div className="w-14 h-14 bg-violet-100/50 text-violet-600 rounded-2xl flex items-center justify-center">
            <LayoutGrid size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Courses</p>
            <p className="text-2xl font-black text-slate-900">{counts.courses}</p>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 border border-violet-100/50 shadow-sm w-full">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
            <Activity className="text-violet-500" size={20} /> Recent Activity
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activities.length > 0 ? (
            activities.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-violet-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-violet-100 shadow-sm text-violet-500">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">By {log.user || 'Admin'}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-300 uppercase shrink-0 ml-4">
                  {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                </span>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-10 text-slate-400 text-sm italic">
              Geen recente activiteiten gevonden in de database.
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center py-10 opacity-30">
          <Clock size={24} className="text-violet-300 mb-2" />
          <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest text-center">
            Live Monitoring Active
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
