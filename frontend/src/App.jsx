import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AuthProvider, { AuthContext } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import AdminLayout from './components/AdminLayout';

// Public Pages
import Home from './pages/Home';
import TeachingPositions from './pages/TeachingPositions';
import NonTeachingPositions from './pages/NonTeachingPositions';
import JobDetails from './pages/JobDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import TrackApplication from './pages/TrackApplication';

// Applicant Pages
import ApplicantDashboard from './pages/ApplicantDashboard';
import ApplicationForm from './pages/ApplicationForm';
import ApplicantApplicationDetails from './pages/ApplicantApplicationDetails';
import ApplicationSuccess from './pages/ApplicationSuccess';

// Admin & Committee Pages
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminJobs from './pages/AdminJobs';
import AdminCreateJob from './pages/AdminCreateJob';
import AdminJobDetails from './pages/AdminJobDetails';
import AdminApplications from './pages/AdminApplications';
import AdminReviewApplication from './pages/AdminReviewApplication';
import AdminInterviews from './pages/AdminInterviews';
import AdminUsers from './pages/AdminUsers';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminReports from './pages/AdminReports';
import AdminInterestedApplicants from './pages/AdminInterestedApplicants';
import CommitteeDashboard from './pages/CommitteeDashboard';

/**
 * Route protector for Applicants.
 */
function ApplicantRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  if (loading) return <div className="container"><p>Verifying authentication...</p></div>;
  if (!user || user.role !== 'APPLICANT') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return (
    <>
      <Header />
      <main style={{ minHeight: '80vh', paddingBottom: '40px' }}>{children}</main>
      <Footer />
    </>
  );
}

/**
 * Route protector & layout wrapper for Admins & Committee Members.
 */
function AdminRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="container"><p>Verifying session...</p></div>;
  
  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'COMMITTEE_MEMBER'];
  if (!user || !adminRoles.includes(user.role)) {
    return <Navigate to="/admin/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
}

/**
 * Public Layout Wrapper with Top Header and Footer
 */
function PublicLayout({ children }) {
  return (
    <>
      <Header />
      <main style={{ minHeight: '80vh', paddingBottom: '40px' }}>{children}</main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/apply" element={<PublicLayout><ApplicationForm /></PublicLayout>} />
          <Route path="/apply/:jobId" element={<PublicLayout><ApplicationForm /></PublicLayout>} />
          <Route path="/teaching" element={<PublicLayout><TeachingPositions /></PublicLayout>} />
          <Route path="/non-teaching" element={<PublicLayout><NonTeachingPositions /></PublicLayout>} />
          <Route path="/jobs/:id" element={<PublicLayout><JobDetails /></PublicLayout>} />
          <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
          <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
          <Route path="/track" element={<PublicLayout><TrackApplication /></PublicLayout>} />

          {/* Admin Login (Standalone) */}
          <Route path="/admin/login" element={<PublicLayout><AdminLogin /></PublicLayout>} />

          {/* Applicant Protected Routes */}
          <Route 
            path="/applicant/dashboard" 
            element={
              <ApplicantRoute>
                <ApplicantDashboard />
              </ApplicantRoute>
            } 
          />
          <Route 
            path="/my-applications" 
            element={
              <ApplicantRoute>
                <ApplicantDashboard />
              </ApplicantRoute>
            } 
          />
          <Route 
            path="/applicant/apply/:jobId" 
            element={
              <PublicLayout>
                <ApplicationForm />
              </PublicLayout>
            } 
          />
          <Route 
            path="/applicant/applications/:id" 
            element={
              <ApplicantRoute>
                <ApplicantApplicationDetails />
              </ApplicantRoute>
            } 
          />
          <Route 
            path="/my-applications/:id" 
            element={
              <ApplicantRoute>
                <ApplicantApplicationDetails />
              </ApplicantRoute>
            } 
          />
          <Route path="/applicant/applications/success" element={<PublicLayout><ApplicationSuccess /></PublicLayout>} />
          <Route path="/applicant/applications/:id/success" element={<PublicLayout><ApplicationSuccess /></PublicLayout>} />

          {/* Admin & Committee Protected Routes (with Left Admin Sidebar Layout) */}
          <Route 
            path="/admin/dashboard" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/jobs" 
            element={
              <AdminRoute>
                <AdminJobs />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/jobs/create" 
            element={
              <AdminRoute>
                <AdminCreateJob />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/jobs/edit/:id" 
            element={
              <AdminRoute>
                <AdminCreateJob />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/jobs/:id" 
            element={
              <AdminRoute>
                <AdminJobDetails />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/vacancy-interests" 
            element={
              <AdminRoute>
                <AdminInterestedApplicants />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/applications" 
            element={
              <AdminRoute>
                <AdminApplications />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/applications/:id" 
            element={
              <AdminRoute>
                <AdminReviewApplication />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/interviews" 
            element={
              <AdminRoute>
                <AdminInterviews />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <AdminRoute allowedRoles={['SUPER_ADMIN', 'HR_ADMIN', 'ADMIN']}>
                <AdminUsers />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/audit-logs" 
            element={
              <AdminRoute allowedRoles={['SUPER_ADMIN', 'HR_ADMIN', 'ADMIN']}>
                <AdminAuditLogs />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/reports" 
            element={
              <AdminRoute>
                <AdminReports />
              </AdminRoute>
            } 
          />
          <Route 
            path="/committee/dashboard" 
            element={
              <AdminRoute allowedRoles={['COMMITTEE_MEMBER', 'SUPER_ADMIN', 'HR_ADMIN', 'ADMIN']}>
                <CommitteeDashboard />
              </AdminRoute>
            } 
          />

          {/* Fallback Catch-All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
