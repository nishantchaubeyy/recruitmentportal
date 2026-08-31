import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import InterestModal from './InterestModal';

function VacancySlider() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');

  // Interest Modal state
  const [interestModalOpen, setInterestModalOpen] = useState(false);

  useEffect(() => {
    fetchOpenVacancies();
  }, []);

  const fetchOpenVacancies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/public/vacancies');
      setVacancies(data || []);
    } catch (err) {
      console.error('Fetch vacancies error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format system types (e.g. NON_TEACHING -> Non-Teaching)
  const formatTypeLabel = (typeStr) => {
    if (!typeStr) return 'General';
    if (typeStr === 'TEACHING') return 'Teaching';
    if (typeStr === 'NON_TEACHING') return 'Non-Teaching';
    return typeStr.charAt(0).toUpperCase() + typeStr.slice(1).toLowerCase().replace('_', '-');
  };

  const filteredVacancies = vacancies.filter((job) => {
    if (activeTab === 'ALL') return true;
    return job.type === activeTab;
  });

  return (
    <section style={{ backgroundColor: '#ffffff', padding: '64px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
      <div className="container" style={{ maxWidth: '1120px', padding: '0 24px', margin: '0 auto' }}>
        
        {/* 🎯 CENTER-ALIGNED SECTION HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          
          {/* Eyebrow Header: Micro-uppercase tracked text (NO pill bubble background) */}
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '1.8px',
            marginBottom: '10px'
          }}>
            CAREER OPPORTUNITIES
          </div>

          {/* Crisp, Bold Header Title */}
          <h2 style={{
            margin: '0 0 12px 0',
            color: '#0f172a',
            fontSize: '2.25rem',
            fontWeight: 800,
            letterSpacing: '-0.6px',
            lineHeight: 1.2
          }}>
            Explore Active Vacancies
          </h2>

          {/* Subtitle */}
          <p style={{
            margin: '0 auto',
            color: '#475569',
            fontSize: '1rem',
            fontWeight: 500,
            maxWidth: '640px',
            lineHeight: 1.6
          }}>
            Discover your next role at DYPIU and contribute to world-class education and innovation.
          </p>

          {/* Filter Tabs (All / Teaching / Non-Teaching) */}
          {vacancies.length > 0 && (
            <div style={{ display: 'inline-flex', gap: '8px', marginTop: '24px', backgroundColor: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setActiveTab('ALL')}
                style={{
                  padding: '7px 18px',
                  borderRadius: '7px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'ALL' ? '#ffffff' : 'transparent',
                  color: activeTab === 'ALL' ? '#0f172a' : '#64748b',
                  boxShadow: activeTab === 'ALL' ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                All Vacancies ({vacancies.length})
              </button>

              <button
                onClick={() => setActiveTab('TEACHING')}
                style={{
                  padding: '7px 18px',
                  borderRadius: '7px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'TEACHING' ? '#ffffff' : 'transparent',
                  color: activeTab === 'TEACHING' ? '#0f172a' : '#64748b',
                  boxShadow: activeTab === 'TEACHING' ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Teaching ({vacancies.filter(v => v.type === 'TEACHING').length})
              </button>

              <button
                onClick={() => setActiveTab('NON_TEACHING')}
                style={{
                  padding: '7px 18px',
                  borderRadius: '7px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'NON_TEACHING' ? '#ffffff' : 'transparent',
                  color: activeTab === 'NON_TEACHING' ? '#0f172a' : '#64748b',
                  boxShadow: activeTab === 'NON_TEACHING' ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Non-Teaching ({vacancies.filter(v => v.type === 'NON_TEACHING').length})
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loading active vacancies...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px 20px', borderRadius: '12px', color: '#b91c1c', fontSize: '0.9rem', textAlign: 'center' }}>
            ⚠️ Failed to load active vacancies: {error}
          </div>
        ) : filteredVacancies.length === 0 ? (
          /* Empty State Card */
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '44px 24px',
            textAlign: 'center',
            maxWidth: '580px',
            margin: '0 auto'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.15rem', fontWeight: 800 }}>
              No vacancies currently available for this filter.
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '22px' }}>
              Would you like us to notify you as soon as new positions open up?
            </p>
            <button
              onClick={() => setInterestModalOpen(true)}
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(15,23,42,0.12)'
              }}
            >
              Notify Me When Open
            </button>
          </div>
        ) : (
          /* 💳 RESPONSIVE 3-COLUMN CARD GRID (NO CAROUSEL SLIDER / NO CUTOFF) */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: '24px'
          }}>
            {filteredVacancies.map((job) => (
              <div
                key={job.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative'
                }}
                className="vacancy-card-hover"
              >
                <div>
                  {/* TOP ROW: Minimalist Tag (Left) & Ref Code (Right) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      letterSpacing: '0.2px'
                    }}>
                      {formatTypeLabel(job.type)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {job.vacancyNumber || 'VAC-2026-001'}
                    </span>
                  </div>

                  {/* JOB TITLE */}
                  <h3
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    style={{
                      margin: '0 0 6px 0',
                      color: '#0f172a',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      lineHeight: '1.35',
                      cursor: 'pointer',
                      transition: 'color 0.2s ease'
                    }}
                    className="job-title-link"
                  >
                    {job.position}
                  </h3>

                  {/* DEPARTMENT */}
                  <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 500, marginBottom: '18px' }}>
                    {job.department || 'DYPIU Department'}
                  </div>

                  {/* INLINE ICON METADATA (16px Outline Lucide SVGs) */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    marginBottom: '20px',
                    fontSize: '0.84rem',
                    color: '#334155'
                  }}>
                    {/* Location Pin Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <span style={{ fontWeight: 500 }}>{job.location || 'Pune Campus'}</span>
                    </div>

                    {/* Briefcase Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                      <span style={{ fontWeight: 500 }}>
                        {job.employmentType || 'Full Time'} ({job.numPositions || 1} Opening{job.numPositions > 1 ? 's' : ''})
                      </span>
                    </div>

                    {/* Calendar Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <span style={{ fontWeight: 500 }}>
                        Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Open until filled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* FOOTER ACTIONS (Secondary Ghost/Border & Solid Primary CTA) */}
                <div style={{ display: 'flex', gap: '10px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      padding: '9px 14px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    className="btn-secondary-hover"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => navigate(`/apply?jobId=${job.id}`)}
                    style={{
                      flex: 1,
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(15,23,42,0.12)',
                      transition: 'all 0.2s ease'
                    }}
                    className="btn-primary-hover"
                  >
                    Apply Now
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* 🔻 SECTION FOOTER BUTTON: View All Openings → */}
        <div style={{ textAlign: 'center', marginTop: '44px' }}>
          <button
            onClick={() => navigate('/teaching')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15,23,42,0.15)',
              transition: 'all 0.2s ease'
            }}
            className="view-all-btn-hover"
          >
            <span>View All Openings</span>
            <span>&rarr;</span>
          </button>
        </div>

      </div>

      <InterestModal
        isOpen={interestModalOpen}
        onClose={() => setInterestModalOpen(false)}
      />
    </section>
  );
}

export default VacancySlider;
