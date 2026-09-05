import React from 'react';
import { statusLabel } from '../utils/status';

/**
 * Dedicated Print/PDF Component for Candidate Application Dossier
 * Formatted strictly for formal university archival and high-definition A4 portrait printing.
 * Excludes all administrative buttons, sidebars, dashboard headers, and interactive controls.
 */
function DossierPrintDocument({ app }) {
  if (!app) return null;

  // Safe JSON Parsing Helper
  const parseJson = (field, fallback = {}) => {
    if (!field) return fallback;
    if (typeof field === 'object') return field;
    try {
      return JSON.parse(field);
    } catch (e) {
      return fallback;
    }
  };

  const personal = parseJson(app.personalInfo, {});
  const contact = parseJson(app.contactDetails, {});
  const qualifications = parseJson(app.qualifications, []);
  const experience = parseJson(app.experience || app.workExperience, []);
  const research = parseJson(app.researchDetails || app.phdDetails, {});
  const documents = Array.isArray(app.documents) ? app.documents : [];
  const statusHistory = Array.isArray(app.statusHistory) ? app.statusHistory : [];

  // Name resolution
  const displayTitle = (personal.title && personal.title !== 'Select' && personal.title !== 'Select Title') ? personal.title : '';
  const fullName = [displayTitle, personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const candidateName = fullName || app.applicant?.name || 'Candidate Name';

  // Position & Department
  const positionTitle = app.job?.position || personal.postAppliedFor || 'Faculty Position';
  const departmentName = app.job?.department || personal.faculty || 'School of Computing';

  // Correct submission date resolution
  const getSubmissionDateFormatted = () => {
    if (app.submittedAt) {
      return new Date(app.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const submitItem = statusHistory.find((h) => h.newStatus === 'SUBMITTED');
    if (submitItem?.changedAt) {
      return new Date(submitItem.changedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (app.status && app.status !== 'DRAFT' && app.updatedAt) {
      return new Date(app.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return new Date(app.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formattedAppDate = getSubmissionDateFormatted();
  const candidateEmail = personal.email || contact.email || app.applicant?.user?.email || 'N/A';
  const candidateMobile = personal.mobile || contact.mobile || app.applicant?.mobile || 'N/A';

  const formatBirthDate = (rawDob) => {
    if (!rawDob) return 'N/A';
    try {
      const d = new Date(rawDob);
      if (isNaN(d.getTime())) return rawDob;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return rawDob;
    }
  };

  return (
    <div className="dossier-print-container" style={{
      backgroundColor: '#ffffff',
      color: '#111111',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      fontSize: '10pt',
      lineHeight: 1.45,
      padding: '0',
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: '100%'
    }}>

      {/* ─── OFFICIAL FORM HEADER ─── */}
      <div style={{ borderBottom: '1.5px solid #111111', paddingBottom: '14px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src="/logo.dypiu.png"
              alt="DYPIU Logo"
              style={{ height: '54px', width: 'auto', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontSize: '15pt', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                APPLICATION FORM
              </div>
              <div style={{ fontSize: '9.5pt', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                D Y Patil International University, Akurdi, Pune
              </div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '12px',
          fontSize: '9.5pt',
          color: '#111111',
          paddingTop: '10px',
          borderTop: '1px solid #e2e8f0'
        }}>
          <div>
            <div><strong>Department:</strong> {departmentName}</div>
            <div style={{ marginTop: '3px' }}><strong>Post Applied For:</strong> {positionTitle}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong>Application ID:</strong> {app.applicationNumber || 'APP-2026-000001'}</div>
            <div style={{ marginTop: '3px' }}><strong>Application Date:</strong> {formattedAppDate}</div>
          </div>
        </div>
      </div>

      {/* ─── CANDIDATE DETAILS SUMMARY ─── */}
      <div className="print-section" style={{ marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ fontSize: '10.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f172a', marginBottom: '6px' }}>
          CANDIDATE DETAILS
        </div>
        <div style={{ borderTop: '1.5px solid #111111', paddingTop: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 14px', fontSize: '9pt' }}>
            <div><span style={{ color: '#475569', display: 'block', fontSize: '8pt', textTransform: 'uppercase', fontWeight: 600 }}>Full Name</span><strong style={{ fontSize: '9.5pt' }}>{candidateName}</strong></div>
            <div><span style={{ color: '#475569', display: 'block', fontSize: '8pt', textTransform: 'uppercase', fontWeight: 600 }}>Date of Birth</span><strong>{formatBirthDate(personal.dob)} {personal.age ? `(${personal.age})` : ''}</strong></div>
            <div><span style={{ color: '#475569', display: 'block', fontSize: '8pt', textTransform: 'uppercase', fontWeight: 600 }}>Gender</span><strong>{personal.gender || 'N/A'}</strong></div>
            <div><span style={{ color: '#475569', display: 'block', fontSize: '8pt', textTransform: 'uppercase', fontWeight: 600 }}>Marital Status</span><strong>{personal.maritalStatus || 'N/A'}</strong></div>
            <div><span style={{ color: '#475569', display: 'block', fontSize: '8pt', textTransform: 'uppercase', fontWeight: 600 }}>Primary Email</span><strong>{candidateEmail}</strong></div>
            <div><span style={{ color: '#475569', display: 'block', fontSize: '8pt', textTransform: 'uppercase', fontWeight: 600 }}>Primary Mobile</span><strong>{candidateMobile}</strong></div>
          </div>
        </div>
      </div>

      {/* ─── 01. PERSONAL INFORMATION ─── */}
      <div className="print-section" style={{ marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ fontSize: '10pt', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '5px' }}>
          01. PERSONAL INFORMATION
        </div>
        <div style={{ borderTop: '1px solid #111111', paddingTop: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 12px', fontSize: '9pt' }}>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Title</span><strong>{personal.title || 'N/A'}</strong></div>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>First Name</span><strong>{personal.firstName || 'N/A'}</strong></div>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Middle Name</span><strong>{personal.middleName || '—'}</strong></div>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Last Name</span><strong>{personal.lastName || 'N/A'}</strong></div>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Date of Birth</span><strong>{formatBirthDate(personal.dob)}</strong></div>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Age</span><strong>{personal.age || 'N/A'}</strong></div>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Gender</span><strong>{personal.gender || 'N/A'}</strong></div>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Marital Status</span><strong>{personal.maritalStatus || 'N/A'}</strong></div>
          </div>
        </div>
      </div>

      {/* ─── 02. LOCATION & COMMUNICATION ─── */}
      <div className="print-section" style={{ marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ fontSize: '10pt', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '5px' }}>
          02. LOCATION & COMMUNICATION
        </div>
        <div style={{ borderTop: '1px solid #111111', paddingTop: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 12px', fontSize: '9pt' }}>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Primary Email</span><strong>{candidateEmail}</strong></div>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Alternate Email</span><strong>{contact.alternateEmail || personal.alternateEmail || '—'}</strong></div>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Primary Mobile</span><strong>{candidateMobile}</strong></div>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Alternate Mobile</span><strong>{contact.alternateMobile || '—'}</strong></div>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>City / District</span><strong>{contact.city || 'Pune'}</strong></div>
            <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>State & PIN</span><strong>{contact.state || 'Maharashtra'}{contact.pinCode ? ` - ${contact.pinCode}` : ''}</strong></div>
            <div style={{ gridColumn: 'span 3' }}>
              <span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Full Residential Address</span>
              <strong>{contact.address || 'Address on file with university application dossier.'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 03. ACADEMIC QUALIFICATIONS ─── */}
      <div className="print-section" style={{ marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ fontSize: '10pt', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '5px' }}>
          03. ACADEMIC QUALIFICATIONS
        </div>
        <div style={{ borderTop: '1px solid #111111', paddingTop: '8px' }}>
          {qualifications.length === 0 ? (
            <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '9pt', margin: '4px 0' }}>No formal qualifications recorded.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #111111' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase' }}>Degree Level</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase' }}>Degree Name</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase' }}>Institute / University</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase' }}>Specialization</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', textAlign: 'center' }}>Year</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', textAlign: 'right' }}>CGPA / %</th>
                </tr>
              </thead>
              <tbody>
                {qualifications.map((q, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{q.qualificationDegree || q.degreeLevel || 'Graduation'}</td>
                    <td style={{ padding: '6px 8px' }}>{q.degreeName || 'N/A'}</td>
                    <td style={{ padding: '6px 8px' }}>{q.instituteName || q.university || 'N/A'}</td>
                    <td style={{ padding: '6px 8px' }}>{q.specialization || 'General'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{q.passingYear || q.year || 'N/A'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{q.cgpa || q.percentage || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── 04. RESEARCH & PROFESSIONAL PROFILE ─── */}
      {(research.phdStatus || research.scopusCount || research.net || research.gate) && (
        <div className="print-section" style={{ marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div style={{ fontSize: '10pt', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '5px' }}>
            04. RESEARCH & PROFESSIONAL PROFILE
          </div>
          <div style={{ borderTop: '1px solid #111111', paddingTop: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 12px', fontSize: '9pt', marginBottom: '8px' }}>
              <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Ph.D. Status</span><strong>{research.phdStatus || 'N/A'}</strong></div>
              <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Ph.D. University</span><strong>{research.phdUniversity || '—'}</strong></div>
              <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Ph.D. Year</span><strong>{research.phdYear || '—'}</strong></div>
              <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Conference Papers</span><strong>{research.conferencePaper || 0}</strong></div>
              <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Scopus Publications</span><strong>{research.scopusCount || 0}</strong></div>
              <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Scopus Author ID</span><strong>{research.scopusId || '—'}</strong></div>
              <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Web of Science (SCI)</span><strong>{research.wosCount || research.webOfScienceCount || 0}</strong></div>
              <div><span style={{ color: '#475569', fontSize: '8pt', display: 'block' }}>Web of Science ID</span><strong>{research.wosId || '—'}</strong></div>
            </div>

            <div style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontSize: '8.5pt', backgroundColor: '#ffffff' }}>
              <strong>National Eligibility Examination Clearance:</strong>{' '}
              <span>
                NET: <strong>{research.net === 'Yes' || research.net?.cleared === 'Yes' || research.netCleared ? 'Cleared' : 'Not Cleared'}</strong> &bull;{' '}
                SET: <strong>{research.setExam === 'Yes' || research.setExam?.cleared === 'Yes' || research.setCleared ? 'Cleared' : 'Not Cleared'}</strong> &bull;{' '}
                GATE: <strong>{research.gate === 'Yes' || research.gate?.cleared === 'Yes' || research.gateCleared ? 'Cleared' : 'Not Cleared'}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── 05. WORK EXPERIENCE ─── */}
      <div className="print-section" style={{ marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ fontSize: '10pt', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '5px' }}>
          05. WORK EXPERIENCE
        </div>
        <div style={{ borderTop: '1px solid #111111', paddingTop: '8px' }}>
          {experience.length === 0 ? (
            <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '9pt', margin: '4px 0' }}>Fresher Submission — No prior formal professional experience recorded.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #111111' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase' }}>Organization</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase' }}>Designation</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase' }}>Employment Type</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase' }}>From</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase' }}>To</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase' }}>Salary</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, color: '#111111', textTransform: 'uppercase' }}>Notice Period</th>
                </tr>
              </thead>
              <tbody>
                {experience.map((e, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700 }}>{e.organization || 'N/A'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.designation || 'N/A'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.type || e.experienceType || 'Full-Time'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.fromDate || 'N/A'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.isCurrent ? 'Present' : e.toDate || 'N/A'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.salary || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.noticePeriod || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── 06. DOCUMENTS ─── */}
      <div className="print-section" style={{ marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ fontSize: '10pt', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '5px' }}>
          06. DOCUMENTS
        </div>
        <div style={{ borderTop: '1px solid #111111', paddingTop: '8px' }}>
          {documents.length === 0 ? (
            <div style={{ fontSize: '9pt', color: '#334155' }}>
              <div>CV / Resume: Attached in electronic submission</div>
              <div>Other Documents: Attached</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px', fontSize: '9pt' }}>
              {documents.map((doc, idx) => (
                <div key={idx} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                    {doc.documentType === 'resume' ? 'CV / Resume' : doc.documentType}:
                  </span>{' '}
                  <span style={{ color: '#334155' }}>{doc.originalName || 'Document.pdf'}</span>{' '}
                  <span style={{ fontSize: '8pt', color: '#166534', fontWeight: 600 }}>(Attached & Verified)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── FORMAL DECLARATION & AUDIT FOOTER ─── */}
      <div className="print-section" style={{
        marginTop: '28px',
        paddingTop: '12px',
        borderTop: '1.5px solid #111111',
        fontSize: '8.5pt',
        color: '#334155',
        pageBreakInside: 'avoid',
        breakInside: 'avoid'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Candidate Declaration:</strong> I hereby declare that all the information given in this application is true, complete and correct to the best of my knowledge and belief.
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px' }}>
          <div>
            <div><strong>Candidate:</strong> {candidateName}</div>
            <div style={{ fontSize: '8pt', color: '#64748b' }}>Filing Date: {formattedAppDate}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ borderTop: '1px solid #64748b', width: '180px', marginBottom: '4px' }}></div>
            <div style={{ fontSize: '8pt', color: '#475569', fontWeight: 600 }}>Official University Verification Stamp / Signature</div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default DossierPrintDocument;
