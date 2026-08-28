import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import InterestModal from '../components/InterestModal';

const DEFAULT_NON_TEACHING_CATEGORIES = [
  { id: 'admin', name: 'University Administrative Positions' },
  { id: 'it', name: 'Systems & IT Infrastructure' },
  { id: 'media', name: 'Branding, Media & Photography' },
  { id: 'civil', name: 'Civil Infrastructure & Estate Engineering' },
  { id: 'lab', name: 'Technical & Laboratory Assistants' },
  { id: 'finance', name: 'Finance & Accounts Department' },
  { id: 'library', name: 'Library & Information Services' }
];

function NonTeachingPositions() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Interest Modal state
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState('');

  useEffect(() => {
    fetchNonTeachingVacancies();
  }, []);

  const fetchNonTeachingVacancies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/public/vacancies?category=NON_TEACHING`);
      if (!res.ok) {
        throw new Error('Unable to load non-teaching vacancies.');
      }
      const data = await res.json();
      setVacancies(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openNotifyModal = (posTitle = '') => {
    setModalPosition(posTitle || 'Non-Teaching Position');
    setInterestModalOpen(true);
  };

  return (
    <div className="container" style={{ maxWidth: '1040px', padding: '30px 24px' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ fontSize: '0.9rem', color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>
          &larr; Back to Home
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ color: '#0f2b5c', margin: 0, fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
            Non-Teaching Staff Opportunities
          </h2>
          <p style={{ color: '#64748b', margin: '6px 0 0 0', fontSize: '0.95rem' }}>
            Explore administrative, technical, design, and operational vacancies at D Y Patil International University
          </p>
        </div>

        <button
          onClick={() => openNotifyModal()}
          style={{
            backgroundColor: '#ffffff',
            border: '1.5px solid #0f2b5c',
            color: '#0f2b5c',
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🔔</span>
          <span>Notify Me When Open</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ fontWeight: 600 }}>Loading non-teaching vacancies...</p>
        </div>
      ) : error ? (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '20px', borderRadius: '12px', color: '#b91c1c', textAlign: 'center' }}>
          <p style={{ fontWeight: 700, margin: '0 0 8px 0' }}>⚠️ Unable to load vacancies</p>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
        </div>
      ) : (
        <div>
          {/* OPEN VACANCIES SECTION */}
          <div style={{ marginBottom: '35px' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#0f2b5c', fontWeight: 800, marginBottom: '16px' }}>
              Currently Open Vacancies ({vacancies.length})
            </h3>

            {vacancies.length === 0 ? (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px border-dashed #cbd5e1',
                borderRadius: '16px',
                padding: '36px 24px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#64748b', margin: '0 0 16px 0', fontSize: '0.95rem' }}>
                  No non-teaching positions are currently accepting applications.
                </p>
                <button
                  onClick={() => openNotifyModal()}
                  style={{
                    backgroundColor: '#0f2b5c',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Notify Me When Open
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {vacancies.map((vac) => {
                  const isExpanded = expandedId === vac.id;
                  return (
                    <div
                      key={vac.id}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(15,23,42,0.03)'
                      }}
                    >
                      {/* Accordion Bar Header */}
                      <div
                        onClick={() => toggleExpand(vac.id)}
                        style={{
                          padding: '18px 24px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? '#f8fafc' : '#ffffff'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <span style={{
                              backgroundColor: '#e0e7ff',
                              color: '#3730a3',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}>
                              OPEN VACANCY
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Ref: {vac.vacancyNumber}</span>
                          </div>
                          <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem', fontWeight: 800 }}>
                            {vac.position}
                          </h4>
                          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                            {vac.department} • Deadline: {new Date(vac.deadline).toLocaleDateString()}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/apply?jobId=${vac.id}`);
                            }}
                            style={{
                              backgroundColor: '#0f2b5c',
                              color: '#ffffff',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            Apply Now
                          </button>
                          <span style={{ fontSize: '1.4rem', color: '#64748b', fontWeight: 700, width: '24px', textAlign: 'center' }}>
                            {isExpanded ? '−' : '+'}
                          </span>
                        </div>
                      </div>

                      {/* Accordion Expanded Content */}
                      {isExpanded && (
                        <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', fontSize: '0.9rem', color: '#334155' }}>
                            <div>
                              <strong>Qualification:</strong> {vac.qualification}
                            </div>
                            <div>
                              <strong>Experience:</strong> {vac.experience}
                            </div>
                            <div>
                              <strong>Skills:</strong> {vac.skills || 'N/A'}
                            </div>
                            <div>
                              <strong>Pay Scale:</strong> {vac.salaryScale || 'As per norms'}
                            </div>
                          </div>

                          <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.6', marginBottom: '20px' }}>
                            <strong>Job Description:</strong> {vac.description}
                          </div>

                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                              onClick={() => navigate(`/jobs/${vac.id}`)}
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#334155',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                              }}
                            >
                              View Full Details
                            </button>
                            <button
                              onClick={() => navigate(`/apply?jobId=${vac.id}`)}
                              style={{
                                backgroundColor: '#0f2b5c',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 20px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                              }}
                            >
                              Apply Now
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ALL NON-TEACHING DEPARTMENTS & INTEREST REGISTRATION LIST */}
          <div style={{ marginTop: '40px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#0f2b5c', fontWeight: 800, marginBottom: '14px' }}>
              University Non-Teaching Staff Categories
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
              Select any category below to express interest for future non-teaching openings:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DEFAULT_NON_TEACHING_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                    {cat.name}
                  </span>
                  <button
                    onClick={() => openNotifyModal(cat.name)}
                    style={{
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#0f2b5c',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Notify Me When Open
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interest Registration Modal */}
      <InterestModal
        isOpen={interestModalOpen}
        onClose={() => setInterestModalOpen(false)}
        defaultCategory="NON_TEACHING"
        defaultPosition={modalPosition}
      />
    </div>
  );
}

export default NonTeachingPositions;
