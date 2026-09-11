import React, { useState } from 'react';
import { getMediaUrl } from '../utils/api';

/**
 * VacancyPoster Component
 * Renders ONLY the original admin-uploaded recruitment poster image as-is.
 * No Apply Now buttons inside or underneath individual posters.
 */
const VacancyPoster = ({ job, school, style = {} }) => {
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
        ...style
      }}
    >
      {/* 🖼️ ORIGINAL ADMIN-UPLOADED POSTER IMAGE AS-IS */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)'
        }}
      >
        <img
          src={posterImgSrc}
          alt={school ? `Recruitment Poster for ${school.name}` : `Recruitment Poster for ${job?.position}`}
          onClick={handleImageClick}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '1100px',
            objectFit: 'contain',
            display: 'block',
            cursor: 'pointer',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          title="Click to view full poster"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>

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
              alignItems: 'center'
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
                borderRadius: '8px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VacancyPoster;
