import React from 'react';
import { Outlet, Navigate } from 'react-router-dom'; // Importeer de Outlet
import AdminSidebar from '../Components/admin/AdminSidebar';
import { useAuth } from '@/context/AuthContext';

const AdminLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/student" replace />;
  }

  return (
    <div className="flex h-screen bg-violet-50 overflow-hidden">
      <AdminSidebar /> 
      
      <main className="flex-1 overflow-y-auto">
        <Outlet /> 
      </main>
    </div>
  );
};

export default AdminLayout;
