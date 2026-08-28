import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';

function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApps: 0,
    underReview: 0,
    submitted: 0,
    shortlisted: 0,
    interview: 0,
    selected: 0,
    rejected: 0
  });
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const [reportData, jobsData, appsData] = await Promise.all([
          apiRequest('/reports').catch(() => []),
          apiRequest('/jobs?adminView=true').catch(() => []),
          apiRequest('/applications?limit=100').catch(() => [])
        ]);

        const jobsList = Array.isArray(jobsData) ? jobsData : [];
        const allApps = Array.isArray(appsData?.data) ? appsData.data : (Array.isArray(appsData) ? appsData : []);

        const totalJobs = jobsList.length;
        const activeJobs = jobsList.filter(j => j.status === 'PUBLISHED').length;

        // Calculate real status pipeline counts directly from live application records
        const submitted = allApps.filter(a => ['SUBMITTED', 'Application Submitted'].includes(a.status)).length;
        const underReview = allApps.filter(a => ['UNDER_REVIEW', 'Under Review'].includes(a.status)).length;
        const shortlisted = allApps.filter(a => ['SHORTLISTED', 'Shortlisted'].includes(a.status)).length;
        const interview = allApps.filter(a => ['INTERVIEW_SCHEDULED', 'Interview Scheduled'].includes(a.status)).length;
        const selected = allApps.filter(a => ['SELECTED', 'Selected'].includes(a.status)).length;
        const rejected = allApps.filter(a => ['REJECTED', 'Not Selected', 'Application Closed'].includes(a.status)).length;

        setMetrics({
          totalJobs,
          activeJobs,
          totalApps: allApps.length,
          underReview,
          submitted,
          shortlisted,
          interview,
          selected,
          rejected
        });

        setRecentApps(allApps.slice(0, 5));
      } catch (err) {
        setError(err.message || 'Failed to load dashboard statistics.');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading dashboard metrics...</p>
      ) : (
        <>
          {/* ROW 1: 4 KPI CARDS DESKTOP ROW */}
          <div className="kpi-cards-grid">
            <div className="kpi-card kpi-blue">
              <div className="kpi-card-header">
                <span className="kpi-label">Total Vacancies</span>
                <span className="kpi-icon">📋</span>
              </div>
              <div className="kpi-number">{metrics.totalJobs}</div>
              <div className="kpi-context">Total posted openings</div>
            </div>

            <div className="kpi-card kpi-teal">
              <div className="kpi-card-header">
                <span className="kpi-label">Active Vacancies</span>
                <span className="kpi-icon">🟢</span>
              </div>
              <div className="kpi-number">{metrics.activeJobs}</div>
              <div className="kpi-context">Open for applications</div>
            </div>

            <div className="kpi-card kpi-green">
              <div className="kpi-card-header">
                <span className="kpi-label">Total Applications</span>
                <span className="kpi-icon">📄</span>
              </div>
              <div className="kpi-number">{metrics.totalApps}</div>
              <div className="kpi-context">Received across all posts</div>
            </div>

            <div className="kpi-card kpi-orange">
              <div className="kpi-card-header">
                <span className="kpi-label">Under Review</span>
                <span className="kpi-icon">🔍</span>
              </div>
              <div className="kpi-number">{metrics.underReview}</div>
              <div className="kpi-context">Awaiting HR screening</div>
            </div>
          </div>

          {/* ROW 2: RECRUITMENT PIPELINE STEPPER */}
          <div className="pipeline-card-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="pipeline-header-title">Recruitment Status Pipeline</h3>
              <Link to="/admin/applications" style={{ fontSize: '0.85rem', color: '#0891b2', fontWeight: 700, textDecoration: 'none' }}>
                View All Applications &rarr;
              </Link>
            </div>

            <div className="pipeline-stepper-grid">
              <div className="pipeline-step-box" style={{ borderTop: '3px solid #0f2b5c' }}>
                <div className="step-count">{metrics.submitted}</div>
                <div className="step-name">Submitted</div>
              </div>

              <div className="pipeline-step-box" style={{ borderTop: '3px solid #0891b2' }}>
                <div className="step-count">{metrics.underReview}</div>
                <div className="step-name">Under Review</div>
              </div>

              <div className="pipeline-step-box" style={{ borderTop: '3px solid #16a34a' }}>
                <div className="step-count">{metrics.shortlisted}</div>
                <div className="step-name">Shortlisted</div>
              </div>

              <div className="pipeline-step-box" style={{ borderTop: '3px solid #ea580c' }}>
                <div className="step-count">{metrics.interview}</div>
                <div className="step-name">Interview</div>
              </div>

              <div className="pipeline-step-box" style={{ borderTop: '3px solid #15803d' }}>
                <div className="step-count">{metrics.selected}</div>
                <div className="step-name">Selected</div>
              </div>

              <div className="pipeline-step-box" style={{ borderTop: '3px solid #991b1b' }}>
                <div className="step-count">{metrics.rejected}</div>
                <div className="step-name">Not Selected</div>
              </div>
            </div>
          </div>

          {/* ROW 3: ANALYTICS OVERVIEW & RECENT APPLICATIONS TABLE */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* LEFT: Recent Applications Table */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f2b5c', fontWeight: 800 }}>Recent Candidate Applications</h3>
                <Link to="/admin/applications" style={{ fontSize: '0.85rem', color: '#0891b2', fontWeight: 700, textDecoration: 'none' }}>
                  Manage All &rarr;
                </Link>
              </div>

              {recentApps.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No recent applications submitted.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Position</th>
                      <th>Applied On</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApps.map(app => (
                      <tr key={app.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f2b5c' }}>{app.applicant?.name || app.personalInfo?.firstName || 'Applicant'}</div>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{app.applicationNumber}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{app.job?.position || 'Vacancy'}</div>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{app.job?.department}</span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.78rem',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            backgroundColor: app.status === 'Shortlisted' ? '#f0fdf4' : '#eff6ff',
                            color: app.status === 'Shortlisted' ? '#15803d' : '#0f2b5c'
                          }}>
                            {app.status}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            onClick={() => navigate(`/admin/applications/${app.id}`)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* RIGHT: Applications Status Breakdown */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0f2b5c', fontWeight: 800 }}>Application Distribution</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '4px' }}>
                      <span>Under Review</span>
                      <span style={{ color: '#0891b2' }}>{metrics.underReview}</span>
                    </div>
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (metrics.underReview / (metrics.totalApps || 1)) * 100)}%`, height: '100%', background: '#0891b2' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '4px' }}>
                      <span>Shortlisted</span>
                      <span style={{ color: '#16a34a' }}>{metrics.shortlisted}</span>
                    </div>
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (metrics.shortlisted / (metrics.totalApps || 1)) * 100)}%`, height: '100%', background: '#16a34a' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '4px' }}>
                      <span>Interview Scheduled</span>
                      <span style={{ color: '#ea580c' }}>{metrics.interview}</span>
                    </div>
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (metrics.interview / (metrics.totalApps || 1)) * 100)}%`, height: '100%', background: '#ea580c' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '4px' }}>
                      <span>Selected Candidates</span>
                      <span style={{ color: '#15803d' }}>{metrics.selected}</span>
                    </div>
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (metrics.selected / (metrics.totalApps || 1)) * 100)}%`, height: '100%', background: '#15803d' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '0.82rem', color: '#64748b' }}>
                💡 Live dynamic status metrics.
              </div>
            </div>
          </div>

          {/* ROW 4: COMPACT QUICK ACTIONS */}
          <div style={{ marginTop: '8px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f2b5c', fontWeight: 800 }}>Quick Administrative Actions</h3>

            <div className="compact-quick-actions">
              <Link to="/admin/jobs/create" className="quick-action-card" style={{ borderLeft: '4px solid #0f2b5c' }}>
                <span className="action-icon">➕</span>
                <span>Create Vacancy</span>
              </Link>

              <Link to="/admin/applications" className="quick-action-card" style={{ borderLeft: '4px solid #0891b2' }}>
                <span className="action-icon">🔍</span>
                <span>Review Applications</span>
              </Link>

              <Link to="/admin/interviews" className="quick-action-card" style={{ borderLeft: '4px solid #ea580c' }}>
                <span className="action-icon">🗓</span>
                <span>Schedule Interview</span>
              </Link>

              <Link to="/admin/reports" className="quick-action-card" style={{ borderLeft: '4px solid #16a34a' }}>
                <span className="action-icon">📈</span>
                <span>View Reports</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
