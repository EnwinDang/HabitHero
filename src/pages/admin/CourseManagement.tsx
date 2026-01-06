import React, { useEffect, useState } from 'react';
import { Search, LayoutGrid, BookOpen, Users, Calendar, Loader2 } from 'lucide-react';
import { CoursesAPI } from "../../api/courses.api";
import { Course } from "../../models/course.model";

const CourseManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadCourses = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await CoursesAPI.list(false);
      setCourses(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filteredCourses = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-violet-50 p-8 text-slate-900 font-sans">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
          <LayoutGrid className="text-violet-500" size={32} />
          Course Directory
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Monitor all active EhB courses and student enrollments
        </p>
      </div>

      <div className="relative mb-10 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={22} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by course name or code..."
          className="w-full bg-white border border-violet-100 rounded-2xl py-4 pl-14 pr-6 text-slate-900 shadow-sm focus:ring-2 focus:ring-violet-400 outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-violet-500 font-semibold italic">
           <Loader2 className="animate-spin inline-block mr-2" size={20} /> Synchronizing Courses...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.courseId}
              className="bg-white border border-violet-100 p-6 rounded-3xl group transition-all hover:border-violet-300 hover:shadow-md relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-semibold uppercase px-2.5 py-1 rounded-lg border ${
                  course.isActive 
                    ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
                    : 'text-slate-400 bg-slate-50 border-slate-100'
                }`}>
                  {course.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="flex items-center gap-4 mt-2 mb-6">
                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center font-bold text-violet-600 border border-violet-200 text-lg">
                  {course.name[0]}
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-slate-900 font-semibold text-xl group-hover:text-violet-600 transition-colors truncate tracking-tight">
                    {course.name}
                  </h3>
                  <p className="text-slate-500 text-xs flex items-center gap-1 mt-1 truncate font-medium">
                    <BookOpen size={12} className="text-slate-400 shrink-0" /> {course.courseCode}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-4">
                 <p className="text-slate-400 text-[10px] flex items-center gap-1 font-semibold uppercase">
                    <Users size={12} /> 
                    {Object.keys((course as any).students || {}).length} Students
                 </p>
                 <p className="text-slate-400 text-[10px] flex items-center gap-1 font-semibold uppercase">
                    <Calendar size={12} /> {course.startDate || 'No date'}
                 </p>
              </div>

              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200">
                <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  Managed by {(course as any).createdBy || 'Faculty Staff'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
