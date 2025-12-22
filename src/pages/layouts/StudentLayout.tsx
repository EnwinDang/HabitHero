import React from 'react';
import { Outlet } from 'react-router-dom';
import StudentSidebar from '../Components/student/StudentSidebar';

const StudentLayout = () => {
    return (
        <div className="flex h-screen bg-violet-50 overflow-hidden">
            <StudentSidebar />

            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default StudentLayout;
