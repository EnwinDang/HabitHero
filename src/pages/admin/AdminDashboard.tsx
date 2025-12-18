import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Users, GraduationCap, BookOpen, TrendingUp } from 'lucide-react';
import { UsersAPI, CoursesAPI } from '../../api';
import { NavLink } from 'react-router-dom';

interface DashboardStats {
  totalUsers?: number;
  totalTeachers?: number;
  totalStudents?: number;
  totalCourses?: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const newStats: DashboardStats = {};

      try {
        const usersRes = await UsersAPI.list();
        newStats.totalUsers = usersRes.pagination.total;
      } catch (err) {
        console.error("Failed to load users:", err);
      }

      try {
        const teachersRes = await UsersAPI.list({ role: 'teacher' });
        newStats.totalTeachers = teachersRes.pagination.total;
      } catch (err) {
        console.error("Failed to load teachers:", err);
      }

      try {
        const studentsRes = await UsersAPI.list({ role: 'student' });
        newStats.totalStudents = studentsRes.pagination.total;
      } catch (err) {
        console.error("Failed to load students:", err);
      }

      try {
        const courses = await CoursesAPI.list();
        newStats.totalCourses = courses.filter(c => c.isActive).length;
        console.log('Courses loaded:', courses);
      } catch (err) {
        console.error("Failed to load courses:", err);
      }

      setStats(newStats);
      setLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers || 0,
      icon: Users,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Teachers',
      value: stats.totalTeachers || 0,
      icon: GraduationCap,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      path: '/admin/teachers',
    },
    {
      title: 'Students',
      value: stats.totalStudents || 0,
      icon: Users,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      path: '/admin/students',
    },
    {
      title: 'Courses',
      value: stats.totalCourses || 0,
      icon: BookOpen,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      path: '/admin/courses',
    },
  ];

  return (
    <div className="p-8 bg-violet-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Admin Dashboard</h1>
          <p className="text-gray-600 text-xl">
            Welcome back, <span className="font-semibold text-indigo-600">{user?.displayName || 'Administrator'}</span>
          </p>
        </div>
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
          {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'A'}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const CardContent = (
            <div
              className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl hover:border-indigo-300 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">{card.title}</p>
                  {loading ? (
                    <div className="h-10 w-20 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    <p className="text-4xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
                  )}
                </div>
                <div className={`${card.bgColor} p-4 rounded-xl border-2 ${card.borderColor}`}>
                  <Icon className={`w-8 h-8 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
          return card.path ? (
            <NavLink key={index} to={card.path}>
              {CardContent}
            </NavLink>
          ) : (
            <div key={index}>
              {CardContent}
            </div>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
          <div className="p-2 bg-indigo-50 rounded-lg">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Recent activity will be displayed here</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
