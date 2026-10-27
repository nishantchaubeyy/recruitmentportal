import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMediaUrl } from '../utils/api';

/**
 * VacancyPoster Component
 * Renders ONLY the original admin-uploaded recruitment poster image as-is.
 * Strictly NO borders, frames, cards, outlines, background containers, or box-shadows.
 */
const VacancyPoster = ({ job, school, showApplyButton = false, style = {} }) => {
  const navigate = useNavigate();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Extract raw poster URL from school or job
  const rawPosterUrl = school
    ? (school.posterUrl || school.recruitmentPosterUrl)
    : job?.posterUrl;

  if (!rawPosterUrl) return null;

  const posterImgSrc = getMediaUrl(rawPosterUrl);

  const handleImageClick = () => {
    setIsLightboxOpen(true);
  };

  return (
    <div
      className="vacancy-poster-container"
      style={{
        width: '100%',
        maxWidth: '850px',
        margin: '0 auto 24px auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        outline: 'none',
        padding: 0,
        ...style
      }}
    >
      {/* 🖼️ ORIGINAL ADMIN-UPLOADED POSTER IMAGE AS-IS (NO BORDER / NO CARD / NO FRAME / NO SHADOW) */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          borderRadius: 0,
          padding: 0,
          margin: 0
        }}
      >
        <img
          src={posterImgSrc}
          alt={school ? `Recruitment Poster for ${school.name}` : `Recruitment Poster for ${job?.position}`}
          onClick={handleImageClick}
          style={{
            width: '100%',
            height: 'auto',
            maxWidth: '850px',
            objectFit: 'contain',
            display: 'block',
            cursor: 'pointer',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            borderRadius: 0,
            background: 'transparent',
            padding: 0,
            margin: 0
          }}
          title="Click to view full poster"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>

      {/* 🔘 SEPARATE APPLY NOW BUTTON BELOW POSTER (OUTSIDE IMAGE) */}
      {showApplyButton && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate('/apply');
            }}
            style={{
              backgroundColor: '#8B1235',
              color: '#FCD34D',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(139, 18, 53, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            Apply Now &rarr;
          </button>
        </div>
      )}

      {/* 🔍 LIGHTBOX MODAL ON POSTER CLICK */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '20px',
            cursor: 'zoom-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: 'fit-content',
              maxWidth: '90vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#ffffff',
              border: '2px solid #8B1235',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              margin: 'auto'
            }}
          >
            {/* Header */}
            <div style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 20px',
              borderBottom: '1px solid #e2e8f0',
              boxSizing: 'border-box',
              gap: '16px'
            }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#8B1235', fontFamily: 'Playfair Display, serif' }}>
                Official Recruitment Advertisement
              </span>
              <button
                onClick={() => setIsLightboxOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  color: '#475569',
                  fontWeight: 700,
                  flexShrink: 0
                }}
                title="Close"
              >
                ×
              </button>
            </div>
            {/* Poster image */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '16px',
              maxWidth: '100%',
              maxHeight: 'calc(90vh - 60px)',
              overflow: 'hidden'
            }}>
              <img
                src={posterImgSrc}
                alt="Full Recruitment Poster"
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: 'calc(85vh - 75px)',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  margin: '0 auto'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacancyPoster;
