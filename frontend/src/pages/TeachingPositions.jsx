import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import DYPIUWatermark from '../components/DYPIUWatermark';

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
  const [schoolsData, setSchoolsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSchoolId, setExpandedSchoolId] = useState(null);

  useEffect(() => {
    fetchTeachingData();
  }, []);

  const fetchTeachingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vacanciesData, schoolsList] = await Promise.all([
        apiRequest('/public/vacancies').catch(() => []),
        apiRequest('/public/schools?type=TEACHING').catch(() => [])
      ]);

      const teachingJobs = (vacanciesData || []).filter((j) => j.type === 'TEACHING');
      setVacancies(teachingJobs);
      setSchoolsData(Array.isArray(schoolsList) ? schoolsList : []);
    } catch (err) {
      console.error('Error fetching teaching positions data:', err);
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

  const getMatchedSchool = (fac) => {
    return schoolsData.find((s) => {
      if (s.id === fac.id) return true;
      const sName = (s.name || '').toLowerCase().trim();
      const fName = (fac.name || '').toLowerCase().trim();
      return sName === fName || sName.includes(fName) || fName.includes(sName);
    });
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
            Teaching Positions
          </h1>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8B1235' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            <p style={{ fontWeight: 600 }}>Loading teaching positions...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '12px', color: '#b91c1c' }}>
            Failed to load positions: {error}
          </div>
        ) : (
          /* Vertical Container with Red Blocks */
          <div className="vertical-card-container container-teaching">
            <div className="vertical-prompt-text" style={{ color: '#8B1235' }}>PLEASE CHOOSE FACULTY/DEPARTMENT BELOW:</div>

            <div className="vertical-blocks-list">
              {TEACHING_FACULTIES.map((fac) => (
                <div key={fac.id} style={{ marginBottom: '12px' }}>
                  {/* Full-Width Red Block Button - Direct Transfer to Application Form */}
                  <div
                    className="vertical-block-item block-teal"
                    onClick={() => navigate(`/apply?faculty=${encodeURIComponent(fac.name)}&type=TEACHING`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>{fac.name}</span>
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

export default TeachingPositions;
