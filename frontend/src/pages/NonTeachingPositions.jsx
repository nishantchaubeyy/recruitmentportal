import React from 'react';
import { useNavigate } from 'react-router-dom';
import PositionsExplorer from '../components/PositionsExplorer';

function NonTeachingPositions() {
  const navigate = useNavigate();

  return (
    <div className="page-watermark-wrapper" style={{ minHeight: '85vh', position: 'relative' }}>

      <div className="container" style={{ maxWidth: '1200px', padding: '30px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: '#721b28',
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

        {/* Non-Teaching Positions Explorer */}
        <PositionsExplorer 
          category="nonteaching" 
          title="Non Teaching Positions" 
          subtitle="PLEASE CHOOSE DEPARTMENT BELOW:" 
        />
      </div>
    </div>
  );
}

export default NonTeachingPositions;
