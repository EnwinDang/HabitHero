import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import App from '../App.jsx';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/teacher/Dashboard';
import Courses from '../pages/teacher/Courses';
import Modules from '../pages/teacher/Modules';
import Students from '../pages/teacher/Students';
import Profile from '../pages/teacher/Profile';
import ModuleDetail from '../pages/teacher/ModuleDetail';
import StudentDetail from '../pages/teacher/StudentDetail';
import NotFound from '../pages/NotFound';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'courses',
        element: <Courses />,
      },
      {
        path: 'modules',
        element: <Modules />,
      },
      {
        path: 'courses/:courseId/modules',
        element: <Modules />,
      },
      {
        path: 'modules/:moduleId',
        element: <ModuleDetail />,
      },
      {
        path: 'students',
        element: <Students />,
      },
      {
        path: 'students/:studentId',
        element: <StudentDetail />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
