import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, MoreVertical, BookOpen, Users, Clock } from 'lucide-react';
// Let op: Je moet mogelijk een CoursesAPI aanmaken vergelijkbaar met je UsersAPI
import { apiFetch } from "../../api/client"; 

interface Course {
  id: string;
  name: string;
  code: string;
  teacherName: string;
  studentCount: number;
  status: 'active' | 'archived';
}

const CourseManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadCourses = async (): Promise<void> => {
    setLoading(true);
    try {
      // Tijdelijke aanroep tot je een specifieke CoursesAPI hebt
      const response = await apiFetch<{data: Course[]}>('/courses');
      setCourses(response.data || []);
    } catch (error) {
      console.error("Error loading courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <BookOpen className="text-indigo-500" size={32} />
            Course Management
          </h1>
          <p className="text-slate-500 mt-1 text-lg">Beheer het curriculum en de actieve vakken</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-indigo-500/20 active:scale-95">
          <Plus size={22} /> Add Course
        </button>
      </div>

      <div className="relative mb-10 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={22} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search courses by name or code..." 
          className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none transition-all backdrop-blur-sm placeholder:text-slate-600"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-20 text-indigo-500 font-medium animate-pulse">Laden van cursussen...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl hover:border-indigo-500/40 hover:bg-slate-900/60 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <button className="text-slate-500 hover:text-white transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
              
              <div className="mb-4">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] bg-indigo-500/10 px-2 py-1 rounded">
                  {course.code}
                </span>
                <h3 className="text-white font-bold text-xl mt-2 group-hover:text-indigo-300 transition-colors">{course.name}</h3>
                <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
                  Docent: <span className="text-slate-300">{course.teacherName}</span>
                </p>
              </div>

              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800/50">
                <div className="flex items-center gap-2 text-slate-400">
                  <Users size={18} />
                  <span className="text-sm font-semibold">{course.studentCount} Students</span>
                </div>
                <button className="text-slate-600 hover:text-rose-500 transition-colors p-2">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseManagement;