import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';

const TEACHING_FACULTIES = [
  { id: 'cs-engg', name: 'SCHOOL OF COMPUTING', keyword: 'Computer Computing' },
  { id: 'management', name: 'SCHOOL OF MANAGEMENT', keyword: 'Management Business MBA' },
  { id: 'bioengineering', name: 'SCHOOL OF BIOSCIENCES & BIOENGINEERING', keyword: 'Bio Biotechnology Bioengineering' },
  { id: 'design', name: 'SCHOOL OF ARCHITECTURE & DESIGN', keyword: 'Design Architecture Graphic' },
  { id: 'media-communication', name: 'SCHOOL OF MEDIA & COMMUNICATION', keyword: 'Media Journalism Communication' },
  { id: 'pharmacy', name: 'SCHOOL OF PHARMACY', keyword: 'Pharmacy Pharmaceutical' },
  { id: 'liberal-arts', name: 'SCHOOL OF HUMANITIES & SOCIAL SCIENCES', keyword: 'Humanities Arts Social' },
  { id: 'research-centres', name: 'RESEARCH & INNOVATION CENTRES', keyword: 'Research Innovation' }
];

function TeachingPositions() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSchoolId, setExpandedSchoolId] = useState(null);

  useEffect(() => {
    fetchTeachingVacancies();
  }, []);

  const fetchTeachingVacancies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/public/vacancies');
      const teachingJobs = (data || []).filter((j) => j.type === 'TEACHING');
      setVacancies(teachingJobs);
    } catch (err) {
      console.error('Error fetching teaching vacancies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSchool = (facId) => {
    if (expandedSchoolId === facId) {
      setExpandedSchoolId(null);
    } else {
      setExpandedSchoolId(facId);
    }
  };

  const getSchoolVacancies = (fac) => {
    return vacancies.filter((job) => {
      const dept = (job.department || '').toLowerCase();
      const schoolName = (job.school?.name || '').toLowerCase();
      const pos = (job.position || '').toLowerCase();

      const stopWords = ['school', 'faculty', 'department', 'and', 'the', 'for', 'centres', 'center', 'services', 'of'];
      const targetTokens = (fac.name + ' ' + (fac.keyword || ''))
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
        <h2 style={{ color: '#0d9488', margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
          Teaching Positions
        </h2>
        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
          Explore academic faculty career opportunities at D Y Patil International University
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ fontWeight: 600 }}>Loading teaching positions...</p>
        </div>
      ) : error ? (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '12px', color: '#b91c1c' }}>
          ⚠️ Failed to load positions: {error}
        </div>
      ) : (
        /* Original Vertical Container with Teal Blocks */
        <div className="vertical-card-container container-teaching">
          <div className="vertical-prompt-text">PLEASE CHOOSE FACULTY/DEPARTMENT BELOW:</div>

          <div className="vertical-blocks-list">
            {TEACHING_FACULTIES.map((fac) => {
              const isExpanded = expandedSchoolId === fac.id;
              const schoolJobs = getSchoolVacancies(fac);

              return (
                <div key={fac.id} style={{ marginBottom: '8px' }}>
                  {/* Original Full-Width Teal Block Button */}
                  <div
                    className="vertical-block-item block-teal"
                    onClick={() => handleToggleSchool(fac.id)}
                  >
                    <span>{fac.name}</span>
                    <span className="block-arrow">{isExpanded ? '▲' : '→'}</span>
                  </div>

                  {/* Dropdown Content Directly Below Clicked Block */}
                  {isExpanded && (
                    <div style={{
                      padding: '20px 24px',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #0d9488',
                      borderTop: 'none',
                      borderRadius: '0 0 10px 10px',
                      boxShadow: '0 4px 12px rgba(13,148,136,0.08)'
                    }}>
                      {/* Active Openings Cards (if available) */}
                      {schoolJobs.length > 0 && (
                        <div style={{ marginBottom: '18px' }}>
                          <h4 style={{ color: '#0f2b5c', fontSize: '0.92rem', fontWeight: 800, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Currently Active Vacancies ({schoolJobs.length}):
                          </h4>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                            {schoolJobs.map((job) => (
                              <div
                                key={job.id}
                                style={{
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '10px',
                                  padding: '16px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justify: 'space-between'
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                                      {job.employmentType || 'Full Time'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                      {job.vacancyNumber || 'VAC-2026'}
                                    </span>
                                  </div>

                                  <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.05rem', fontWeight: 800 }}>
                                    {job.position}
                                  </h4>

                                  <div style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                                    {job.department || fac.name}
                                  </div>

                                  <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700, marginBottom: '10px' }}>
                                    {job.numPositions > 1 ? `${job.numPositions} Openings` : '1 Opening'}
                                  </div>
                                </div>

                                <button
                                  onClick={() => navigate(`/apply?jobId=${job.id}&faculty=${encodeURIComponent(fac.name)}&type=TEACHING`)}
                                  className="btn btn-primary"
                                  style={{ backgroundColor: '#0d9488', borderColor: '#0d9488', width: '100%', fontWeight: 700, fontSize: '0.85rem' }}
                                >
                                  Apply Now for {job.position} &rarr;
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* General Application Option (Always available to fill the form for every school!) */}
                      <div style={{
                        backgroundColor: '#f0fdf4',
                        border: '1.5px dashed #0d9488',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f2b5c', fontSize: '0.98rem' }}>
                            Apply for {fac.name}
                          </div>
                          <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '2px' }}>
                            Fill out the application form for faculty roles in this school.
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/apply?faculty=${encodeURIComponent(fac.name)}&type=TEACHING`)}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#0d9488', borderColor: '#0d9488', fontWeight: 800, padding: '10px 22px' }}
                        >
                          Apply Now &rarr;
                        </button>
                      </div>

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

export default TeachingPositions;
