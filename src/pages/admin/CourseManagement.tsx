import React, { useState, useEffect } from 'react';
import { CoursesAPI } from '../../api/courses.api';
import { UsersAPI } from '../../api/users.api';
import { TasksAPI } from '../../api/tasks.api';
import { BookOpen, Users, User as UserIcon, X, GraduationCap, CheckCircle } from 'lucide-react';
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
  const [enrolledCounts, setEnrolledCounts] = useState<Record<string, number>>({});
  const [modulesCounts, setModulesCounts] = useState<Record<string, number>>({});
  const [tasksCounts, setTasksCounts] = useState<Record<string, number>>({});
  const [totalXp, setTotalXp] = useState<Record<string, number>>({});
  const [selectedCourseDetails, setSelectedCourseDetails] = useState<Course | null>(null);
  const [courseModules, setCourseModules] = useState<Module[]>([]);
  const [courseTasks, setCourseTasks] = useState<Task[]>([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [coursesRes, studentsRes] = await Promise.all([
          CoursesAPI.list(false), // Show all courses for admin
          UsersAPI.list({ role: 'student' })
        ]);
        setCourses(coursesRes);
        setAllStudents(studentsRes.data || []);

        // Fetch enrolled counts and modules counts
        const enrolledPromises = coursesRes.map(course => 
          CoursesAPI.listStudents(course.courseId).then(enrollments => ({ courseId: course.courseId, count: enrollments.length }))
        );
        const modulesPromises = coursesRes.map(course => 
          CoursesAPI.listModules(course.courseId).then(modules => ({ courseId: course.courseId, count: modules.length }))
        );
        const tasksPromises = coursesRes.map(course => 
          TasksAPI.list({ courseId: course.courseId }).then(tasks => {
            const count = tasks.length;
            const xp = tasks.reduce((sum, task) => sum + task.xp, 0);
            return { courseId: course.courseId, count, xp };
          })
        );

        const [enrolledResults, modulesResults, tasksResults] = await Promise.all([
          Promise.all(enrolledPromises),
          Promise.all(modulesPromises),
          Promise.all(tasksPromises)
        ]);

        const enrolledCountsObj = enrolledResults.reduce((acc, { courseId, count }) => ({ ...acc, [courseId]: count }), {});
        const modulesCountsObj = modulesResults.reduce((acc, { courseId, count }) => ({ ...acc, [courseId]: count }), {});
        const tasksCountsObj = tasksResults.reduce((acc, { courseId, count }) => ({ ...acc, [courseId]: count }), {});
        const totalXpObj = tasksResults.reduce((acc, { courseId, xp }) => ({ ...acc, [courseId]: xp }), {});

        setEnrolledCounts(enrolledCountsObj);
        setModulesCounts(modulesCountsObj);
        setTasksCounts(tasksCountsObj);
        setTotalXp(totalXpObj);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchEnrolledStudents = async (course: Course) => {
    setSelectedCourse(course);
    try {
      const enrollments = await CoursesAPI.listStudents(course.courseId);
      const enrolledUids = enrollments.map(e => e.uid);
      const enrolled = allStudents.filter(student => enrolledUids.includes(student.uid));
      setEnrolledStudents(enrolled);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch enrolled students:', error);
    }
  };

  const toggleActive = async (course: Course) => {
    try {
      await CoursesAPI.patch(course.courseId, { isActive: !course.isActive });
      setCourses(courses.map(c => c.courseId === course.courseId ? { ...c, isActive: !c.isActive } : c));
    } catch (error) {
      console.error('Failed to toggle active status:', error);
    }
  };

  const fetchCourseDetails = async (course: Course) => {
    setSelectedCourseDetails(course);
    try {
      const [modules, tasks] = await Promise.all([
        CoursesAPI.listModules(course.courseId),
        TasksAPI.list({ courseId: course.courseId })
      ]);
      setCourseModules(modules);
      setCourseTasks(tasks);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch course details:', error);
    }
  };

  return (
    <div className="p-8 bg-violet-50/40 min-h-screen font-sans">
      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-slate-600">Loading courses...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Course Management</h1>
            <p className="text-slate-500 font-medium">Beheer cursussen</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <div key={course.courseId} className="bg-white rounded-[2.5rem] p-8 border border-violet-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                <div 
                  className={`absolute top-6 left-6 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer ${course.isActive ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  onClick={() => toggleActive(course)}
                >
                  {course.isActive ? 'ACTIVE' : 'INACTIVE'}
                </div>

                <div className="flex flex-col items-center mt-8 mb-6 text-center">
                  <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 font-black text-2xl mb-4">
                    {course.name?.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-black text-slate-900">{course.name}</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                    <BookOpen size={12} /> {course.courseCode || 'ID-TBA'}
                  </p>
                </div>

                <div className="space-y-4 border-t border-slate-50 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                      <UserIcon size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Creator</p>
                      <p className="text-sm font-bold text-slate-700">{course.createdBy || 'Faculty Staff'}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => fetchEnrolledStudents(course)}
                    className="w-full group flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-violet-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Users size={18} className="text-violet-500" />
                      <span className="text-sm font-bold text-slate-600 group-hover:text-violet-700">Enrolled Students</span>
                    </div>
                    
                    <span className="text-xs font-black text-violet-400">
                      {enrolledCounts[course.courseId] || 0}
                    </span>

                  </button>

                  <button 
                    onClick={() => fetchCourseDetails(course)}
                    className="w-full group flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-violet-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen size={18} className="text-violet-500" />
                      <span className="text-sm font-bold text-slate-600 group-hover:text-violet-700">View Details</span>
                    </div>
                    
                    <span className="text-xs font-black text-violet-400">
                      Modules & Tasks
                    </span>

                  </button>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                      <BookOpen size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Modules</p>
                      <p className="text-sm font-bold text-slate-700">{modulesCounts[course.courseId] || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                      <CheckCircle size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Tasks / Total XP</p>
                      <p className="text-sm font-bold text-slate-700">{tasksCounts[course.courseId] || 0} / {totalXp[course.courseId] || 0} XP</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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
                <div key={s.uid} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
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

      {isDetailsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <BookOpen className="text-violet-500" /> Details for {selectedCourseDetails?.name}
              </h2>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Modules</h3>
                {courseModules.length > 0 ? courseModules.map((module) => {
                  const moduleTasks = courseTasks.filter(task => task.moduleId === module.moduleId);
                  return (
                    <div key={module.moduleId} className="p-4 bg-slate-50 rounded-2xl mb-3">
                      <p className="text-sm font-bold text-slate-900">{module.title}</p>
                      <p className="text-xs text-slate-500">{module.description}</p>
                      {moduleTasks.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-slate-700 mb-2">Tasks:</p>
                          {moduleTasks.map((task) => (
                            <div key={task.taskId} className="ml-4 p-2 bg-white rounded-lg mb-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{task.title}</p>
                                  <p className="text-xs text-slate-500">{task.description}</p>
                                  <p className="text-xs text-slate-400">Difficulty: {task.difficulty}</p>
                                </div>
                                <p className="text-xs font-bold text-emerald-600">{task.xp} XP</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <p className="text-center py-10 text-slate-400 font-medium">No modules available.</p>
                )}
              </div>

              {courseTasks.filter(task => !task.moduleId).length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Course Tasks</h3>
                  {courseTasks.filter(task => !task.moduleId).map((task) => (
                    <div key={task.taskId} className="p-4 bg-slate-50 rounded-2xl mb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{task.title}</p>
                          <p className="text-xs text-slate-500">{task.description}</p>
                          <p className="text-xs text-slate-400">Difficulty: {task.difficulty}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">{task.xp} XP</p>
                          <p className="text-xs text-slate-400">{task.gold} Gold</p>
                        </div>
                      </div>
                    </div>
                  ))}
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
