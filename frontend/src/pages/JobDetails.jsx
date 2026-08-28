import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
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
      const res = await fetch(`${API_BASE_URL}/public/vacancies/${id}`);
      if (!res.ok) {
        throw new Error('Job opening not found or access restricted.');
      }
      const data = await res.json();
      setJob(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: '900px', padding: '60px 24px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
        <p style={{ fontWeight: 600, color: '#64748b' }}>Loading vacancy details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container" style={{ maxWidth: '900px', padding: '60px 24px' }}>
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '24px', borderRadius: '12px', color: '#b91c1c', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0', fontWeight: 800 }}>⚠️ Vacancy Unavailable</h3>
          <p style={{ margin: '0 0 16px 0' }}>{error || 'Vacancy details could not be retrieved.'}</p>
          <Link to="/" style={{ color: '#0f766e', fontWeight: 700, textDecoration: 'none' }}>
            &larr; Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const isClosed = !job.isApplicationOpen;

  return (
    <div className="container" style={{ maxWidth: '920px', padding: '30px 24px' }}>
      {/* Back navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          &larr; Back
        </button>
      </div>

      {/* Main Vacancy Card Header */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                backgroundColor: job.type === 'TEACHING' ? '#ccfbf1' : '#e0e7ff',
                color: job.type === 'TEACHING' ? '#0f766e' : '#3730a3',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                {job.type}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Ref: {job.vacancyNumber || 'VAC-2026'}
              </span>
            </div>

            <h1 style={{ margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
              {job.position}
            </h1>
            <p style={{ margin: '6px 0 0 0', color: '#475569', fontSize: '1rem', fontWeight: 600 }}>
              Department: {job.department} {job.school?.name ? `(${job.school.name})` : ''}
            </p>
          </div>

          {/* Status Badge */}
          <div>
            {isClosed ? (
              <span style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.85rem'
              }}>
                Application Closed
              </span>
            ) : (
              <span style={{
                backgroundColor: '#dcfce7',
                color: '#166534',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.85rem'
              }}>
                Accepting Applications
              </span>
            )}
          </div>
        </div>

        {/* Quick Attributes Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          backgroundColor: '#f8fafc',
          padding: '16px 20px',
          borderRadius: '12px',
          marginTop: '20px',
          fontSize: '0.88rem',
          color: '#334155'
        }}>
          <div><strong>Openings:</strong> {job.numPositions}</div>
          <div><strong>Employment Type:</strong> {job.employmentType || 'Full Time'}</div>
          <div><strong>Location:</strong> {job.location || 'Pune'}</div>
          <div><strong>Application Opening:</strong> {new Date(job.openingDate || job.createdAt).toLocaleDateString('en-IN')}</div>
          <div><strong>Application Deadline:</strong> {new Date(job.deadline).toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      {/* Detail Sections */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Job Description */}
        <div>
          <h3 style={sectionHeadingStyle}>Job Description</h3>
          <p style={{ color: '#334155', lineHeight: '1.7', whiteSpace: 'pre-line', margin: 0 }}>
            {job.description}
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

        {/* Qualifications & Experience */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h3 style={sectionHeadingStyle}>🎓 Required Qualifications</h3>
            <p style={{ color: '#334155', lineHeight: '1.6', margin: 0 }}>
              {job.qualification}
            </p>
          </div>

          <div>
            <h3 style={sectionHeadingStyle}>💼 Required Experience</h3>
            <p style={{ color: '#334155', lineHeight: '1.6', margin: 0 }}>
              {job.experience}
            </p>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

        {/* Skills & Pay Scale */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h3 style={sectionHeadingStyle}>🛠️ Desired Skills</h3>
            <p style={{ color: '#334155', lineHeight: '1.6', margin: 0 }}>
              {job.skills || 'N/A'}
            </p>
          </div>

          <div>
            <h3 style={sectionHeadingStyle}>💰 Salary / Pay Scale</h3>
            <p style={{ color: '#334155', lineHeight: '1.6', margin: 0 }}>
              {job.salaryScale || 'As per University Guidelines'}
            </p>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

        {/* Eligibility & Required Documents */}
        <div>
          <h3 style={sectionHeadingStyle}>📋 Eligibility Criteria</h3>
          <p style={{ color: '#334155', lineHeight: '1.6', margin: '0 0 16px 0' }}>
            {job.eligibilityCriteria || 'As per UGC / AICTE / University norms.'}
          </p>

          <h3 style={sectionHeadingStyle}>📂 Required Documents for Submission</h3>
          <p style={{ color: '#334155', lineHeight: '1.6', margin: 0 }}>
            {job.requiredDocuments || 'CV/Resume (PDF), Marksheets, Degree Passing Certificates, Experience Letters.'}
          </p>
        </div>

        {/* Action Button Section */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '24px',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginTop: '12px'
        }}>
          <div>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
              {isClosed ? 'Applications for this vacancy are closed' : 'Ready to submit your application?'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              {isClosed ? 'Deadline has passed or vacancy status is inactive.' : `Deadline: ${new Date(job.deadline).toLocaleDateString()}`}
            </div>
          </div>

          <div>
            {isClosed ? (
              <button
                onClick={() => setInterestModalOpen(true)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #0f766e',
                  color: '#0f766e',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                Notify Me When Open
              </button>
            ) : (
              <button
                onClick={() => navigate(`/apply?jobId=${job.id}`)}
                style={{
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                Apply Now &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

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

const sectionHeadingStyle = {
  fontSize: '1rem',
  color: '#0f3b46',
  fontWeight: 800,
  margin: '0 0 8px 0'
};

export default JobDetails;
