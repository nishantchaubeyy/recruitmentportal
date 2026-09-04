import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, getMediaUrl } from '../utils/api';

const NON_TEACHING_DIVISIONS = [
  { id: 'admin-registrar', name: 'University Administration & Operations', keyword: 'Admin Administrative Operations Registrar' },
  { id: 'systems-it', name: 'Systems & IT Infrastructure', keyword: 'IT Systems Infrastructure Tech Network' },
  { id: 'technical-labs', name: 'Technical & Laboratory Services', keyword: 'Lab Technical Assistant Services' },
  { id: 'finance-accounts', name: 'Finance & Accounts Department', keyword: 'Finance Accounts Accounting Audit' },
  { id: 'library-services', name: 'Library & Information Services', keyword: 'Library Information Services' },
  { id: 'branding-media', name: 'Branding, Media & Promotion', keyword: 'Branding Media Promotion Design Designer' },
  { id: 'estate-civil', name: 'Estate & Civil Engineering', keyword: 'Civil Estate Engineering Architect' }
];

function NonTeachingPositions() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [schoolsData, setSchoolsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDivId, setExpandedDivId] = useState(null);

  useEffect(() => {
    fetchNonTeachingData();
  }, []);

  const fetchNonTeachingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vacanciesData, schoolsList] = await Promise.all([
        apiRequest('/public/vacancies').catch(() => []),
        apiRequest('/public/schools?type=NON_TEACHING').catch(() => [])
      ]);

      const nonTeachingJobs = (vacanciesData || []).filter((j) => j.type === 'NON_TEACHING');
      setVacancies(nonTeachingJobs);
      setSchoolsData(Array.isArray(schoolsList) ? schoolsList : []);
    } catch (err) {
      console.error('Error fetching non-teaching vacancies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDivision = (divId) => {
    if (expandedDivId === divId) {
      setExpandedDivId(null);
    } else {
      setExpandedDivId(divId);
    }
  };

  const getDivisionPoster = (div) => {
    const matched = schoolsData.find((s) => {
      if (s.id === div.id) return true;
      const sName = (s.name || '').toLowerCase().trim();
      const dName = (div.name || '').toLowerCase().trim();
      return sName === dName || sName.includes(dName) || dName.includes(sName);
    });
    return matched?.posterUrl || matched?.recruitmentPosterUrl || null;
  };

  const getDivisionVacancies = (div) => {
    return vacancies.filter((job) => {
      const dept = (job.department || '').toLowerCase();
      const schoolName = (job.school?.name || '').toLowerCase();
      const pos = (job.position || '').toLowerCase();

      const stopWords = ['school', 'faculty', 'department', 'division', 'office', 'services', 'and', 'the', 'for', 'of'];
      const targetTokens = (div.name + ' ' + (div.keyword || ''))
        .toLowerCase()
        .replace(/[^\w\s]/gi, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2 && !stopWords.includes(t));

      const targetText = `${dept} ${schoolName} ${pos}`.toLowerCase();
      return targetTokens.some((token) => targetText.includes(token));
    });
  };

  return (
    <div className="container" style={{ maxWidth: '980px', padding: '30px 24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ fontSize: '0.9rem', color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>
          &larr; Back to Home
        </Link>
      </div>

      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ color: '#0f2b5c', margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
          Non-Teaching Positions
        </h2>
        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
          Explore administrative, technical, and staff career opportunities at D Y Patil International University
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ fontWeight: 600 }}>Loading non-teaching positions...</p>
        </div>
      ) : error ? (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '12px', color: '#b91c1c' }}>
          Failed to load positions: {error}
        </div>
      ) : (
        /* Original Vertical Container with Deep Blue Blocks */
        <div className="vertical-card-container container-non-teaching">
          <div className="vertical-prompt-text">PLEASE CHOOSE DIVISION/DEPARTMENT BELOW:</div>

          <div className="vertical-blocks-list">
            {NON_TEACHING_DIVISIONS.map((div) => {
              const isExpanded = expandedDivId === div.id;
              const posterUrl = getDivisionPoster(div);
              const divJobs = getDivisionVacancies(div);

              return (
                <div key={div.id} style={{ marginBottom: '8px' }}>
                  {/* Original Full-Width Deep Blue Block Button */}
                  <div
                    className="vertical-block-item block-blue"
                    onClick={() => handleToggleDivision(div.id)}
                  >
                    <span>{div.name}</span>
                    <span className="block-arrow">{isExpanded ? '▲' : '→'}</span>
                  </div>

                  {/* Dropdown Content Directly Below Clicked Block */}
                  {isExpanded && (
                    <div style={{
                      padding: '24px',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #0f2b5c',
                      borderTop: 'none',
                      borderRadius: '0 0 10px 10px',
                      boxShadow: '0 4px 12px rgba(15,43,92,0.08)'
                    }}>

                      {/* ── PRIORITY 1: POSTER EXISTS ── */}
                      {posterUrl ? (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          padding: '8px 0'
                        }}>
                          {/* Recruitment Poster Image Container */}
                          <div style={{
                            maxWidth: '720px',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            padding: '12px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                          }}>
                            <img
                              src={getMediaUrl(posterUrl)}
                              alt={`Recruitment poster for ${div.name}`}
                              style={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: '900px',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                display: 'block'
                              }}
                              onError={(e) => {
                                console.error('Failed to load poster image:', posterUrl);
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      ) : divJobs.length > 0 ? (
                        /* ── PRIORITY 2: NO POSTER & VACANCIES EXIST ── */
                        <>
                          <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ color: '#0f2b5c', fontSize: '0.92rem', fontWeight: 800, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                              Currently Active Vacancies ({divJobs.length}):
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                              {divJobs.map((job) => (
                                <div
                                  key={job.id}
                                  className="retro-vacancy-card"
                                >
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                      <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 800, border: '1.5px solid #000000' }}>
                                        {job.employmentType || 'Full Time'}
                                      </span>
                                      <span style={{ fontSize: '0.75rem', color: '#000000', fontWeight: 800 }}>
                                        {job.vacancyNumber || 'VAC-2026'}
                                      </span>
                                    </div>

                                    <h4 style={{ margin: '0 0 8px 0', color: '#000000', fontSize: '1.05rem', fontWeight: 900, lineHeight: 1.25 }}>
                                      {job.position}
                                    </h4>

                                    <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 800, marginBottom: '12px' }}>
                                      {job.numPositions > 1 ? `${job.numPositions} Openings` : '1 Opening'}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => navigate(`/apply?jobId=${job.id}&faculty=${encodeURIComponent(div.name)}&type=NON_TEACHING`)}
                                    className="retro-apply-btn btn-blue"
                                  >
                                    Apply Now &rarr;
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Simple Clean Row: General Application (NO BOX, NO BORDER) */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '16px',
                            marginTop: '28px',
                            paddingTop: '20px',
                            borderTop: '1px solid #e2e8f0'
                          }}>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', letterSpacing: '-0.2px' }}>
                                Apply for {div.name}
                              </div>
                              <div style={{ fontSize: '0.88rem', color: '#475569', marginTop: '3px' }}>
                                Fill out the application form for administrative or staff roles in this department.
                              </div>
                            </div>

                            <button
                              onClick={() => navigate(`/apply?faculty=${encodeURIComponent(div.name)}&type=NON_TEACHING`)}
                              className="general-apply-btn btn-blue"
                            >
                              Apply Now &rarr;
                            </button>
                          </div>
                        </>
                      ) : (
                        /* ── PRIORITY 3: NO POSTER & NO ACTIVE VACANCIES ── */
                        <div>
                          <div style={{
                            padding: '8px 0 16px 0',
                            color: '#475569',
                            fontSize: '0.95rem',
                            fontWeight: 600
                          }}>
                            No active openings currently available for this division.
                          </div>

                          {/* Simple Clean Row: General Application (NO BOX, NO BORDER) */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '16px',
                            marginTop: '8px',
                            paddingTop: '16px',
                            borderTop: '1px solid #e2e8f0'
                          }}>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', letterSpacing: '-0.2px' }}>
                                Apply for {div.name}
                              </div>
                              <div style={{ fontSize: '0.88rem', color: '#475569', marginTop: '3px' }}>
                                Fill out the application form for administrative or staff roles in this department.
                              </div>
                            </div>

                            <button
                              onClick={() => navigate(`/apply?faculty=${encodeURIComponent(div.name)}&type=NON_TEACHING`)}
                              className="general-apply-btn btn-blue"
                            >
                              Apply Now &rarr;
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default NonTeachingPositions;
