import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import InterestModal from '../components/InterestModal';

const TEACHING_FACULTIES = [
  { id: 'cs-engg', name: 'FACULTY OF COMPUTER SCIENCE & ENGINEERING' },
  { id: 'management', name: 'FACULTY OF MANAGEMENT' },
  { id: 'bioengineering', name: 'FACULTY OF BIOSCIENCES & BIOENGINEERING' },
  { id: 'design', name: 'FACULTY OF ARCHITECTURE & DESIGN' },
  { id: 'media-communication', name: 'FACULTY OF MEDIA & COMMUNICATION' },
  { id: 'pharmacy', name: 'FACULTY OF PHARMACY' },
  { id: 'liberal-arts', name: 'FACULTY OF HUMANITIES & SOCIAL SCIENCES' },
  { id: 'research-centres', name: 'RESEARCH CENTRES' }
];

function TeachingPositions() {
  const navigate = useNavigate();

  // Interest Modal state
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [selectedFacultyName, setSelectedFacultyName] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSelectFaculty = async (facultyName) => {
    setChecking(true);
    try {
      // Check if there is an active open vacancy for this faculty
      const res = await fetch(`${API_BASE_URL}/public/vacancies?category=TEACHING&school=${encodeURIComponent(facultyName)}`);
      const vacancies = await res.json();

      if (Array.isArray(vacancies) && vacancies.length > 0) {
        // Open vacancy exists -> Proceed to Apply
        const openJob = vacancies[0];
        navigate(`/apply?faculty=${encodeURIComponent(facultyName)}&type=TEACHING&jobId=${openJob.id}`);
      } else {
        // No open vacancy -> Show interest registration modal ("We will reach you when vacancies open")
        setSelectedFacultyName(facultyName);
        setInterestModalOpen(true);
      }
    } catch (err) {
      console.error('Error checking faculty vacancy:', err);
      // Fallback navigate
      navigate(`/apply?faculty=${encodeURIComponent(facultyName)}&type=TEACHING`);
    } finally {
      setChecking(false);
    }
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

      {/* Vertical Form Blocks - Teal Green Theme for Teaching */}
      <div className="vertical-card-container container-teaching">
        <div className="vertical-prompt-text">
          {checking ? 'Checking active vacancies...' : 'Please select a Faculty below to apply:'}
        </div>

        <div className="vertical-blocks-list">
          {TEACHING_FACULTIES.map((fac) => (
            <div
              key={fac.id}
              onClick={() => handleSelectFaculty(fac.name)}
              className="vertical-block-item block-teal"
            >
              <span>{fac.name}</span>
              <span className="block-arrow">&rarr;</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interest Registration Modal */}
      <InterestModal
        isOpen={interestModalOpen}
        onClose={() => setInterestModalOpen(false)}
        defaultCategory="TEACHING"
        defaultPosition={`Faculty Position – ${selectedFacultyName}`}
      />
    </div>
  );
}

export default TeachingPositions;
