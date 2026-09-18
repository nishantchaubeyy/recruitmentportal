import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import DYPIUWatermark from '../components/DYPIUWatermark';

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

  const getMatchedDivision = (div) => {
    return schoolsData.find((s) => {
      if (s.id === div.id) return true;
      const sName = (s.name || '').toLowerCase().trim();
      const dName = (div.name || '').toLowerCase().trim();
      return sName === dName || sName.includes(dName) || dName.includes(sName);
    });
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
    <div className="page-watermark-wrapper">
      <DYPIUWatermark top="15px" />
      <div className="container" style={{ maxWidth: '980px', padding: '30px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '20px' }}>
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

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{
            color: '#8B1235',
            margin: 0,
            fontSize: '2.3rem',
            fontWeight: 800,
            fontFamily: "'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville', Georgia, serif",
            letterSpacing: '-0.5px',
            lineHeight: 1.15
          }}>
            Non-Teaching Positions
          </h1>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8B1235' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            <p style={{ fontWeight: 600 }}>Loading non-teaching positions...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '12px', color: '#b91c1c' }}>
            Failed to load positions: {error}
          </div>
        ) : (
          /* Vertical Container with Red Blocks */
          <div className="vertical-card-container container-non-teaching">
            <div className="vertical-prompt-text" style={{ color: '#8B1235' }}>PLEASE CHOOSE DIVISION/DEPARTMENT BELOW:</div>

            <div className="vertical-blocks-list">
              {NON_TEACHING_DIVISIONS.map((div) => (
                <div key={div.id} style={{ marginBottom: '12px' }}>
                  {/* Full-Width Red Block Button - Direct Transfer to Application Form */}
                  <div
                    className="vertical-block-item block-blue"
                    onClick={() => navigate(`/apply?faculty=${encodeURIComponent(div.name)}&type=NON_TEACHING`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>{div.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NonTeachingPositions;
