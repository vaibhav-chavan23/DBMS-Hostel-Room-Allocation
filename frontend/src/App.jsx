import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import DashboardPage from './pages/student/DashboardPage';
import GroupPage from './pages/student/GroupPage';
import RoomPreferencePage from './pages/student/RoomPreferencePage';
import AllocationResultPage from './pages/student/AllocationResultPage';

import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import DataViewerPage from './pages/admin/DataViewerPage';
import RequestsPage from './pages/admin/RequestsPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Student routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/group" element={<GroupPage />} />
            <Route path="/preferences" element={<RoomPreferencePage />} />
            <Route path="/result" element={<AllocationResultPage />} />
          </Route>

          {/* Admin routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/data" element={<DataViewerPage />} />
            <Route path="/admin/requests" element={<RequestsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
