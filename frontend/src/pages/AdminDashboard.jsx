import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import {
  IconBriefcase,
  IconFileText,
  IconUserCheck,
  IconCalendar,
  IconChevronRight,
  IconTrendingUp,
  IconPlus,
  IconBarChart
} from '../components/icons/AdminIcons';

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
        const [jobsData, appsData] = await Promise.all([
          apiRequest('/admin/vacancies').catch(() => []),
          apiRequest('/applications?limit=100').catch(() => [])
        ]);

        const jobsList = Array.isArray(jobsData) ? jobsData : [];
        const allApps = Array.isArray(appsData?.data) ? appsData.data : (Array.isArray(appsData) ? appsData : []);

        const totalJobs = jobsList.length;
        const activeJobs = jobsList.filter(j => j.status === 'PUBLISHED').length;

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

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Selected':
      case 'Shortlisted':
        return { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' };
      case 'Interview Scheduled':
      case 'Interview':
        return { bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE' };
      case 'Under Review':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'Not Selected':
      case 'Application Closed':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
      default:
        return { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' };
    }
  };

  const totalAppsSafe = metrics.totalApps || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '0.9rem' }}>
          Loading dashboard metrics...
        </div>
      ) : (
        <>
          {/* SECTION A: TOP METRICS CARDS (GRID OF 4 - NO RAINBOW BORDERS, NO EMOJIS) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '18px' }}>
            
            {/* Metric 1: Total Vacancies */}
            <div style={metricCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={metricLabelStyle}>Total Vacancies</span>
                <IconBriefcase size={20} color="#64748B" />
              </div>
              <div style={metricValueStyle}>{metrics.totalJobs}</div>
              <div style={metricContextStyle}>
                <IconTrendingUp size={13} color="#16A34A" />
                <span style={{ color: '#16A34A', fontWeight: 700 }}>Active</span> across all departments
              </div>
            </div>

            {/* Metric 2: Active Openings */}
            <div style={metricCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={metricLabelStyle}>Active Openings</span>
                <IconUserCheck size={20} color="#64748B" />
              </div>
              <div style={metricValueStyle}>{metrics.activeJobs}</div>
              <div style={metricContextStyle}>
                Open for public applications
              </div>
            </div>

            {/* Metric 3: Total Applications */}
            <div style={metricCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={metricLabelStyle}>Total Applications</span>
                <IconFileText size={20} color="#64748B" />
              </div>
              <div style={metricValueStyle}>{metrics.totalApps}</div>
              <div style={metricContextStyle}>
                Submissions received to date
              </div>
            </div>

            {/* Metric 4: Applications Under Review */}
            <div style={metricCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={metricLabelStyle}>Under Review</span>
                <IconCalendar size={20} color="#64748B" />
              </div>
              <div style={metricValueStyle}>{metrics.underReview}</div>
              <div style={metricContextStyle}>
                Awaiting HR screening decision
              </div>
            </div>

          </div>

          {/* SECTION B: STREAMLINED RECRUITMENT PIPELINE BAR */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>Recruitment Stage Pipeline</h2>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>Live candidate conversion breakdown across stages</div>
              </div>
              <Link to="/admin/applications" style={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>View Applications</span>
                <IconChevronRight size={14} color="#0F172A" />
              </Link>
            </div>

            {/* Segmented Progress Bar */}
            <div style={{ height: '10px', width: '100%', backgroundColor: '#F1F5F9', borderRadius: '6px', overflow: 'hidden', display: 'flex', marginBottom: '20px' }}>
              <div style={{ width: `${(metrics.submitted / totalAppsSafe) * 100}%`, backgroundColor: '#3B82F6' }} title="Submitted" />
              <div style={{ width: `${(metrics.underReview / totalAppsSafe) * 100}%`, backgroundColor: '#F59E0B' }} title="Under Review" />
              <div style={{ width: `${(metrics.shortlisted / totalAppsSafe) * 100}%`, backgroundColor: '#10B981' }} title="Shortlisted" />
              <div style={{ width: `${(metrics.interview / totalAppsSafe) * 100}%`, backgroundColor: '#6366F1' }} title="Interview" />
              <div style={{ width: `${(metrics.selected / totalAppsSafe) * 100}%`, backgroundColor: '#059669' }} title="Selected" />
              <div style={{ width: `${(metrics.rejected / totalAppsSafe) * 100}%`, backgroundColor: '#EF4444' }} title="Rejected" />
            </div>

            {/* Pipeline Stage Indicators */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div 
                onClick={() => navigate('/admin/applications?status=SUBMITTED')}
                style={{ ...pipelineStepStyle, cursor: 'pointer' }}
                title="Click to view all Submitted applications"
              >
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>Submitted</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>{metrics.submitted}</span>
              </div>

              <div 
                onClick={() => navigate('/admin/applications?status=UNDER_REVIEW')}
                style={{ ...pipelineStepStyle, cursor: 'pointer' }}
                title="Click to view all Under Review applications"
              >
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>Under Review</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#D97706' }}>{metrics.underReview}</span>
              </div>

              <div 
                onClick={() => navigate('/admin/applications?status=SHORTLISTED')}
                style={{ ...pipelineStepStyle, cursor: 'pointer' }}
                title="Click to view all Shortlisted applications"
              >
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>Shortlisted</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>{metrics.shortlisted}</span>
              </div>

              <div 
                onClick={() => navigate('/admin/applications?status=INTERVIEW_SCHEDULED')}
                style={{ ...pipelineStepStyle, cursor: 'pointer' }}
                title="Click to view all Interview stage applications"
              >
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>Interview</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4F46E5' }}>{metrics.interview}</span>
              </div>

              <div 
                onClick={() => navigate('/admin/applications?status=SELECTED')}
                style={{ ...pipelineStepStyle, cursor: 'pointer' }}
                title="Click to view all Selected applications"
              >
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>Selected</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#047857' }}>{metrics.selected}</span>
              </div>

              <div 
                onClick={() => navigate('/admin/applications?status=REJECTED')}
                style={{ ...pipelineStepStyle, cursor: 'pointer' }}
                title="Click to view all Rejected applications"
              >
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>Rejected</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#DC2626' }}>{metrics.rejected}</span>
              </div>
            </div>
          </div>

          {/* SECTION C: 2-COLUMN MAIN CONTENT (TABLE & DISTRIBUTION) */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '22px' }}>
            
            {/* LEFT COLUMN: RECENT CANDIDATE APPLICATIONS DATA TABLE */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>Recent Candidate Applications</h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>Latest submissions across all departments</div>
                </div>
                <Link to="/admin/applications" style={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>View All</span>
                  <IconChevronRight size={14} color="#0F172A" />
                </Link>
              </div>

              {recentApps.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
                  No candidate applications found.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Candidate</th>
                        <th style={{ padding: '10px 12px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Position & Department</th>
                        <th style={{ padding: '10px 12px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Applied Date</th>
                        <th style={{ padding: '10px 12px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '10px 12px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentApps.map((app) => {
                        const badge = getStatusBadgeStyle(app.status);
                        const candidateName = app.applicant?.name || `${app.personalInfo?.firstName || ''} ${app.personalInfo?.lastName || ''}`.trim() || 'Candidate';
                        return (
                          <tr key={app.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s ease' }}>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>{candidateName}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '1px' }}>{app.applicationNumber}</div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: 600, color: '#1E293B' }}>{app.job?.position || app.personalInfo?.postAppliedFor || 'Vacancy'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '1px' }}>{app.job?.department || app.personalInfo?.faculty || 'Department'}</div>
                            </td>
                            <td style={{ padding: '12px', color: '#475569', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                              {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                display: 'inline-block',
                                backgroundColor: badge.bg,
                                color: badge.text,
                                border: `1px solid ${badge.border}`
                              }}>
                                {app.status || 'SUBMITTED'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <button
                                onClick={() => navigate(`/admin/applications/${app.id}`)}
                                style={ghostActionButtonStyle}
                              >
                                View Details &rarr;
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: APPLICATION DISTRIBUTION ANALYTICS */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>Application Distribution</h3>
                  <IconBarChart size={18} color="#64748B" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      <span style={{ color: '#475569' }}>Under Review</span>
                      <span style={{ fontWeight: 700, color: '#D97706' }}>{metrics.underReview}</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (metrics.underReview / totalAppsSafe) * 100)}%`, height: '100%', backgroundColor: '#F59E0B' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      <span style={{ color: '#475569' }}>Shortlisted</span>
                      <span style={{ fontWeight: 700, color: '#059669' }}>{metrics.shortlisted}</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (metrics.shortlisted / totalAppsSafe) * 100)}%`, height: '100%', backgroundColor: '#10B981' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      <span style={{ color: '#475569' }}>Interview Scheduled</span>
                      <span style={{ fontWeight: 700, color: '#4F46E5' }}>{metrics.interview}</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (metrics.interview / totalAppsSafe) * 100)}%`, height: '100%', backgroundColor: '#6366F1' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      <span style={{ color: '#475569' }}>Selected Candidates</span>
                      <span style={{ fontWeight: 700, color: '#047857' }}>{metrics.selected}</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (metrics.selected / totalAppsSafe) * 100)}%`, height: '100%', backgroundColor: '#059669' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Footer Metrics note */}
              <div style={{ marginTop: '24px', paddingTop: '14px', borderTop: '1px solid #F1F5F9', fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                <span>Live dynamic pipeline analytics.</span>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

const metricCardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between'
};

const metricLabelStyle = {
  fontSize: '0.82rem',
  color: '#64748B',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.3px'
};

const metricValueStyle = {
  fontSize: '1.8rem',
  fontWeight: 800,
  color: '#0F172A',
  margin: '12px 0 6px 0',
  letterSpacing: '-0.5px'
};

const metricContextStyle = {
  fontSize: '0.78rem',
  color: '#64748B',
  display: 'flex',
  alignItems: 'center',
  gap: '5px'
};

const pipelineStepStyle = {
  backgroundColor: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
};

const ghostActionButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#0F172A',
  fontSize: '0.82rem',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: '4px',
  transition: 'all 0.15s ease'
};

export default AdminDashboard;
