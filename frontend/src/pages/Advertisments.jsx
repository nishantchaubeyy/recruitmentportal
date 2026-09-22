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

  // Filter School Posters and Job Posters with active uploaded images
  const schoolPosters = schools.filter(s => Boolean(s.posterUrl || s.recruitmentPosterUrl));
  const jobPosters = vacancies.filter(j => Boolean(j.posterUrl));
  const hasAnyPosters = schoolPosters.length > 0 || jobPosters.length > 0;

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* ─── SIMPLE, FORMAL UNIVERSITY HEADER SECTION ─── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '48px 24px 24px',
          textAlign: 'center',
          borderBottom: '2px solid #8B1235'
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'none',
                border: 'none',
                color: '#8B1235',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              &larr; Back
            </button>
          </div>
          <h1
            style={{
              margin: 0,
              color: '#8B1235',
              fontSize: 'clamp(1.8rem, 3.8vw, 2.5rem)',
              fontWeight: 800,
              fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              lineHeight: 1.2,
              textAlign: 'center'
            }}
          >
            FACULTY & VACANCY ADVERTISEMENTS
          </h1>
        </div>
      </div>

      {/* ─── MAIN CONTENT LISTINGS ─── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#171717' }}>Loading recruitment advertisements...</p>
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
        ) : !hasAnyPosters ? null : (
          <>
            {/* Stacked List of Faculty Posters & Vacancy Posters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
              {/* 1. Faculty / School Official Posters */}
              {schoolPosters.map((sch) => (
                <VacancyPoster key={`school-${sch.id}`} school={sch} showApplyButton={false} />
              ))}

              {/* 2. Individual Vacancy Posters */}
              {jobPosters.map((job) => (
                <VacancyPoster key={`job-${job.id}`} job={job} showApplyButton={false} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Advertisments;
