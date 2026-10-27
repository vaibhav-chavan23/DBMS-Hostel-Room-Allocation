import React, { createContext, useState, useEffect } from 'react';
import { getMe } from '../api/auth.api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await getMe();
          if (res.success) {
            setStudent(res.data);
            setToken(storedToken);
          } else {
            logout();
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
          logout();
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = (newToken, newStudent) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('student', JSON.stringify(newStudent));
    setToken(newToken);
    setStudent(newStudent);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('student');
    setToken(null);
    setStudent(null);
  };

  return (
    <AuthContext.Provider value={{ student, token, loading, login, logout }}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen font-sans bg-gray-50 text-gray-600">
          Loading system...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
