import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getMediaUrl } from '../utils/api';

/**
 * VacancyPoster Component
 * Displays either:
 * 1. A School/Faculty poster (if `school` prop is passed)
 * 2. An uploaded job poster image (job.posterUrl) or a clean dossier-style (resume/application form format) recruitment advertisement.
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
        boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        ...style
      }}
    >
      {/* If Uploaded Poster Image Exists */}
      {posterImgSrc ? (
        <div style={{ position: 'relative', backgroundColor: '#0f172a', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
        /* Generated Dossier-Style Recruitment Advertisement Poster (Resume / Application Form Format) */
        <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#ffffff' }}>
          {/* Header Section: Logo on Top Left + Document Title */}
          <div style={{ borderBottom: '2px solid #111111', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img
                  src="/logo.dypiu.png"
                  alt="DYPIU Logo"
                  style={{ height: '54px', width: 'auto', objectFit: 'contain' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', textTransform: 'uppercase' }}>
                    RECRUITMENT ADVERTISEMENT
                  </h2>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                    D Y Patil International University, Akurdi, Pune
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.88rem', color: '#1e293b' }}>
                <div><strong>Vacancy Ref:</strong> {job.vacancyNumber || `VAC-${job.id?.slice(0, 6)}`}</div>
                <div style={{ marginTop: '3px' }}><strong>Category:</strong> {isTeaching ? 'Teaching Faculty' : 'Non-Teaching Staff'}</div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr',
              gap: '12px',
              fontSize: '0.92rem',
              color: '#111111',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0'
            }}>
              <div>
                <div><strong>Department / School:</strong> {job.department || job.school?.name || 'DYPIU Campus'}</div>
                <div style={{ marginTop: '4px' }}><strong>Post Title:</strong> <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f2b5c' }}>{job.position}</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div><strong>Opening Date:</strong> {formatDate(job.openingDate)}</div>
                <div style={{ marginTop: '4px', color: '#dc2626' }}><strong>Application Deadline:</strong> <strong>{formatDate(job.deadline)}</strong></div>
              </div>
            </div>
          </div>

          {/* 01. VACANCY DETAILS & TERMS */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f172a', marginBottom: '6px' }}>
              01. POSITION DETAILS & TERMS
            </div>
            <div style={{ borderTop: '1.5px solid #111111', paddingTop: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px 16px', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700 }}>Number of Openings</span>
                  <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{job.numPositions ? `${job.numPositions} Opening${job.numPositions > 1 ? 's' : ''}` : 'Multiple'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700 }}>Employment Type</span>
                  <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{job.employmentType || 'Full Time'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700 }}>Job Location</span>
                  <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{job.location || 'Akurdi, Pune'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700 }}>Salary / Pay Scale</span>
                  <strong style={{ fontSize: '0.95rem', color: '#047857' }}>{job.salaryScale || 'As per UGC / University Norms'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 02. REQUIRED QUALIFICATIONS & ELIGIBILITY */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f172a', marginBottom: '6px' }}>
              02. REQUIRED QUALIFICATIONS & ELIGIBILITY
            </div>
            <div style={{ borderTop: '1.5px solid #111111', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.6 }}>
                <div><strong>Qualification:</strong> {job.qualification || 'As per UGC / AICTE / University norms.'}</div>
                {job.eligibilityCriteria && (
                  <div style={{ marginTop: '8px' }}><strong>Eligibility Criteria:</strong> {job.eligibilityCriteria}</div>
                )}
              </div>
            </div>
          </div>

          {/* 03. EXPERIENCE & RESPONSIBILITIES */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f172a', marginBottom: '6px' }}>
              03. EXPERIENCE & DUTIES
            </div>
            <div style={{ borderTop: '1.5px solid #111111', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.6 }}>
                {job.experience && (
                  <div><strong>Required Experience:</strong> {job.experience}</div>
                )}
                {job.skills && (
                  <div style={{ marginTop: '6px' }}><strong>Skills & Competencies:</strong> {job.skills}</div>
                )}
                {job.description && (
                  <div style={{ marginTop: '8px' }}><strong>Description & Key Duties:</strong> {job.description}</div>
                )}
              </div>
            </div>
          </div>

          {/* 04. REQUIRED DOCUMENTS & INSTRUCTIONS */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f172a', marginBottom: '6px' }}>
              04. REQUIRED DOCUMENTS & INSTRUCTIONS
            </div>
            <div style={{ borderTop: '1.5px solid #111111', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                {job.requiredDocuments || 'CV/Resume, Educational Certificates, Experience Letters, ID Proof'}
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              paddingTop: '18px',
              borderTop: '2px solid #111111'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
              Official DYPIU Recruitment Notice. Interested candidates must submit their application prior to the deadline.
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
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
