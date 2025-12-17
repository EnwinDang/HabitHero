import React from 'react';
import { Outlet } from 'react-router-dom'; // Importeer de Outlet
import AdminSidebar from '../Components/admin/AdminSidebar';

const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <AdminSidebar /> 
      
      <main className="flex-1 overflow-y-auto">
        <Outlet /> 
      </main>
    </div>
  );
};

export default AdminLayout;
