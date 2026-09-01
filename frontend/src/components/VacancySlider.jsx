import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import InterestModal from './InterestModal';

function VacancySlider() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');

  // Slider reference and state
  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

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
      console.error('Fetch vacancies error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format system types (e.g. NON_TEACHING -> Non-Teaching)
  const formatTypeLabel = (typeStr) => {
    if (!typeStr) return 'General';
    if (typeStr === 'TEACHING') return 'Teaching';
    if (typeStr === 'NON_TEACHING') return 'Non-Teaching';
    return typeStr.charAt(0).toUpperCase() + typeStr.slice(1).toLowerCase().replace('_', '-');
  };

  const filteredVacancies = vacancies.filter((job) => {
    if (activeTab === 'ALL') return true;
    return job.type === activeTab;
  });

  const checkScroll = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    const cardWidth = 350 + 24; // card width + gap
    const index = Math.round(scrollLeft / cardWidth);
    setActiveIndex(index);
  };

  const slideLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -374, behavior: 'smooth' });
    }
  };

  const slideRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 374, behavior: 'smooth' });
    }
  };

  const scrollToIndex = (index) => {
    if (sliderRef.current) {
      const cardWidth = 350 + 24;
      sliderRef.current.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkScroll();
  }, [filteredVacancies]);

  return (
    <section style={{ backgroundColor: '#ffffff', padding: '96px 0 64px' }}>
      <div className="container" style={{ maxWidth: '1160px', padding: '0 24px', margin: '0 auto' }}>
        
        {/* 🎯 CENTER-ALIGNED SECTION HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{
            margin: 0,
            color: '#0f172a',
            fontSize: 'clamp(2rem, 4.5vw, 2.75rem)',
            fontWeight: 900,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            lineHeight: 1.15
          }}>
            VACANCIES OPENED
          </h2>

          {/* Filter Tabs & Carousel Navigation Controls */}
          {vacancies.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginTop: '28px'
            }}>
              {/* Filter Tabs */}
              <div style={{
                display: 'inline-flex',
                gap: '6px',
                backgroundColor: '#f8fafc',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <button
                  onClick={() => setActiveTab('ALL')}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '7px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'ALL' ? '#ffffff' : 'transparent',
                    color: activeTab === 'ALL' ? '#0f172a' : '#64748b',
                    boxShadow: activeTab === 'ALL' ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  All ({vacancies.length})
                </button>

                <button
                  onClick={() => setActiveTab('TEACHING')}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '7px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'TEACHING' ? '#ffffff' : 'transparent',
                    color: activeTab === 'TEACHING' ? '#0f172a' : '#64748b',
                    boxShadow: activeTab === 'TEACHING' ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Teaching ({vacancies.filter(v => v.type === 'TEACHING').length})
                </button>

                <button
                  onClick={() => setActiveTab('NON_TEACHING')}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '7px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'NON_TEACHING' ? '#ffffff' : 'transparent',
                    color: activeTab === 'NON_TEACHING' ? '#0f172a' : '#64748b',
                    boxShadow: activeTab === 'NON_TEACHING' ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Non-Teaching ({vacancies.filter(v => v.type === 'NON_TEACHING').length})
                </button>
              </div>

              {/* Slider Prev / Next Arrow Controls */}
              {filteredVacancies.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={slideLeft}
                    disabled={!canScrollLeft}
                    aria-label="Previous Vacancies"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: canScrollLeft ? '#0f172a' : '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: canScrollLeft ? 'pointer' : 'default',
                      boxShadow: canScrollLeft ? '0 2px 8px rgba(15,23,42,0.08)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>

                  <button
                    onClick={slideRight}
                    disabled={!canScrollRight}
                    aria-label="Next Vacancies"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: canScrollRight ? '#0f172a' : '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: canScrollRight ? 'pointer' : 'default',
                      boxShadow: canScrollRight ? '0 2px 8px rgba(15,23,42,0.08)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loading active vacancies...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px 20px', borderRadius: '12px', color: '#b91c1c', fontSize: '0.9rem', textAlign: 'center' }}>
            ⚠️ Failed to load active vacancies: {error}
          </div>
        ) : filteredVacancies.length === 0 ? (
          /* Empty State Card */
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '44px 24px',
            textAlign: 'center',
            maxWidth: '580px',
            margin: '0 auto'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.15rem', fontWeight: 800 }}>
              No vacancies currently available for this filter.
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '22px' }}>
              Would you like us to notify you as soon as new positions open up?
            </p>
            <button
              onClick={() => setInterestModalOpen(true)}
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(15,23,42,0.12)'
              }}
            >
              Notify Me When Open
            </button>
          </div>
        ) : (
          /* 🎠 HORIZONTAL SLIDER CAROUSEL TRACK */
          <div style={{ position: 'relative' }}>
            <div
              ref={sliderRef}
              onScroll={checkScroll}
              style={{
                display: 'flex',
                gap: '24px',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'smooth',
                padding: '12px 4px 24px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
              className="vacancy-carousel-track"
            >
              {filteredVacancies.map((job) => (
                <div
                  key={job.id}
                  style={{
                    flex: '0 0 350px',
                    maxWidth: '350px',
                    scrollSnapAlign: 'start',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '18px',
                    padding: '24px',
                    boxShadow: '0 4px 16px rgba(15,23,42,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative'
                  }}
                  className="vacancy-card-hover"
                >
                  <div>
                    {/* TOP ROW: Minimalist Tag (Left) & Ref Code (Right) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        color: job.type === 'TEACHING' ? '#047857' : '#c2410c',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        letterSpacing: '0.2px'
                      }}>
                        {formatTypeLabel(job.type)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>
                        {job.vacancyNumber || 'VAC-2026-001'}
                      </span>
                    </div>

                    {/* JOB TITLE */}
                    <h3
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      style={{
                        margin: '0 0 6px 0',
                        color: '#0f172a',
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        lineHeight: '1.35',
                        cursor: 'pointer',
                        transition: 'color 0.2s ease'
                      }}
                      className="job-title-link"
                    >
                      {job.position}
                    </h3>

                    {/* DEPARTMENT */}
                    <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600, marginBottom: '18px' }}>
                      {job.department || 'DYPIU Department'}
                    </div>

                    {/* INLINE ICON METADATA (16px Outline Lucide SVGs) */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #f1f5f9',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      marginBottom: '20px',
                      fontSize: '0.84rem',
                      color: '#334155'
                    }}>
                      {/* Location Pin Icon */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span style={{ fontWeight: 600 }}>{job.location || 'Pune Campus'}</span>
                      </div>

                      {/* Briefcase Icon */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                        <span style={{ fontWeight: 600 }}>
                          {job.employmentType || 'Full Time'} ({job.numPositions || 1} Opening{job.numPositions > 1 ? 's' : ''})
                        </span>
                      </div>

                      {/* Calendar Icon */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span style={{ fontWeight: 600 }}>
                          Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Open until filled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER ACTIONS (Secondary Ghost/Border & Solid Primary CTA) */}
                  <div style={{ display: 'flex', gap: '10px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      style={{
                        flex: 1,
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        padding: '9px 14px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      className="btn-secondary-hover"
                    >
                      View Details
                    </button>

                    <button
                      onClick={() => navigate(`/apply?jobId=${job.id}`)}
                      style={{
                        flex: 1,
                        backgroundColor: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '9px 16px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(15,23,42,0.12)',
                        transition: 'all 0.2s ease'
                      }}
                      className="btn-primary-hover"
                    >
                      Apply Now
                    </button>
                  </div>

                </div>
              ))}
            </div>

            {/* Slider Dots Indicator */}
            {filteredVacancies.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
                {filteredVacancies.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    style={{
                      width: activeIndex === i ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: activeIndex === i ? '#0f2b5c' : '#cbd5e1',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      padding: 0
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 🔻 SECTION FOOTER BUTTON: View All Openings → */}
        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          <button
            onClick={() => navigate('/teaching')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15,23,42,0.15)',
              transition: 'all 0.2s ease'
            }}
            className="view-all-btn-hover"
          >
            <span>View All Openings</span>
            <span>&rarr;</span>
          </button>
        </div>

      </div>

      <InterestModal
        isOpen={interestModalOpen}
        onClose={() => setInterestModalOpen(false)}
      />
    </section>
  );
}

export default VacancySlider;
