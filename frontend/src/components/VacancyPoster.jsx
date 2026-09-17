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
              backgroundColor: '#669BBC',
              color: '#ffffff',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(102, 155, 188, 0.25)',
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
              maxWidth: '95vw',
              maxHeight: '95vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: 'none',
              boxShadow: 'none',
              background: 'transparent'
            }}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontSize: '2rem',
                cursor: 'pointer',
                fontWeight: 700
              }}
              title="Close Full View"
            >
              &times;
            </button>
            <img
              src={posterImgSrc}
              alt="Full Recruitment Poster"
              style={{
                maxWidth: '92vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                borderRadius: 0,
                background: 'transparent'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VacancyPoster;
