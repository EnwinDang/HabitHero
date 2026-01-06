import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { BookOpen, Users, User, X, GraduationCap, CheckCircle } from 'lucide-react';

const CourseManagement = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'courses'), (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const fetchEnrolledStudents = async (course: any) => {
    setSelectedCourse(course);
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const snap = await getDocs(q);
    
    const list = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((student: any) => student.enrolledCourses?.includes(course.id));
    
    setEnrolledStudents(list);
    setIsModalOpen(true);
  };

  return (
    <div className="p-8 bg-violet-50/40 min-h-screen font-sans">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Course Management</h1>
        <p className="text-slate-500 font-medium">Beheer cursussen</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-[2.5rem] p-8 border border-violet-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className={`absolute top-6 left-6 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${course.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
              {course.status || 'ACTIVE'}
            </div>

            <div className="flex flex-col items-center mt-8 mb-6 text-center">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 font-black text-2xl mb-4">
                {course.name?.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-black text-slate-900">{course.name}</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                <BookOpen size={12} /> {course.code || 'ID-TBA'}
              </p>
            </div>

            <div className="space-y-4 border-t border-slate-50 pt-6">
              {/* Leerkracht informatie */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                  <User size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Creator</p>
                  <p className="text-sm font-bold text-slate-700">{course.createdBy || 'Faculty Staff'}</p>
                </div>
              </div>

              {/* Studentenoverzicht knop */}
              <button 
                onClick={() => fetchEnrolledStudents(course)}
                className="w-full group flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-violet-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-violet-500" />
                  <span className="text-sm font-bold text-slate-600 group-hover:text-violet-700">Enrolled Students</span>
                </div>
                <span className="text-xs font-black text-violet-400">{course.studentCount || 0}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal voor Studentenlijst */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <GraduationCap className="text-violet-500" /> Students in {selectedCourse?.name}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {enrolledStudents.length > 0 ? enrolledStudents.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600 font-bold text-xs">
                      {s.displayName?.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{s.displayName}</p>
                      <p className="text-[10px] font-medium text-slate-400">{s.email}</p>
                    </div>
                  </div>
                  <CheckCircle size={16} className="text-emerald-500" />
                </div>
              )) : (
                <p className="text-center py-10 text-slate-400 font-medium">Nog geen studenten ingeschreven voor dit vak.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
