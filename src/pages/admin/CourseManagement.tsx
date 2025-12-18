import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, LayoutGrid, X, Calendar } from 'lucide-react';
import { CoursesAPI } from "../../api/courses.api";
import { Course } from "../../models/course.model";

const CourseManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newCourse, setNewCourse] = useState({
    name: '',
    courseCode: '',
    description: '',
    isActive: true,
    startDate: new Date().toISOString().split('T')[0],
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await CoursesAPI.create(newCourse as any);
      setIsModalOpen(false);
      setNewCourse({
        name: '',
        courseCode: '',
        description: '',
        isActive: true,
        startDate: new Date().toISOString().split('T')[0],
      });
      loadCourses();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (courseId: string) => {
    if (window.confirm("Verwijderen?")) {
      try {
        await CoursesAPI.delete(courseId);
        setCourses((prev) => prev.filter((c) => c.courseId !== courseId));
      } catch (error) {
        console.error(error);
      }
    }
  };

  const filteredCourses = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-violet-50 p-8 text-slate-900">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <LayoutGrid className="text-violet-500" size={32} />
            Course Management
          </h1>
          <p className="text-slate-600 mt-1 text-xs tracking-widest font-semibold uppercase">
            Admin Portal
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-md shadow-violet-200 active:scale-95"
        >
          <Plus size={22} /> New Course
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-10 group">
        <Search
          className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors"
          size={22}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search courses..."
          className="w-full bg-white border border-violet-100 rounded-2xl py-4 pl-14 pr-6 text-slate-900 shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Courses grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-violet-500 gap-4">
          <div className="w-12 h-12 border-4 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.courseId}
              className="bg-white border border-violet-100 p-6 rounded-3xl hover:border-violet-300 hover:shadow-md transition-all group relative"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100">
                  {course.courseCode}
                </span>
                <button
                  onClick={() => handleDelete(course.courseId)}
                  className="text-slate-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <h3 className="text-slate-900 font-semibold text-xl line-clamp-2 group-hover:text-violet-600 transition-colors">
                {course.name}
              </h3>

              <p className="text-slate-600 text-sm mt-2 line-clamp-2 italic min-h-[2.5rem]">
                {course.description}
              </p>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-violet-100">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-violet-500" />
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">
                    {course.startDate
                      ? new Date(course.startDate).toLocaleDateString()
                      : 'TBD'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      course.isActive ? 'bg-emerald-400' : 'bg-rose-300'
                    }`}
                  ></div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tighter">
                    {course.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-md">
          <div className="bg-white border border-violet-100 w-full max-w-md rounded-[2.5rem] shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">New Course</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1 tracking-widest">
                  Name
                </label>
                <input
                  required
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase ml-1 tracking-widest">
                    Code
                  </label>
                  <input
                    required
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none uppercase"
                    value={newCourse.courseCode}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, courseCode: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase ml-1 tracking-widest">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none"
                    value={newCourse.startDate}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, startDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1 tracking-widest">
                  Description
                </label>
                <textarea
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none h-24 resize-none"
                  value={newCourse.description}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, description: e.target.value })
                  }
                />
              </div>

              <button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-2xl transition-all shadow-md shadow-violet-200 uppercase tracking-widest active:scale-95"
              >
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
