import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Users, GraduationCap, BookOpen, TrendingUp } from 'lucide-react';
import { api } from '../../api/axios-instance';

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
      try {
        setLoading(true);
        // Fetch dashboard statistics from API
        // For now, we'll use placeholder data
        // Replace with actual API calls when endpoints are available
        setStats({
          totalUsers: 156,
          totalTeachers: 24,
          totalStudents: 132,
          totalCourses: 8,
        });
      } catch (err) {
        console.error("Kon statistieken niet laden", err);
      } finally {
        setLoading(false);
      }
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
    },
    {
      title: 'Students',
      value: stats.totalStudents || 0,
      icon: Users,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      title: 'Courses',
      value: stats.totalCourses || 0,
      icon: BookOpen,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
  ];

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
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
          return (
            <div
              key={index}
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
