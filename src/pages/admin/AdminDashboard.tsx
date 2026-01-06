import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Users, UserCheck, GraduationCap, LayoutGrid, Clock, Zap, Activity, Shield } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [counts, setCounts] = useState({
    users: 0,
    teachers: 0,
    students: 0,
    courses: 0
  });

  useEffect(() => {
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      setCounts(prev => ({ ...prev, courses: snap.size }));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const allUsers = snap.docs.map(doc => doc.data());
      const teachers = allUsers.filter(u => u.role === 'teacher').length;
      const students = allUsers.filter(u => u.role === 'student').length;
      
      setCounts(prev => ({ 
        ...prev, 
        users: snap.size,
        teachers: teachers,
        students: students
      }));
    });

    return () => {
      unsubCourses();
      unsubUsers();
    };
  }, []);

  const stats = [
    { label: 'Total Users', value: counts.users.toString(), icon: <Users size={24} />, color: 'text-violet-600', bg: 'bg-violet-100/50' },
    { label: 'Teachers', value: counts.teachers.toString(), icon: <UserCheck size={24} />, color: 'text-violet-600', bg: 'bg-violet-100/50' },
    { label: 'Students', value: counts.students.toString(), icon: <GraduationCap size={24} />, color: 'text-violet-600', bg: 'bg-violet-100/50' },
    { label: 'Courses', value: counts.courses.toString(), icon: <LayoutGrid size={24} />, color: 'text-violet-600', bg: 'bg-violet-100/50' },
  ];

  return (
    <div className="min-h-screen bg-violet-50/40 p-8 text-slate-900 font-sans">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-400 font-medium mt-1">Welcome back, Nolween Sine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-[2rem] border border-violet-100/50 shadow-sm flex items-center gap-5">
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-violet-100/50 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <Activity className="text-violet-500" size={20} /> Recent Activity
            </h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-violet-50/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center border border-violet-100">
                  <Zap size={18} className="text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">New Course Created: "skibidi"</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">By teacher_001</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-300 uppercase">Just now</span>
            </div>
            <div className="flex flex-col items-center justify-center py-16 opacity-30">
              <Clock size={32} className="text-violet-300 mb-2" />
              <p className="text-xs font-bold text-violet-300 uppercase tracking-widest">Live Syncing Database</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-violet-100/50 shadow-sm">
          <h2 className="text-xl font-bold mb-8 flex items-center gap-2 text-slate-900">
            <Shield className="text-violet-500" size={20} /> System Config
          </h2>
          <div className="space-y-5">
            {[
              { label: 'Stamina System', val: '10 Regen / Hr', sub: 'Max: 100', color: 'text-violet-600', bg: 'bg-violet-50/50' },
              { label: 'Combat Rewards', val: '1.5x Multiplier', sub: 'Medium', color: 'text-emerald-600', bg: 'bg-emerald-50/30' },
              { label: 'Difficulty Scale', val: '2.2x Enemy HP', sub: 'Extreme', color: 'text-orange-600', bg: 'bg-orange-50/30' }
            ].map((item, i) => (
              <div key={i} className={`p-5 rounded-2xl border border-violet-100/30 ${item.bg}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${item.color}`}>{item.label}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-slate-700">{item.val}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
