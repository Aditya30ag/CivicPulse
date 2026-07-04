/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Report from './pages/Report';
import IssueDetail from './pages/IssueDetail';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';
import Profile from './pages/Profile';

export default function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              {/* Public routes inside layout */}
              <Route path="/" element={<Home />} />
              <Route path="/issue/:id" element={<IssueDetail />} />
              <Route path="/admin" element={<Admin />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/report" element={<Report />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </OfflineProvider>
    </AuthProvider>
  );
}
