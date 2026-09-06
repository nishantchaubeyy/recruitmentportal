import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import VacancyPoster from '../components/VacancyPoster';

function Advertisments() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('TEACHING'); // 'TEACHING' or 'NON_TEACHING'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vacanciesData, schoolsData] = await Promise.all([
        apiRequest('/public/vacancies').catch(() => []),
        apiRequest('/public/schools').catch(() => [])
      ]);
      setVacancies(Array.isArray(vacanciesData) ? vacanciesData : []);
      setSchools(Array.isArray(schoolsData) ? schoolsData : []);
    } catch (err) {
      console.error('Failed to fetch vacancy advertisements:', err);
      setError(err.message || 'Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  };

  // Filter Teaching and Non-Teaching Vacancies
  const teachingVacancies = vacancies.filter(v => v.type === 'TEACHING');
  const nonTeachingVacancies = vacancies.filter(v => v.type === 'NON_TEACHING');

  // Filter Teaching and Non-Teaching School Posters
  const teachingSchoolPosters = schools.filter(s => (s.type === 'TEACHING' || !s.type) && (s.posterUrl || s.recruitmentPosterUrl));
  const nonTeachingSchoolPosters = schools.filter(s => s.type === 'NON_TEACHING' && (s.posterUrl || s.recruitmentPosterUrl));

  const totalTeachingCount = teachingVacancies.length + teachingSchoolPosters.length;
  const totalNonTeachingCount = nonTeachingVacancies.length + nonTeachingSchoolPosters.length;

  const currentSchoolPosters = activeTab === 'TEACHING' ? teachingSchoolPosters : nonTeachingSchoolPosters;
  const currentVacancies = activeTab === 'TEACHING' ? teachingVacancies : nonTeachingVacancies;

  const hasAnyPosters = currentSchoolPosters.length > 0 || currentVacancies.length > 0;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Hero Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f2b5c 0%, #1e3a8a 100%)',
          color: '#ffffff',
          padding: '60px 24px',
          textAlign: 'center',
          borderBottom: '4px solid #d97706',
          boxShadow: '0 4px 20px rgba(15, 43, 92, 0.15)'
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              backgroundColor: 'rgba(217, 119, 6, 0.2)',
              color: '#f59e0b',
              padding: '6px 16px',
              borderRadius: '20px',
              display: 'inline-block',
              marginBottom: '16px',
              border: '1px solid rgba(217, 119, 6, 0.3)'
            }}
          >
            DYPIU Official Recruitment Notices & Advertisements
          </span>
          <h1
            style={{
              margin: '0 0 16px 0',
              fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
              fontWeight: 900,
              letterSpacing: '-0.5px',
              lineHeight: 1.15
            }}
          >
            Faculty & Vacancy Advertisements
          </h1>
          <p
            style={{
              margin: '0 auto',
              fontSize: '1.1rem',
              color: '#cbd5e1',
              maxWidth: '680px',
              lineHeight: 1.6
            }}
          >
            Explore official recruitment posters, faculty notices, and open positions at D Y Patil International University, Akurdi, Pune.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 0' }}>
        {/* Category Tabs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '40px'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: '#ffffff',
              padding: '6px',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
              gap: '8px'
            }}
          >
            <button
              onClick={() => setActiveTab('TEACHING')}
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'TEACHING' ? '#0f2b5c' : 'transparent',
                color: activeTab === 'TEACHING' ? '#ffffff' : '#64748b',
                boxShadow: activeTab === 'TEACHING' ? '0 4px 12px rgba(15, 43, 92, 0.2)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Teaching / Research Faculty</span>
              <span
                style={{
                  backgroundColor: activeTab === 'TEACHING' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                  color: activeTab === 'TEACHING' ? '#ffffff' : '#475569',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.78rem'
                }}
              >
                {totalTeachingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('NON_TEACHING')}
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'NON_TEACHING' ? '#0f2b5c' : 'transparent',
                color: activeTab === 'NON_TEACHING' ? '#ffffff' : '#64748b',
                boxShadow: activeTab === 'NON_TEACHING' ? '0 4px 12px rgba(15, 43, 92, 0.2)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Non-Teaching Staff</span>
              <span
                style={{
                  backgroundColor: activeTab === 'NON_TEACHING' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                  color: activeTab === 'NON_TEACHING' ? '#ffffff' : '#475569',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.78rem'
                }}
              >
                {totalNonTeachingCount}
              </span>
            </button>
          </div>
        </div>

        {/* Content Display */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
            <p style={{ fontWeight: 700, fontSize: '1rem' }}>Loading recruitment advertisements...</p>
          </div>
        ) : error ? (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '20px 24px',
              borderRadius: '12px',
              color: '#b91c1c',
              fontSize: '0.95rem',
              textAlign: 'center',
              maxWidth: '600px',
              margin: '0 auto'
            }}
          >
            {error}
          </div>
        ) : !hasAnyPosters ? (
          /* Clean Empty State */
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '60px 32px',
              textAlign: 'center',
              maxWidth: '650px',
              margin: '0 auto',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                color: '#64748b'
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '1.3rem', fontWeight: 800 }}>
              No Open Advertisements Found
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.5 }}>
              There are currently no active recruitment posters under{' '}
              <strong>{activeTab === 'TEACHING' ? 'Teaching / Research Faculty' : 'Non-Teaching Staff'}</strong>. Please check back soon or switch tabs.
            </p>
            <button
              onClick={() => navigate('/apply')}
              style={{
                backgroundColor: '#0f2b5c',
                color: '#ffffff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(15, 43, 92, 0.2)'
              }}
            >
              Submit General Application
            </button>
          </div>
        ) : (
          /* Stacked List of Faculty Posters & Vacancy Posters */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {/* 1. Faculty / School Official Posters */}
            {currentSchoolPosters.map((sch) => (
              <VacancyPoster key={`school-${sch.id}`} school={sch} />
            ))}

            {/* 2. Individual Vacancy Posters */}
            {currentVacancies.map((job) => (
              <VacancyPoster key={`job-${job.id}`} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Advertisments;
