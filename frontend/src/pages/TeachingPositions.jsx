import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import InterestModal from '../components/InterestModal';

function TeachingPositions() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedSchool, setSelectedSchool] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Interest Modal state
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState('');

  useEffect(() => {
    fetchSchools();
    fetchVacancies();
  }, []);

  const fetchSchools = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/public/schools?type=TEACHING`);
      if (res.ok) {
        const data = await res.json();
        setSchools(data);
      }
    } catch (err) {
      console.error('Failed to fetch teaching schools:', err);
    }
  };

  const fetchVacancies = async (schoolFilter = '', search = '') => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/public/vacancies?category=TEACHING`;
      if (schoolFilter) url += `&school=${encodeURIComponent(schoolFilter)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Unable to load open teaching vacancies.');
      }
      const data = await res.json();
      setVacancies(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolChange = (e) => {
    const val = e.target.value;
    setSelectedSchool(val);
    fetchVacancies(val, searchQuery);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchVacancies(selectedSchool, val);
  };

  const openNotifyModal = (posTitle = '') => {
    setModalPosition(posTitle || 'Teaching Faculty Position');
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
          <h2 style={{ color: '#0f766e', margin: 0, fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
            Teaching Vacancies
          </h2>
          <p style={{ color: '#64748b', margin: '6px 0 0 0', fontSize: '0.95rem' }}>
            Explore active academic faculty career opportunities at D Y Patil International University
          </p>
        </div>

        <button
          onClick={() => openNotifyModal()}
          style={{
            backgroundColor: '#ffffff',
            border: '1.5px solid #0f766e',
            color: '#0f766e',
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

      {/* Filter Bar */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '18px 20px',
        marginBottom: '30px',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: '1 1 240px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
            FILTER BY SCHOOL / FACULTY
          </label>
          <select
            value={selectedSchool}
            onChange={handleSchoolChange}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              backgroundColor: '#ffffff',
              color: '#0f172a'
            }}
          >
            <option value="">All Teaching Schools</option>
            {schools.map((sch) => (
              <option key={sch.id} value={sch.name}>{sch.name}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 280px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
            SEARCH POSITION OR SKILLS
          </label>
          <input
            type="text"
            placeholder="e.g. Assistant Professor, Computer Science..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Vacancy Listing Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ fontWeight: 600 }}>Loading active teaching vacancies...</p>
        </div>
      ) : error ? (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '20px', borderRadius: '12px', color: '#b91c1c', textAlign: 'center' }}>
          <p style={{ fontWeight: 700, margin: '0 0 8px 0' }}>⚠️ Unable to load vacancies</p>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
        </div>
      ) : vacancies.length === 0 ? (
        /* Empty State */
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px border-dashed #cbd5e1',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#0f3b46', fontSize: '1.25rem', fontWeight: 800 }}>
            No teaching positions are currently open.
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
            We regularly update our faculty requirements. Register your interest below and we will notify you immediately when a suitable position becomes available.
          </p>
          <button
            onClick={() => openNotifyModal()}
            style={{
              backgroundColor: '#0f766e',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            Notify Me When Open
          </button>
        </div>
      ) : (
        /* Dynamic Vacancy Blocks Grid */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {vacancies.map((vacancy) => (
            <div
              key={vacancy.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '24px 28px',
                boxShadow: '0 4px 12px rgba(15,23,42,0.03)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '20px',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div style={{ flex: '1 1 400px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{
                    backgroundColor: '#ccfbf1',
                    color: '#0f766e',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px'
                  }}>
                    {vacancy.type}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                    Ref: {vacancy.vacancyNumber}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.25rem', fontWeight: 800 }}>
                  {vacancy.position}
                </h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: '#475569', fontSize: '0.88rem', fontWeight: 500 }}>
                  <span>🏛️ {vacancy.department}</span>
                  <span>📍 {vacancy.location || 'Pune'}</span>
                  <span>⏱️ {vacancy.employmentType || 'Full Time'}</span>
                </div>

                <div style={{ marginTop: '12px', fontSize: '0.84rem', color: '#64748b' }}>
                  <strong>Application Deadline:</strong> {new Date(vacancy.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => navigate(`/jobs/${vacancy.id}`)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#334155',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  View Details
                </button>

                <button
                  onClick={() => navigate(`/apply?jobId=${vacancy.id}`)}
                  style={{
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
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

      {/* Interest Registration Modal */}
      <InterestModal
        isOpen={interestModalOpen}
        onClose={() => setInterestModalOpen(false)}
        defaultCategory="TEACHING"
        defaultPosition={modalPosition}
      />
    </div>
  );
}

export default TeachingPositions;
