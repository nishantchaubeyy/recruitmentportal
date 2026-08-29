import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import InterestModal from './InterestModal';

function VacancySlider() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Interest Modal state
  const [interestModalOpen, setInterestModalOpen] = useState(false);

  useEffect(() => {
    fetchOpenVacancies();
  }, []);

  const fetchOpenVacancies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/public/vacancies');
      setVacancies(data || []);
    } catch (err) {
      console.error('Fetch slider vacancies error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkScrollButtons = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [vacancies]);

  const slide = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = 360;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScrollButtons, 350);
    }
  };

  return (
    <section style={{ backgroundColor: '#f8fafc', padding: '40px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
      <div className="container" style={{ maxWidth: '1040px', padding: '0 24px' }}>
        
        {/* Section Title & Nav Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '8px' }}>
              CURRENTLY OPEN VACANCIES
            </div>
            <h2 style={{ margin: 0, color: '#0f3b46', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
              Explore Active Opportunities
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.92rem' }}>
              Slide through all positions currently accepting applications at DYPIU
            </p>
          </div>

          {/* Slider Arrow Controls */}
          {vacancies.length > 0 && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => slide('left')}
                disabled={!canScrollLeft}
                style={{
                  ...arrowBtnStyle,
                  opacity: canScrollLeft ? 1 : 0.4,
                  cursor: canScrollLeft ? 'pointer' : 'default'
                }}
                aria-label="Previous vacancy"
              >
                ‹
              </button>

              <button
                onClick={() => slide('right')}
                disabled={!canScrollRight}
                style={{
                  ...arrowBtnStyle,
                  opacity: canScrollRight ? 1 : 0.4,
                  cursor: canScrollRight ? 'pointer' : 'default'
                }}
                aria-label="Next vacancy"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loading active vacancy slider...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px 20px', borderRadius: '12px', color: '#b91c1c', fontSize: '0.9rem' }}>
            ⚠️ Failed to load open vacancies: {error}
          </div>
        ) : vacancies.length === 0 ? (
          /* Empty State Card */
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px border-dashed #cbd5e1',
            borderRadius: '16px',
            padding: '36px 24px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f3b46', fontSize: '1.2rem', fontWeight: 800 }}>
              No vacancies are currently open.
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
              Would you like us to notify you when new teaching or non-teaching positions become available?
            </p>
            <button
              onClick={() => setInterestModalOpen(true)}
              style={{
                backgroundColor: '#0f766e',
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
          /* SLIDER CONTAINER */
          <div
            ref={sliderRef}
            onScroll={checkScrollButtons}
            style={{
              display: 'flex',
              gap: '20px',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              paddingBottom: '12px',
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none'  // IE/Edge
            }}
            className="no-scrollbar"
          >
            {vacancies.map((job) => (
              <div
                key={job.id}
                style={{
                  flex: '0 0 340px',
                  scrollSnapAlign: 'start',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                <div>
                  {/* Category Badge & Ref */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{
                      backgroundColor: job.type === 'TEACHING' ? '#ccfbf1' : '#e0e7ff',
                      color: job.type === 'TEACHING' ? '#0f766e' : '#3730a3',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      letterSpacing: '0.5px'
                    }}>
                      {job.type}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                      {job.vacancyNumber || 'VAC-2026'}
                    </span>
                  </div>

                  {/* Position Title */}
                  <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.18rem', fontWeight: 800, lineHeight: '1.3' }}>
                    {job.position}
                  </h3>

                  {/* Department */}
                  <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '14px' }}>
                    Department: {job.department}
                  </div>

                  {/* Quick details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: '#64748b', marginBottom: '18px' }}>
                    <div><strong>Location:</strong> {job.location || 'Pune'}</div>
                    <div><strong>Type:</strong> {job.employmentType || 'Full Time'} ({job.numPositions} Opening{job.numPositions > 1 ? 's' : ''})</div>
                    <div><strong>Deadline:</strong> {new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: '#334155',
                      padding: '9px 12px',
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
                      backgroundColor: job.type === 'TEACHING' ? '#0f766e' : '#0f2b5c',
                      color: '#ffffff',
                      border: 'none',
                      padding: '9px 12px',
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
      />
    </section>
  );
}

const arrowBtnStyle = {
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontSize: '1.4rem',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  lineHeight: 1
};

export default VacancySlider;
