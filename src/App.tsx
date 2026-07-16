/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Login from './pages/Login';
import Report from './pages/Report';
import IssueDetail from './pages/IssueDetail';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import FAQ from './pages/FAQ';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing page — no layout chrome */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              {/* Public routes inside layout */}
              <Route path="/home" element={<Home />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/issue/:id" element={<IssueDetail />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/:subpage" element={<Admin />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/report" element={<Report />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
