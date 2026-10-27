import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const Navbar = () => {
  const { student, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!student) return null;

  const isAdmin = student.role === 'admin';

  return (
    <nav className="bg-slate-800 text-white shadow-sm font-sans">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to={isAdmin ? '/admin' : '/dashboard'} className="text-lg font-bold">
              🏢 Hostel Allocation
            </Link>
            <div className="flex space-x-4">
              {isAdmin ? (
                <>
                  <Link to="/admin" className="px-3 py-2 rounded hover:bg-slate-700 text-sm">
                    Dashboard
                  </Link>
                  <Link to="/admin/data" className="px-3 py-2 rounded hover:bg-slate-700 text-sm">
                    Data
                  </Link>
                  <Link to="/admin/requests" className="px-3 py-2 rounded hover:bg-slate-700 text-sm">
                    Requests
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/dashboard" className="px-3 py-2 rounded hover:bg-slate-700 text-sm">
                    Dashboard
                  </Link>
                  <Link to="/group" className="px-3 py-2 rounded hover:bg-slate-700 text-sm">
                    My Group
                  </Link>
                  <Link to="/preferences" className="px-3 py-2 rounded hover:bg-slate-700 text-sm">
                    Preferences
                  </Link>
                  <Link to="/result" className="px-3 py-2 rounded hover:bg-slate-700 text-sm">
                    Result
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-300 font-medium">
              {student.name} ({student.role === 'admin' ? 'Admin' : 'Student'})
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
