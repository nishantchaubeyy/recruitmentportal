import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import InterestModal from '../components/InterestModal';

const TEACHING_FACULTIES = [
  { id: 'cs-engg', name: 'School of Computing', keyword: 'Computer Computing' },
  { id: 'management', name: 'School of Management', keyword: 'Management Business MBA' },
  { id: 'bioengineering', name: 'School of Biosciences & Bioengineering', keyword: 'Bio Biotechnology Bioengineering' },
  { id: 'design', name: 'School of Architecture & Design', keyword: 'Design Architecture Graphic' },
  { id: 'media-communication', name: 'School of Media & Communication', keyword: 'Media Journalism Communication' },
  { id: 'pharmacy', name: 'School of Pharmacy', keyword: 'Pharmacy Pharmaceutical' },
  { id: 'liberal-arts', name: 'School of Humanities & Social Sciences', keyword: 'Humanities Arts Social' },
  { id: 'research-centres', name: 'Research & Innovation Centres', keyword: 'Research Innovation' }
];

function TeachingPositions() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  // Interest Modal state
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [modalFacultyName, setModalFacultyName] = useState('');

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

  const handleSelectFaculty = (fac) => {
    if (selectedFaculty?.id === fac.id) {
      setSelectedFaculty(null); // Toggle off filter
    } else {
      setSelectedFaculty(fac);
    }
  };

  // Smart multi-token filter for faculty matching
  const displayedVacancies = selectedFaculty
    ? vacancies.filter((job) => {
        const dept = (job.department || '').toLowerCase();
        const schoolName = (job.school?.name || '').toLowerCase();
        const pos = (job.position || '').toLowerCase();

        const stopWords = ['school', 'faculty', 'department', 'and', 'the', 'for', 'centres', 'center', 'services'];
        const targetTokens = (selectedFaculty.name + ' ' + (selectedFaculty.keyword || ''))
          .toLowerCase()
          .replace(/[^\w\s]/gi, ' ')
          .split(/\s+/)
          .filter((t) => t.length > 2 && !stopWords.includes(t));

        const targetText = `${dept} ${schoolName} ${pos}`.toLowerCase();
        return targetTokens.some((token) => targetText.includes(token));
      })
    : vacancies;

  const handleOpenInterest = (facName) => {
    setModalFacultyName(facName);
    setInterestModalOpen(true);
  };

  return (
    <div className="container" style={{ maxWidth: '980px', padding: '30px 24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ fontSize: '0.9rem', color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>
          &larr; Back to Home
        </Link>
      </div>

      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ color: '#0f766e', margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
          Teaching Positions
        </h2>
        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
          Explore academic faculty career opportunities at D Y Patil International University
        </p>
      </div>

      {/* Faculty Selection Blocks - Teal Theme */}
      <div className="vertical-card-container container-teaching" style={{ marginBottom: '35px' }}>
        <div className="vertical-prompt-text">
          {selectedFaculty
            ? `Filter applied: ${selectedFaculty.name} (Click again to clear)`
            : 'Select a Faculty below to view matching active openings:'}
        </div>

        <div className="vertical-blocks-list">
          {TEACHING_FACULTIES.map((fac) => {
            const isSelected = selectedFaculty?.id === fac.id;
            return (
              <div
                key={fac.id}
                onClick={() => handleSelectFaculty(fac)}
                className={`vertical-block-item block-teal ${isSelected ? 'selected' : ''}`}
                style={isSelected ? { border: '2px solid #0f766e', backgroundColor: '#ccfbf1' } : {}}
              >
                <span>{fac.name}</span>
                <span className="block-arrow">{isSelected ? '✓ Selected' : '→'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Openings Section */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem', fontWeight: 800 }}>
            {selectedFaculty ? `Openings under ${selectedFaculty.name}` : 'All Active Teaching Openings'}
          </h3>
          {selectedFaculty && (
            <button
              onClick={() => setSelectedFaculty(null)}
              style={{ background: 'none', border: 'none', color: '#0f766e', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}
            >
              Show All Faculties
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            <p style={{ fontWeight: 600 }}>Loading teaching vacancies...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '12px', color: '#b91c1c' }}>
            ⚠️ Failed to load vacancies: {error}
          </div>
        ) : displayedVacancies.length === 0 ? (
          <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '16px', padding: '36px 24px', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#0f3b46', fontSize: '1.15rem', fontWeight: 800 }}>
              No active teaching vacancies found {selectedFaculty ? `for ${selectedFaculty.name}` : ''}.
            </h4>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
              Would you like us to notify you when new faculty positions open?
            </p>
            <button
              onClick={() => handleOpenInterest(selectedFaculty?.name || 'Academic Faculty')}
              style={{
                backgroundColor: '#0f766e',
                color: '#ffffff',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Notify Me When Open
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
            {displayedVacancies.map((job) => (
              <div
                key={job.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 800 }}>
                      TEACHING
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                      {job.vacancyNumber || 'VAC-2026'}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1.1rem', fontWeight: 800 }}>
                    {job.position}
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '12px' }}>
                    Department: {job.department}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
                    <div><strong>Deadline:</strong> {new Date(job.deadline).toLocaleDateString('en-IN')}</div>
                    <div><strong>Positions:</strong> {job.numPositions}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: '#334155',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer'
                    }}
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => navigate(`/apply?jobId=${job.id}`)}
                    style={{
                      flex: 1,
                      backgroundColor: '#0f766e',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer'
                    }}
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InterestModal
        isOpen={interestModalOpen}
        onClose={() => setInterestModalOpen(false)}
        defaultCategory="TEACHING"
        defaultPosition={modalFacultyName}
      />
    </div>
  );
}

export default TeachingPositions;
