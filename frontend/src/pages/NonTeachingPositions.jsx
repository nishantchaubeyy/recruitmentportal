import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import InterestModal from '../components/InterestModal';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);

  // Interest Modal state
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [modalDivisionName, setModalDivisionName] = useState('');

  useEffect(() => {
    fetchNonTeachingVacancies();
  }, []);

  const fetchNonTeachingVacancies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/public/vacancies');
      const nonTeachingJobs = (data || []).filter((j) => j.type === 'NON_TEACHING');
      setVacancies(nonTeachingJobs);
    } catch (err) {
      console.error('Error fetching non-teaching vacancies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDivision = (div) => {
    if (selectedDivision?.id === div.id) {
      setSelectedDivision(null); // Toggle off filter
    } else {
      setSelectedDivision(div);
    }
  };

  // Smart multi-token filter for division matching
  const displayedVacancies = selectedDivision
    ? vacancies.filter((job) => {
        const dept = (job.department || '').toLowerCase();
        const schoolName = (job.school?.name || '').toLowerCase();
        const pos = (job.position || '').toLowerCase();

        const stopWords = ['school', 'faculty', 'department', 'division', 'office', 'services', 'and', 'the', 'for'];
        const targetTokens = (selectedDivision.name + ' ' + (selectedDivision.keyword || ''))
          .toLowerCase()
          .replace(/[^\w\s]/gi, ' ')
          .split(/\s+/)
          .filter((t) => t.length > 2 && !stopWords.includes(t));

        const targetText = `${dept} ${schoolName} ${pos}`.toLowerCase();
        return targetTokens.some((token) => targetText.includes(token));
      })
    : vacancies;

  const handleOpenInterest = (divName) => {
    setModalDivisionName(divName);
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
        <h2 style={{ color: '#0f2b5c', margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
          Non-Teaching Positions
        </h2>
        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
          Explore administrative, technical, and staff career opportunities at D Y Patil International University
        </p>
      </div>

      {/* Division Selection Blocks - Deep Blue Theme */}
      <div className="vertical-card-container container-non-teaching" style={{ marginBottom: '35px' }}>
        <div className="vertical-prompt-text">
          {selectedDivision
            ? `Filter applied: ${selectedDivision.name} (Click again to clear)`
            : 'Select a Division below to view matching active openings:'}
        </div>

        <div className="vertical-blocks-list">
          {NON_TEACHING_DIVISIONS.map((div) => {
            const isSelected = selectedDivision?.id === div.id;
            return (
              <div
                key={div.id}
                onClick={() => handleSelectDivision(div)}
                className={`vertical-block-item block-blue ${isSelected ? 'selected' : ''}`}
                style={isSelected ? { border: '2px solid #0f2b5c', backgroundColor: '#e0e7ff' } : {}}
              >
                <span>{div.name}</span>
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
            {selectedDivision ? `Openings under ${selectedDivision.name}` : 'All Active Non-Teaching Openings'}
          </h3>
          {selectedDivision && (
            <button
              onClick={() => setSelectedDivision(null)}
              style={{ background: 'none', border: 'none', color: '#0f2b5c', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}
            >
              Show All Divisions
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            <p style={{ fontWeight: 600 }}>Loading non-teaching vacancies...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '12px', color: '#b91c1c' }}>
            ⚠️ Failed to load vacancies: {error}
          </div>
        ) : displayedVacancies.length === 0 ? (
          <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '16px', padding: '36px 24px', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#0f3b46', fontSize: '1.15rem', fontWeight: 800 }}>
              No active non-teaching vacancies found {selectedDivision ? `for ${selectedDivision.name}` : ''}.
            </h4>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
              Would you like us to notify you when new administrative/technical positions open?
            </p>
            <button
              onClick={() => handleOpenInterest(selectedDivision?.name || 'Staff / Non-Teaching')}
              style={{
                backgroundColor: '#0f2b5c',
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
                    <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 800 }}>
                      NON-TEACHING
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
                      backgroundColor: '#0f2b5c',
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
        defaultCategory="NON_TEACHING"
        defaultPosition={modalDivisionName}
      />
    </div>
  );
}

export default NonTeachingPositions;
