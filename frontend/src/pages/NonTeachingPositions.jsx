import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import InterestModal from '../components/InterestModal';

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

  // Interest Modal state
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [selectedDivisionName, setSelectedDivisionName] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSelectDivision = async (divisionName) => {
    setChecking(true);
    try {
      // Check if there is an active open vacancy for this division
      const res = await fetch(`${API_BASE_URL}/public/vacancies?category=NON_TEACHING&school=${encodeURIComponent(divisionName)}`);
      const vacancies = await res.json();

      if (Array.isArray(vacancies) && vacancies.length > 0) {
        // Open vacancy exists -> Proceed to Apply
        const openJob = vacancies[0];
        navigate(`/apply?faculty=${encodeURIComponent(divisionName)}&type=NON_TEACHING&jobId=${openJob.id}`);
      } else {
        // No open vacancy -> Show interest registration modal ("We will reach you when vacancies open")
        setSelectedDivisionName(divisionName);
        setInterestModalOpen(true);
      }
    } catch (err) {
      console.error('Error checking division vacancy:', err);
      // Fallback navigate
      navigate(`/apply?faculty=${encodeURIComponent(divisionName)}&type=NON_TEACHING`);
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
          {checking ? 'Checking active vacancies...' : 'Please select a Division below to apply:'}
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

      {/* Interest Registration Modal */}
      <InterestModal
        isOpen={interestModalOpen}
        onClose={() => setInterestModalOpen(false)}
        defaultCategory="NON_TEACHING"
        defaultPosition={`Non-Teaching Position – ${selectedDivisionName}`}
      />
    </div>
  );
}

export default NonTeachingPositions;
