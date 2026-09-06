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
  }, [vacancies]);

  return (
    <section style={{ backgroundColor: '#f8fafc', padding: '64px 0 64px' }}>
      <div className="container" style={{ maxWidth: '1200px', padding: '0 24px', margin: '0 auto' }}>
        
        {/* 🎯 CENTER-ALIGNED SECTION HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{
            margin: 0,
            color: '#0f172a',
            fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
            fontWeight: 900,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            lineHeight: 1.15
          }}>
            RECRUITMENTS
          </h2>
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Loading active recruitment advertisements...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px 20px', borderRadius: '12px', color: '#b91c1c', fontSize: '0.9rem', textAlign: 'center' }}>
            Failed to load active vacancies: {error}
          </div>
        ) : vacancies.length === 0 ? (
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
              No recruitment advertisements currently available.
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
          /* 🎠 HERO POSTER SLIDER TRACK WITH FLOATING CONTROLS */
          <div style={{ position: 'relative', marginTop: '24px' }}>
            {/* Slider Navigation Arrows (Left / Right) */}
            {vacancies.length > 1 && (
              <>
                <button
                  onClick={slideLeft}
                  disabled={!canScrollLeft}
                  aria-label="Previous Poster"
                  style={{
                    position: 'absolute',
                    left: '-18px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: canScrollLeft ? '#0f172a' : '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canScrollLeft ? 'pointer' : 'default',
                    boxShadow: canScrollLeft ? '0 4px 14px rgba(15,23,42,0.15)' : 'none',
                    transition: 'all 0.2s ease',
                    opacity: canScrollLeft ? 1 : 0.4
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
                    position: 'absolute',
                    right: '-18px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: canScrollRight ? '#0f172a' : '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canScrollRight ? 'pointer' : 'default',
                    boxShadow: canScrollRight ? '0 4px 14px rgba(15,23,42,0.15)' : 'none',
                    transition: 'all 0.2s ease',
                    opacity: canScrollRight ? 1 : 0.4
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </>
            )}

            <div
              ref={sliderRef}
              onScroll={checkScroll}
              style={{
                display: 'flex',
                gap: '32px',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'smooth',
                padding: '12px 4px 24px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
              className="vacancy-poster-track"
            >
              {vacancies.map((job) => (
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
            {vacancies.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                {vacancies.map((_, i) => (
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

        {/* 🔻 SECTION FOOTER BUTTON: View All Advertisements → */}
        <div style={{ textAlign: 'center', marginTop: '36px' }}>
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
