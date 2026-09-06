import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import InterestModal from './InterestModal';
import VacancyPoster from './VacancyPoster';

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

  const filteredVacancies = vacancies.filter((job) => {
    if (activeTab === 'ALL') return true;
    return job.type === activeTab;
  });

  const checkScroll = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    const posterElement = sliderRef.current.firstElementChild;
    const posterWidth = posterElement ? posterElement.clientWidth + 32 : 882;
    const index = Math.round(scrollLeft / posterWidth);
    setActiveIndex(index);
  };

  const slideLeft = () => {
    if (sliderRef.current) {
      const posterElement = sliderRef.current.firstElementChild;
      const scrollAmount = posterElement ? posterElement.clientWidth + 32 : 882;
      sliderRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const slideRight = () => {
    if (sliderRef.current) {
      const posterElement = sliderRef.current.firstElementChild;
      const scrollAmount = posterElement ? posterElement.clientWidth + 32 : 882;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollToIndex = (index) => {
    if (sliderRef.current) {
      const posterElement = sliderRef.current.firstElementChild;
      const posterWidth = posterElement ? posterElement.clientWidth + 32 : 882;
      sliderRef.current.scrollTo({ left: index * posterWidth, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkScroll();
  }, [filteredVacancies]);

  return (
    <section style={{ backgroundColor: '#f8fafc', padding: '64px 0 64px' }}>
      <div className="container" style={{ maxWidth: '1200px', padding: '0 24px', margin: '0 auto' }}>
        
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
                backgroundColor: '#ffffff',
                padding: '5px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 2px 6px rgba(15,23,42,0.04)'
              }}>
                <button
                  onClick={() => setActiveTab('ALL')}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'ALL' ? '#0f2b5c' : 'transparent',
                    color: activeTab === 'ALL' ? '#ffffff' : '#64748b',
                    transition: 'all 0.2s ease'
                  }}
                >
                  All Posters ({vacancies.length})
                </button>

                <button
                  onClick={() => setActiveTab('TEACHING')}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'TEACHING' ? '#0f2b5c' : 'transparent',
                    color: activeTab === 'TEACHING' ? '#ffffff' : '#64748b',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Teaching ({vacancies.filter(v => v.type === 'TEACHING').length})
                </button>

                <button
                  onClick={() => setActiveTab('NON_TEACHING')}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'NON_TEACHING' ? '#0f2b5c' : 'transparent',
                    color: activeTab === 'NON_TEACHING' ? '#ffffff' : '#64748b',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Non-Teaching ({vacancies.filter(v => v.type === 'NON_TEACHING').length})
                </button>
              </div>

              {/* Slider Prev / Next Arrow Controls */}
              {filteredVacancies.length > 1 && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={slideLeft}
                    disabled={!canScrollLeft}
                    aria-label="Previous Poster"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: canScrollLeft ? '#0f172a' : '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: canScrollLeft ? 'pointer' : 'default',
                      boxShadow: canScrollLeft ? '0 4px 12px rgba(15,23,42,0.1)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>

                  <button
                    onClick={slideRight}
                    disabled={!canScrollRight}
                    aria-label="Next Poster"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: canScrollRight ? '#0f172a' : '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: canScrollRight ? 'pointer' : 'default',
                      boxShadow: canScrollRight ? '0 4px 12px rgba(15,23,42,0.1)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Loading active recruitment advertisement posters...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px 20px', borderRadius: '12px', color: '#b91c1c', fontSize: '0.9rem', textAlign: 'center' }}>
            Failed to load active vacancies: {error}
          </div>
        ) : filteredVacancies.length === 0 ? (
          /* Empty State Card */
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '44px 24px',
            textAlign: 'center',
            maxWidth: '580px',
            margin: '0 auto'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.15rem', fontWeight: 800 }}>
              No recruitment advertisements currently available for this category.
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '22px' }}>
              Would you like us to notify you as soon as new positions open up?
            </p>
            <button
              onClick={() => setInterestModalOpen(true)}
              style={{
                backgroundColor: '#0f2b5c',
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
          /* 🎠 HERO POSTER SLIDER TRACK */
          <div style={{ position: 'relative', marginTop: '16px' }}>
            <div
              ref={sliderRef}
              onScroll={checkScroll}
              style={{
                display: 'flex',
                gap: '32px',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'smooth',
                padding: '16px 8px 32px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
              className="vacancy-poster-track"
            >
              {filteredVacancies.map((job) => (
                <div
                  key={job.id}
                  style={{
                    flex: '0 0 clamp(300px, 90vw, 850px)',
                    maxWidth: '850px',
                    scrollSnapAlign: 'center',
                    margin: '0 auto'
                  }}
                >
                  <VacancyPoster job={job} />
                </div>
              ))}
            </div>

            {/* Slider Dots Indicator */}
            {filteredVacancies.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                {filteredVacancies.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    style={{
                      width: activeIndex === i ? '28px' : '10px',
                      height: '10px',
                      borderRadius: '5px',
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

        {/* 🔻 SECTION FOOTER BUTTON: View All Openings → navigates to /advertisments */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={() => navigate('/advertisments')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#0f2b5c',
              color: '#ffffff',
              border: 'none',
              padding: '14px 32px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(15,43,92,0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>View All Vacancy Advertisements</span>
            <span style={{ fontSize: '1.1rem' }}>&rarr;</span>
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
