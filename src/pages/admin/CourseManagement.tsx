import React, { useState, useEffect } from 'react';
import { CoursesAPI } from '../../api/courses.api';
import { UsersAPI } from '../../api/users.api';
import { TasksAPI } from '../../api/tasks.api';
import { BookOpen, Users, User as UserIcon, X, GraduationCap, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import type { Course } from '../../models/course.model';
import type { User } from '../../models/user.model';
import type { Module } from '../../models/module.model';
import type { Task } from '../../models/task.model';

const CourseManagement = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Stats state: we berekenen nu dieper in de sub-collecties
  const [stats, setStats] = useState<Record<string, { enrolled: number; modules: number; tasks: number; xp: number }>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Haal alle cursussen en student-profielen op
      const [coursesRes, studentsRes] = await Promise.all([
        CoursesAPI.list(false),
        UsersAPI.list({ role: 'student' })
      ]);
      
      setCourses(coursesRes);
      setAllStudents(studentsRes.data || []);

      const statsObj: Record<string, any> = {};
      
      // 2. Loop door cursussen om sub-collecties (modules -> tasks) te doorzoeken
      await Promise.all(coursesRes.map(async (course) => {
        try {
          const enrollments = await CoursesAPI.listStudents(course.courseId);
          const modules = await CoursesAPI.listModules(course.courseId);
          
          let totalTasks = 0;
          let totalXp = 0;

          // Haal taken op PER module (conform jouw index.ts GET /tasks route)
          await Promise.all(modules.map(async (mod) => {
            const tasks = await TasksAPI.list({ 
              courseId: course.courseId, 
              moduleId: mod.moduleId 
            });
            totalTasks += tasks.length;
            totalXp += tasks.reduce((sum, t) => sum + (Number(t.xp) || 0), 0);
          }));

          statsObj[course.courseId] = {
            enrolled: enrollments.length,
            modules: modules.length,
            tasks: totalTasks,
            xp: totalXp
          };
        } catch (e) {
          console.error(`Stats sync failed for ${course.courseId}`, e);
          statsObj[course.courseId] = { enrolled: 0, modules: 0, tasks: 0, xp: 0 };
        }
      }));

      setStats(statsObj);
    } catch (error) {
      console.error('Data load failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenEnrollment = async (course: Course) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
    setEnrolledStudents([]); 
    
    try {
      const enrollments = await CoursesAPI.listStudents(course.courseId);
      
      // Match de UID's uit de enrollment met de volledige user profiles
      const enrolled = enrollments.map(enrollment => {
        const profile = allStudents.find(s => s.uid === enrollment.uid);
        return profile || { 
          uid: enrollment.uid, 
          displayName: 'Onbekende Student', 
          email: 'Geen e-mail' 
        } as User;
      });
      
      setEnrolledStudents(enrolled);
    } catch (error) {
      console.error('Enrollment fetch error:', error);
    }
  };

  return (
    <div className="p-8 bg-violet-50/40 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Course Management</h1>
          <p className="text-slate-500 font-medium">Beheer alle cursussen en hun sub-collecties</p>
        </div>
        <button onClick={loadData} className="p-3 bg-white rounded-2xl shadow-sm border border-violet-100 transition-all">
          <Loader2 size={20} className={loading ? 'animate-spin text-violet-600' : 'text-slate-400'} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-violet-600" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => {
            const courseStats = stats[course.courseId] || { enrolled: 0, modules: 0, tasks: 0, xp: 0 };
            return (
              <div key={course.courseId} className="bg-white rounded-[2.5rem] p-8 border border-violet-100 shadow-sm relative flex flex-col h-full transition-all group hover:border-violet-300">
                
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${course.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                    {course.isActive ? 'ACTIVE' : 'DRAFT'}
                  </span>
                  <span className="text-[9px] font-bold text-slate-300 uppercase leading-none">{course.courseId}</span>
                </div>

                <div className="flex flex-col items-center mb-8 text-center">
                  <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 mb-4 shadow-sm border border-violet-100">
                    <GraduationCap size={32} />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 uppercase italic leading-tight">{course.name}</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                    <BookOpen size={12} /> {course.courseCode}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 border-t border-slate-50 pt-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modules</p>
                    <p className="text-sm font-black text-slate-700">{courseStats.modules}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasks / XP</p>
                    <p className="text-sm font-black text-emerald-600">{courseStats.tasks} / {courseStats.xp} XP</p>
                  </div>
                </div>

                <button 
                  onClick={() => handleOpenEnrollment(course)}
                  className="mt-auto w-full group flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-violet-600 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-violet-500 group-hover:text-white" />
                    <span className="text-sm font-bold text-slate-600 group-hover:text-white">Students Enrolled</span>
                  </div>
                  <span className="bg-white text-violet-600 px-2 py-0.5 rounded-lg text-xs font-black">
                    {courseStats.enrolled}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Enrollment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border border-violet-100">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 italic uppercase">
                <Users className="text-violet-600" /> Course Enrollment
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-all"><X size={24} /></button>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {enrolledStudents.length > 0 ? enrolledStudents.map((s) => (
                <div key={s.uid} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600 font-black text-xs">
                      {s.displayName?.substring(0,2).toUpperCase() || '??'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{s.displayName}</p>
                      <p className="text-[10px] font-medium text-slate-400">{s.email}</p>
                    </div>
                  </div>
                  <CheckCircle size={16} className="text-emerald-500" />
                </div>
              )) : (
                <div className="text-center py-10">
                  <AlertCircle size={40} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No students enrolled yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
