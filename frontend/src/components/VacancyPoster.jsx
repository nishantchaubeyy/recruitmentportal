import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getMediaUrl } from '../utils/api';

/**
 * VacancyPoster Component
 * Displays either:
 * 1. A School/Faculty poster (if `school` prop is passed)
 * 2. An uploaded job poster image (job.posterUrl) or an auto-generated HTML/CSS recruitment advertisement poster.
 */
const VacancyPoster = ({ job, school, style = {} }) => {
  const navigate = useNavigate();

  // ── SCHOOL / FACULTY POSTER RENDER ──
  if (school) {
    const posterImgSrc = getMediaUrl(school.posterUrl || school.recruitmentPosterUrl);
    const isTeaching = school.type === 'TEACHING';

    return (
      <div
        className="vacancy-poster-card school-poster-card"
        style={{
          width: '100%',
          maxWidth: '850px',
          margin: '0 auto',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(15, 23, 42, 0.15), 0 2px 8px rgba(15, 23, 42, 0.08)',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          ...style
        }}
      >
        {/* Top Header Badge */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f2b5c 0%, #1e3a8a 100%)',
            color: '#ffffff',
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '3px solid #d97706'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                backgroundColor: isTeaching ? '#3b82f6' : '#10b981',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '20px'
              }}
            >
              {isTeaching ? 'Faculty Recruitment Poster' : 'Division Recruitment Poster'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>
              DYPATIL INTERNATIONAL UNIVERSITY, PUNE
            </span>
          </div>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '4px 12px',
              borderRadius: '6px'
            }}
          >
            {school.code || 'FACULTY'}
          </span>
        </div>

        {/* Poster Image Area */}
        <div style={{ position: 'relative', backgroundColor: '#0f172a', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxHeight: '680px',
              minHeight: '350px',
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#0f172a'
            }}
          >
            <img
              src={posterImgSrc}
              alt={`Official Recruitment Poster for ${school.name}`}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: '680px',
                objectFit: 'contain',
                display: 'block'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          {/* Footer Bar */}
          <div
            style={{
              backgroundColor: '#0f2b5c',
              padding: '16px 24px',
              color: '#ffffff',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              borderTop: '2px solid #d97706'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                {school.name}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#cbd5e1' }}>
                Faculty Recruitment Advertisement {school._count?.jobs ? `• ${school._count.jobs} Active Vacancy(ies)` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(isTeaching ? '/teaching' : '/non-teaching');
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: '1px solid #94a3b8',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                View Positions List
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/apply?faculty=${encodeURIComponent(school.name)}&type=${school.type}`);
                }}
                style={{
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                Apply Now &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── JOB / VACANCY POSTER RENDER ──
  if (!job) return null;

  const handleApplyClick = (e) => {
    e.stopPropagation();
    navigate(`/apply?jobId=${job.id}`);
  };

  const handleDetailsClick = (e) => {
    e.stopPropagation();
    navigate(`/jobs/${job.id}`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Open until filled';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const isTeaching = job.type === 'TEACHING';
  const posterImgSrc = job.posterUrl ? getMediaUrl(job.posterUrl) : null;

  return (
    <div
      className="vacancy-poster-card"
      style={{
        width: '100%',
        maxWidth: '850px',
        margin: '0 auto',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 12px 36px rgba(15, 23, 42, 0.15), 0 2px 8px rgba(15, 23, 42, 0.08)',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        ...style
      }}
    >
      {/* Top Header Badge / Strip */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f2b5c 0%, #1e3a8a 100%)',
          color: '#ffffff',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #d97706'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              backgroundColor: isTeaching ? '#3b82f6' : '#10b981',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '20px'
            }}
          >
            {isTeaching ? 'Teaching Faculty' : 'Non-Teaching Staff'}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>
            DYPATIL INTERNATIONAL UNIVERSITY, PUNE
          </span>
        </div>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            padding: '4px 12px',
            borderRadius: '6px',
            letterSpacing: '0.5px'
          }}
        >
          {job.vacancyNumber || `VAC-${job.id?.slice(0, 6)}`}
        </span>
      </div>

      {/* If Uploaded Poster Image Exists */}
      {posterImgSrc ? (
        <div style={{ position: 'relative', backgroundColor: '#0f172a', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxHeight: '620px',
              minHeight: '350px',
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#0f172a'
            }}
          >
            <img
              src={posterImgSrc}
              alt={`Recruitment Advertisement Poster for ${job.position}`}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: '620px',
                objectFit: 'contain',
                display: 'block'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          {/* Quick Info Overlay Bar at bottom of poster image */}
          <div
            style={{
              backgroundColor: '#0f2b5c',
              padding: '16px 24px',
              color: '#ffffff',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              borderTop: '2px solid #d97706'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                {job.position}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#cbd5e1' }}>
                {job.department || job.school?.name || 'DYPIU Campus'} • Deadline: {formatDate(job.deadline)}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDetailsClick}
                style={{
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: '1px solid #94a3b8',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                View Details
              </button>
              <button
                onClick={handleApplyClick}
                style={{
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                Apply Now &rarr;
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Generated HTML/CSS Recruitment Poster Template */
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#f8fafc' }}>
          {/* Institution Header */}
          <div
            style={{
              textAlign: 'center',
              borderBottom: '2px dashed #cbd5e1',
              paddingBottom: '20px',
              marginBottom: '24px'
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#d97706',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '4px'
              }}
            >
              ★ Official Recruitment Announcement ★
            </div>
            <h2
              style={{
                margin: 0,
                color: '#0f2b5c',
                fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                lineHeight: 1.2
              }}
            >
              {job.position}
            </h2>
            <div style={{ marginTop: '8px', fontSize: '1rem', color: '#475569', fontWeight: 600 }}>
              {job.department || job.school?.name || 'D Y Patil International University, Akurdi, Pune'}
            </div>
          </div>

          {/* Key Vacancy Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '14px 18px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #0f2b5c'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Positions / Openings
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {job.numPositions ? `${job.numPositions} Opening${job.numPositions > 1 ? 's' : ''}` : 'Multiple'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '14px 18px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #3b82f6'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Employment Type
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {job.employmentType || 'Full Time'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '14px 18px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #10b981'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Location
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {job.location || 'Akurdi, Pune'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '14px 18px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #ef4444'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Application Deadline
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                {formatDate(job.deadline)}
              </div>
            </div>
          </div>

          {/* Qualification & Experience Section */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px'
            }}
          >
            <div style={{ marginBottom: '14px' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#0f2b5c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'inline-block',
                  borderBottom: '2px solid #d97706',
                  paddingBottom: '2px'
                }}
              >
                Required Qualifications & Eligibility
              </span>
              <p style={{ margin: '8px 0 0', color: '#334155', fontSize: '0.95rem', lineHeight: '1.5' }}>
                {job.qualification || 'As per UGC / University AICTE norms.'}
              </p>
            </div>

            {job.experience && (
              <div style={{ marginBottom: '14px' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#0f2b5c',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'inline-block',
                    borderBottom: '2px solid #d97706',
                    paddingBottom: '2px'
                  }}
                >
                  Experience
                </span>
                <p style={{ margin: '8px 0 0', color: '#334155', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  {job.experience}
                </p>
              </div>
            )}

            {job.requiredDocuments && (
              <div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#0f2b5c',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'inline-block',
                    borderBottom: '2px solid #d97706',
                    paddingBottom: '2px'
                  }}
                >
                  Required Documents
                </span>
                <p style={{ margin: '8px 0 0', color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {job.requiredDocuments}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #cbd5e1'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Interested candidates should apply online prior to the specified deadline.
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDetailsClick}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#0f2b5c',
                  border: '1.5px solid #0f2b5c',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                View Full Details
              </button>

              <button
                onClick={handleApplyClick}
                style={{
                  backgroundColor: '#0f2b5c',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(15, 43, 92, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                Apply Now &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacancyPoster;
