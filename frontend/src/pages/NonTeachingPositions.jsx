import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NON_TEACHING_DIVISIONS = [
  { id: 'admin-registrar', name: 'ADMINISTRATIVE & REGISTRAR OFFICE' },
  { id: 'systems-it', name: 'SYSTEMS & IT INFRASTRUCTURE' },
  { id: 'technical-labs', name: 'TECHNICAL & LABORATORY ASSISTANTS' },
  { id: 'finance-accounts', name: 'FINANCE & ACCOUNTS DEPARTMENT' },
  { id: 'library-services', name: 'LIBRARY & INFORMATION SERVICES' },
  { id: 'executive-secretarial', name: 'EXECUTIVE & SECRETARIAL SUPPORT' }
];

function NonTeachingPositions() {
  const navigate = useNavigate();

  const handleSelectDivision = (divisionName) => {
    navigate(`/apply?faculty=${encodeURIComponent(divisionName)}&type=NON_TEACHING`);
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
          Explore administrative and technical career opportunities at D Y Patil International University
        </p>
      </div>

      {/* Vertical Form Blocks - Deep Blue Theme for Non-Teaching */}
      <div className="vertical-card-container container-non-teaching">
        <div className="vertical-prompt-text">
          Please select a Division below to apply:
        </div>

        <div className="vertical-blocks-list">
          {NON_TEACHING_DIVISIONS.map((div) => (
            <div
              key={div.id}
              onClick={() => handleSelectDivision(div.name)}
              className="vertical-block-item block-blue"
            >
              <span>{div.name}</span>
              <span className="block-arrow">&rarr;</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NonTeachingPositions;
