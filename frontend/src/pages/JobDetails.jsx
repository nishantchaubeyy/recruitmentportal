import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import InterestModal from '../components/InterestModal';

function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interest Modal state
  const [interestModalOpen, setInterestModalOpen] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/public/vacancies/${id}`);
      setJob(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f4f4f2', minHeight: '80vh', padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ fontWeight: 600, color: '#171717', fontFamily: 'Inter, sans-serif' }}>Loading vacancy specification...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{ backgroundColor: '#f4f4f2', minHeight: '80vh', padding: '60px 20px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '36px', borderRadius: '4px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontWeight: 800, color: '#991b1b' }}>Vacancy Unavailable</h3>
          <p style={{ margin: '0 0 18px 0', color: '#475569' }}>{error || 'Vacancy details could not be retrieved.'}</p>
          <Link to="/" style={{ color: '#171717', fontWeight: 700, textDecoration: 'underline' }}>
            &larr; Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const isClosed = !job.isApplicationOpen;

  return (
    <div style={{ backgroundColor: '#f4f4f2', minHeight: '100vh', padding: '36px 16px 80px', fontFamily: "'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, sans-serif", color: '#171717' }}>
      
      {/* Top Back Action Bar */}
      <div style={{ maxWidth: '960px', margin: '0 auto 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>&larr;</span> Back to Openings
        </button>
        <button
          onClick={() => window.print()}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            color: '#171717',
            padding: '6px 14px',
            borderRadius: '4px',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Print / Save PDF
        </button>
      </div>

      {/* 📄 MAIN FORMAL PAPER DOCUMENT CONTAINER */}
      <main 
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.05)',
          padding: 'clamp(28px, 5vw, 56px)',
          boxSizing: 'border-box'
        }}
      >

        {/* ─── DOCUMENT INSTITUTIONAL HEADER ─── */}
        <header style={{ borderBottom: '2px solid #171717', paddingBottom: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                D Y PATIL INTERNATIONAL UNIVERSITY &bull; PUNE
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#171717', marginBottom: '14px' }}>
                OFFICIAL RECRUITMENT SPECIFICATION DOSSIER
              </div>

              {/* Dominant Serif Position Heading */}
              <h1 
                style={{
                  fontFamily: "'Playfair Display', 'Cormorant Garamond', 'Times New Roman', Georgia, serif",
                  fontSize: 'clamp(2rem, 4vw, 2.6rem)',
                  fontWeight: 800,
                  color: '#111111',
                  margin: '0 0 6px 0',
                  lineHeight: 1.15,
                  letterSpacing: '-0.3px'
                }}
              >
                {job.position}
              </h1>

              {/* Department & Category */}
              <div style={{ fontSize: '1.05rem', color: '#171717', fontWeight: 600, marginBottom: '16px' }}>
                Department: <span style={{ fontWeight: 800 }}>{job.department}</span> {job.school?.name ? `(${job.school.name})` : ''} &bull; <span style={{ textTransform: 'capitalize' }}>{job.type?.toLowerCase().replace('_', '-')}</span>
              </div>

              {/* Metadata Details Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.84rem', color: '#475569' }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', display: 'block' }}>Reference Code</span>
                  <span style={{ fontWeight: 700, color: '#171717' }}>{job.vacancyNumber || 'VAC-2026'}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', display: 'block' }}>Total Openings</span>
                  <span style={{ fontWeight: 700, color: '#171717' }}>{job.numPositions} {job.numPositions === 1 ? 'Position' : 'Positions'}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', display: 'block' }}>Employment Type</span>
                  <span style={{ fontWeight: 700, color: '#171717' }}>{job.employmentType || 'Full Time'}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', display: 'block' }}>Campus Location</span>
                  <span style={{ fontWeight: 700, color: '#171717' }}>{job.location || 'Pune Campus'}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', display: 'block' }}>Application Deadline</span>
                  <span style={{ fontWeight: 700, color: '#171717' }}>{new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Application Status Typography */}
            <div style={{ textAlign: 'right', minWidth: '180px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                RECRUITMENT STATUS
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: isClosed ? '#991b1b' : '#111111', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isClosed ? 'Applications Closed' : 'Accepting Applications'}
              </div>
            </div>

          </div>
        </header>

        {/* ─── 01 JOB DESCRIPTION ─── */}
        <section style={{ marginBottom: '38px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid #171717', paddingBottom: '6px', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>01</span>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#171717', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              Job Description & Scope
            </h2>
          </div>

          <p style={{ color: '#334155', lineHeight: '1.75', fontSize: '0.94rem', whiteSpace: 'pre-line', margin: 0 }}>
            {job.description || 'Responsible for academic instruction, student mentoring, research supervision, and departmental leadership at DYPIU.'}
          </p>
        </section>

        {/* ─── 02 QUALIFICATIONS & EXPERIENCE ─── */}
        <section style={{ marginBottom: '38px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid #171717', paddingBottom: '6px', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>02</span>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#171717', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              Qualifications & Experience
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '6px' }}>Required Academic Qualifications</span>
              <p style={{ color: '#171717', fontSize: '0.92rem', lineHeight: '1.6', margin: 0, fontWeight: 500 }}>
                {job.qualification || 'As prescribed by UGC / AICTE norms for the respective discipline.'}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '6px' }}>Required Professional Experience</span>
              <p style={{ color: '#171717', fontSize: '0.92rem', lineHeight: '1.6', margin: 0, fontWeight: 500 }}>
                {job.experience || 'Prior teaching, academic administration, or relevant industry experience required.'}
              </p>
            </div>
          </div>
        </section>

        {/* ─── 03 SKILLS & COMPENSATION ─── */}
        <section style={{ marginBottom: '38px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid #171717', paddingBottom: '6px', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>03</span>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#171717', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              Skills & Compensation
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '6px' }}>Desired Expertise & Skills</span>
              <p style={{ color: '#171717', fontSize: '0.92rem', lineHeight: '1.6', margin: 0, fontWeight: 500 }}>
                {job.skills || 'Demonstrated domain expertise, curriculum planning, and collaborative leadership.'}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '6px' }}>Salary / Pay Scale</span>
              <p style={{ color: '#171717', fontSize: '0.92rem', lineHeight: '1.6', margin: 0, fontWeight: 500 }}>
                {job.salaryScale || 'As per 7th Pay Commission and University Guidelines.'}
              </p>
            </div>
          </div>
        </section>

        {/* ─── 04 ELIGIBILITY & DOCUMENT GUIDELINES ─── */}
        <section style={{ marginBottom: '42px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid #171717', paddingBottom: '6px', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>04</span>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#171717', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              Eligibility Criteria & Required Documents
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '6px' }}>Eligibility Criteria</span>
              <p style={{ color: '#171717', fontSize: '0.92rem', lineHeight: '1.6', margin: 0, fontWeight: 500 }}>
                {job.eligibilityCriteria || 'Candidate must meet minimum UGC / AICTE statutory recruitment norms.'}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '6px' }}>Mandatory Documents for Submission</span>
              <p style={{ color: '#171717', fontSize: '0.92rem', lineHeight: '1.6', margin: 0, fontWeight: 500 }}>
                {job.requiredDocuments || 'Updated CV / Resume (PDF format, max 5 MB), PG Degree Passing Certificates, Experience Letters.'}
              </p>
            </div>
          </div>
        </section>

        {/* ─── 05 FORMAL SUBMISSION ACTION ─── */}
        <section style={{ border: '1px solid #171717', backgroundColor: '#fafafa', padding: '24px', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#111111', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isClosed ? 'Applications Closed' : 'Ready to Submit Application?'}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '3px' }}>
                {isClosed 
                  ? 'The application deadline for this opening has passed.' 
                  : `Submission deadline: ${new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              </div>
            </div>

            <div>
              {isClosed ? (
                <button
                  onClick={() => setInterestModalOpen(true)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #171717',
                    color: '#171717',
                    padding: '10px 22px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    letterSpacing: '0.3px'
                  }}
                >
                  Notify Me When Open
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/apply?jobId=${job.id}`)}
                  style={{
                    backgroundColor: '#171717',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 28px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    letterSpacing: '0.4px'
                  }}
                >
                  Proceed to Application Form &rarr;
                </button>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* Interest Registration Modal */}
      <InterestModal
        isOpen={interestModalOpen}
        onClose={() => setInterestModalOpen(false)}
        defaultCategory={job.type}
        defaultPosition={job.position}
      />
    </div>
  );
}

export default JobDetails;
