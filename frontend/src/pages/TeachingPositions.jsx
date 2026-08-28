import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

  const handleSelectFaculty = (facultyName) => {
    navigate(`/apply?faculty=${encodeURIComponent(facultyName)}&type=TEACHING`);
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
          Please select a Faculty below to apply:
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
    </div>
  );
}

export default TeachingPositions;
