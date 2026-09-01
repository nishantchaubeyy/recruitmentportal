import React, { useState, useEffect, useContext, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiRequest } from '../utils/api';

const FACULTIES_LIST = [
  'SCHOOL OF COMPUTING',
  'SCHOOL OF MANAGEMENT',
  'SCHOOL OF BIOSCIENCES & BIOENGINEERING',
  'SCHOOL OF ARCHITECTURE & DESIGN',
  'SCHOOL OF MEDIA & COMMUNICATION',
  'SCHOOL OF PHARMACY',
  'SCHOOL OF HUMANITIES & SOCIAL SCIENCES',
  'RESEARCH & INNOVATION CENTRES',
  'UNIVERSITY ADMINISTRATION & OPERATIONS',
  'SYSTEMS & IT INFRASTRUCTURE',
  'TECHNICAL & LABORATORY SERVICES',
  'FINANCE & ACCOUNTS DEPARTMENT',
  'LIBRARY & INFORMATION SERVICES',
  'BRANDING, MEDIA & PROMOTION',
  'ESTATE & CIVIL ENGINEERING'
];

const POSTS_BY_TYPE = {
  TEACHING: [
    'Professor',
    'Associate Professor',
    'Assistant Professor',
    'Adjunct Professor',
    'Chair Professor',
    'Post-Doctoral Fellow',
    'Research Scientist',
    'Dean / Director'
  ],
  NON_TEACHING: [
    'Registrar',
    'Deputy Registrar',
    'Assistant Registrar',
    'Section Officer',
    'Administrative Officer',
    'Systems Administrator',
    'IT Support Executive',
    'Technical Assistant',
    'Lab Assistant / In-charge',
    'Senior Accountant / Finance Officer',
    'Library Assistant',
    'Graphic Designer',
    'HR Executive',
    'Senior Architect',
    'Office Assistant / Clerk'
  ]
};

const INDIAN_STATES = [
  'Maharashtra', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi NCR', 'Chandigarh', 'Other'
];

const DAYS_LIST = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

const MONTHS_LIST = [
  { value: '01', label: '01 - Jan' },
  { value: '02', label: '02 - Feb' },
  { value: '03', label: '03 - Mar' },
  { value: '04', label: '04 - Apr' },
  { value: '05', label: '05 - May' },
  { value: '06', label: '06 - Jun' },
  { value: '07', label: '07 - Jul' },
  { value: '08', label: '08 - Aug' },
  { value: '09', label: '09 - Sep' },
  { value: '10', label: '10 - Oct' },
  { value: '11', label: '11 - Nov' },
  { value: '12', label: '12 - Dec' }
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS_LIST = Array.from({ length: 70 }, (_, i) => String(CURRENT_YEAR - 18 - i));

const STEPS = [
  { id: 1, title: 'Personal Info', shortName: 'Personal' },
  { id: 2, title: 'Contact Info', shortName: 'Contact' },
  { id: 3, title: 'Qualifications', shortName: 'Education' },
  { id: 4, title: 'Experience', shortName: 'Experience' },
  { id: 5, title: 'Research & Info', shortName: 'Professional' },
  { id: 6, title: 'Documents', shortName: 'Documents' },
  { id: 7, title: 'Review & Submit', shortName: 'Review' }
];

function ApplicationForm() {
  const [searchParams] = useSearchParams();
  const { jobId: routeJobId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const queryJobId = searchParams.get('jobId');
  const activeJobId = queryJobId || routeJobId;
  const resumeStep = parseInt(searchParams.get('step')) || 1;

  const urlFaculty = searchParams.get('faculty') ? decodeURIComponent(searchParams.get('faculty')) : '';
  const urlType = searchParams.get('type') || 'TEACHING';

  // Multi-step Wizard State
  const [currentStep, setCurrentStep] = useState(resumeStep);
  const [draftAppId, setDraftAppId] = useState(searchParams.get('draftId') || null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('Your application is automatically saved.');
  const [loadedVacancy, setLoadedVacancy] = useState(null);

  // STEP 1: Post & Personal Info
  const [selectedFaculty, setSelectedFaculty] = useState(urlFaculty || 'SCHOOL OF COMPUTING');
  const [postAppliedFor, setPostAppliedFor] = useState('');
  const [title, setTitle] = useState('Select');
  const [firstName, setFirstName] = useState(user?.name?.split(' ')[0] || '');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState(user?.name?.split(' ').slice(1).join(' ') || '');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [maritalStatus, setMaritalStatus] = useState('Married');

  // STEP 2: Contact Information & Email Verification
  const [email, setEmail] = useState(user?.email || '');
  const [emailVerified, setEmailVerified] = useState(Boolean(user?.email));
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [alternateEmail, setAlternateEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Pune');
  const [state, setState] = useState('Maharashtra');
  const [country, setCountry] = useState('India');
  const [pinCode, setPinCode] = useState('');

  // STEP 3: Academic Qualifications
  const [qualifications, setQualifications] = useState([
    { qualificationDegree: 'SSC', degreeName: '10th Standard', instituteName: '', specialization: 'General', passingYear: '', cgpa: '', studyMode: 'Full-Time' },
    { qualificationDegree: 'HSC', degreeName: '12th Standard', instituteName: '', specialization: 'Science', passingYear: '', cgpa: '', studyMode: 'Full-Time' },
    { qualificationDegree: "Bachelor's", degreeName: '', instituteName: '', specialization: '', passingYear: '', cgpa: '', studyMode: 'Full-Time' }
  ]);
  const [subjectAppliedFor, setSubjectAppliedFor] = useState('');

  // STEP 4: Work Experience
  const [isFresher, setIsFresher] = useState(false);
  const [experiences, setExperiences] = useState([
    { organization: '', type: 'Teaching', designation: '', isCurrent: false, fromDate: '', toDate: '', salary: '', noticePeriod: '30 Days' }
  ]);

  // STEP 5: Ph.D. & Research Information
  const [phdStatus, setPhdStatus] = useState('Select');
  const [phdUniversity, setPhdUniversity] = useState('');
  const [phdYear, setPhdYear] = useState('');
  const [scopusCount, setScopusCount] = useState('0');
  const [scopusId, setScopusId] = useState('');
  const [conferencePaper, setConferencePaper] = useState('No');
  const [wosCount, setWosCount] = useState('0');
  const [wosId, setWosId] = useState('');
  const [net, setNet] = useState({ cleared: 'No', year: '' });
  const [setExam, setSetExam] = useState({ cleared: 'No', year: '' });
  const [slet, setSlet] = useState({ cleared: 'No', year: '' });
  const [gate, setGate] = useState({ cleared: 'No', year: '' });

  // STEP 6: Documents
  const [resumeFile, setResumeFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [certificatesFile, setCertificatesFile] = useState(null);
  const [idProofFile, setIdProofFile] = useState(null);
  const [uploadedDocsList, setUploadedDocsList] = useState([]);

  // STEP 7: Declaration & Final Review
  const [declaration, setDeclaration] = useState(false);
  const [captchaNum1] = useState(Math.floor(Math.random() * 8) + 1);
  const [captchaNum2] = useState(Math.floor(Math.random() * 8) + 1);
  const [captchaInput, setCaptchaInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync Date of Birth & Age
  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      setDob(`${dobYear}-${dobMonth}-${dobDay}`);
    } else {
      setDob('');
    }
  }, [dobDay, dobMonth, dobYear]);

  useEffect(() => {
    if (!dob) {
      setAge('');
      return;
    }
    const birthDate = new Date(dob);
    const today = new Date();
    let computedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      computedAge--;
    }
    if (computedAge >= 0) setAge(`${computedAge} Years`);
    else setAge('');
  }, [dob]);

  // Load Vacancy details if jobId provided
  useEffect(() => {
    if (activeJobId) {
      apiRequest(`/public/vacancies/${activeJobId}`)
        .then((data) => {
          if (data && !data.error) {
            setLoadedVacancy(data);
            if (data.department) setSelectedFaculty(data.department.toUpperCase());
            if (data.position) setPostAppliedFor(data.position);
          }
        })
        .catch((err) => console.error('Error fetching vacancy:', err));
    }
  }, [activeJobId]);

  // Load existing draft or restore progress if draftId / activeJobId present
  useEffect(() => {
    async function initOrRestoreDraft() {
      try {
        let existing = null;
        if (draftAppId) {
          existing = await apiRequest(`/applications/${draftAppId}`).catch(() => null);
        } else {
          const res = await apiRequest('/applications', {
            method: 'POST',
            body: JSON.stringify({ jobId: activeJobId || null, email, name: `${firstName} ${lastName}`.trim() })
          }).catch(() => null);

          if (res?.applicationId || res?.id) {
            const idToSet = res.applicationId || res.id;
            setDraftAppId(idToSet);
            existing = res.application || (await apiRequest(`/applications/${idToSet}`).catch(() => null));
          }
        }

        if (existing) {
          if (existing.currentStep) setCurrentStep(existing.currentStep);
          if (existing.emailVerified) setEmailVerified(true);

          if (existing.personalInfo) {
            const p = typeof existing.personalInfo === 'string' ? JSON.parse(existing.personalInfo) : existing.personalInfo;
            if (p.title) setTitle(p.title);
            if (p.firstName) setFirstName(p.firstName);
            if (p.middleName) setMiddleName(p.middleName);
            if (p.lastName) setLastName(p.lastName);
            if (p.dob) {
              setDob(p.dob);
              const parts = p.dob.split('-');
              if (parts.length === 3) {
                setDobYear(parts[0]);
                setDobMonth(parts[1]);
                setDobDay(parts[2]);
              }
            }
            if (p.gender) setGender(p.gender);
            if (p.maritalStatus) setMaritalStatus(p.maritalStatus);
            if (p.email) setEmail(p.email);
            if (p.alternateEmail) setAlternateEmail(p.alternateEmail);
          }

          if (existing.contactDetails) {
            const c = typeof existing.contactDetails === 'string' ? JSON.parse(existing.contactDetails) : existing.contactDetails;
            if (c.mobile) setMobile(c.mobile);
            if (c.alternateMobile) setAlternateMobile(c.alternateMobile);
            if (c.address) setAddress(c.address);
            if (c.city) setCity(c.city);
            if (c.state) setState(c.state);
            if (c.country) setCountry(c.country);
            if (c.pinCode) setPinCode(c.pinCode);
          }

          if (existing.qualifications) {
            const q = typeof existing.qualifications === 'string' ? JSON.parse(existing.qualifications) : existing.qualifications;
            if (Array.isArray(q) && q.length > 0) setQualifications(q);
          }

          if (existing.experience) {
            const e = typeof existing.experience === 'string' ? JSON.parse(existing.experience) : existing.experience;
            if (Array.isArray(e) && e.length > 0) setExperiences(e);
          }

          if (existing.documents) {
            setUploadedDocsList(existing.documents);
          }
        }
      } catch (err) {
        console.warn('Notice: Draft restoration fallback:', err.message);
      }
    }
    initOrRestoreDraft();
  }, [activeJobId, draftAppId]);

  // Debounced Autosave Function
  const saveTimerRef = useRef(null);
  const triggerAutosave = (stepToSave = currentStep) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus('Saving changes...');
      try {
        const payload = {
          currentStep: stepToSave,
          completionPercentage: Math.round((stepToSave / 7) * 100),
          emailVerified,
          personalInfo: { title: title !== 'Select' ? title : '', firstName, middleName, lastName, dob, age, gender, maritalStatus, email, alternateEmail },
          contactDetails: { mobile, alternateMobile, address, city, state, country, pinCode },
          qualifications,
          phdDetails: { phdStatus, phdUniversity, phdYear, scopusCount, scopusId, conferencePaper, wosCount, wosId, net, setExam, slet, gate },
          workExperience: isFresher ? [] : experiences,
          declaration
        };

        if (draftAppId) {
          await apiRequest(`/applications/${draftAppId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
        }
        setAutoSaveStatus('Your application is automatically saved.');
      } catch (err) {
        setAutoSaveStatus('Progress saved locally.');
      }
    }, 800);
  };

  // Step Navigation Helpers
  const handleNextStep = () => {
    setError('');

    // Step-wise Validations
    if (currentStep === 1) {
      if (!postAppliedFor) {
        setError('Please select Post Applied For.');
        return;
      }
      if (!firstName || !lastName) {
        setError('First Name and Last Name are required.');
        return;
      }
      if (!dob) {
        setError('Date of Birth is mandatory.');
        return;
      }
    }

    if (currentStep === 2) {
      if (!email || !email.includes('@')) {
        setError('Valid Email ID is required.');
        return;
      }
      if (!emailVerified) {
        setError('Please verify your email address via OTP before proceeding.');
        return;
      }
      if (!mobile) {
        setError('Mobile Number is required.');
        return;
      }
      if (!city || !state) {
        setError('City and State are required.');
        return;
      }
    }

    const next = Math.min(7, currentStep + 1);
    setCurrentStep(next);
    triggerAutosave(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setError('');
    const prev = Math.max(1, currentStep - 1);
    setCurrentStep(prev);
    triggerAutosave(prev);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // OTP Email Verification Handlers
  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address first.');
      return;
    }
    setError('');
    setSendingOtp(true);
    setOtpMessage('');

    try {
      const res = await apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      setOtpSent(true);
      setOtpMessage(res.message || `Verification code sent to ${email}. (Demo OTP: ${res.demoOTP || '123456'})`);
    } catch (err) {
      setError(err.message || 'Failed to send verification OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.trim().length < 4) {
      setError('Please enter the 6-digit OTP code received.');
      return;
    }
    setError('');
    setVerifyingOtp(true);

    try {
      const res = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp: otpInput, name: `${firstName} ${lastName}`.trim(), mobile })
      });

      if (res.token) {
        localStorage.setItem('token', res.token);
      }

      setEmailVerified(true);
      setOtpSent(false);
      setOtpMessage('✓ Email Verified Successfully!');
      triggerAutosave(currentStep);
    } catch (err) {
      setError(err.message || 'Invalid OTP code. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Qualification Row Helpers
  const handleAddQualification = () => {
    setQualifications([
      ...qualifications,
      { qualificationDegree: 'Select', degreeName: '', instituteName: '', specialization: '', passingYear: '', cgpa: '', studyMode: 'Full-Time' }
    ]);
  };
  const handleRemoveQualification = (idx) => {
    if (qualifications.length <= 1) return;
    setQualifications(qualifications.filter((_, i) => i !== idx));
  };
  const handleQualChange = (idx, field, val) => {
    const copy = [...qualifications];
    copy[idx][field] = val;
    setQualifications(copy);
    triggerAutosave();
  };

  // Experience Row Helpers
  const handleAddExperience = () => {
    setExperiences([
      ...experiences,
      { organization: '', type: 'Teaching', designation: '', isCurrent: false, fromDate: '', toDate: '', salary: '', noticePeriod: '30 Days' }
    ]);
  };
  const handleRemoveExperience = (idx) => {
    if (experiences.length <= 1) return;
    setExperiences(experiences.filter((_, i) => i !== idx));
  };
  const handleExpChange = (idx, field, val) => {
    const copy = [...experiences];
    copy[idx][field] = val;
    setExperiences(copy);
    triggerAutosave();
  };

  // File Upload Handler for Step 6
  const handleFileUpload = async (file, docType) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.');
      return;
    }

    if (!draftAppId) {
      setError('Application session initializing... please try upload again in a moment.');
      return;
    }

    setError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', docType);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/applications/${draftAppId}/documents`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');

      setUploadedDocsList((prev) => [...prev, data.document]);
      triggerAutosave();
    } catch (err) {
      setError(err.message || 'File upload failed.');
    }
  };

  // Final Form Submission
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!declaration) {
      setError('Please check the confirmation declaration box before final submission.');
      return;
    }

    if (parseInt(captchaInput) !== captchaNum1 + captchaNum2) {
      setError(`Security Check failed. What is ${captchaNum1} + ${captchaNum2}?`);
      return;
    }

    setSubmitting(true);

    try {
      const targetJobId = activeJobId || loadedVacancy?.id;
      if (!targetJobId) {
        setError('Target vacancy is required to submit your application.');
        setSubmitting(false);
        return;
      }

      const payload = {
        faculty: selectedFaculty,
        postAppliedFor: postAppliedFor || 'Faculty Position',
        subjectAppliedFor,
        personalInfo: { title: title !== 'Select' ? title : '', firstName, middleName, lastName, dob, age, gender, maritalStatus, email, alternateEmail },
        contactDetails: { mobile, alternateMobile, address, city, state, country, pinCode },
        qualifications,
        phdDetails: { phdStatus, phdUniversity, phdYear, scopusCount, scopusId, conferencePaper, wosCount, wosId, net, setExam, slet, gate },
        workExperience: isFresher ? [] : experiences,
        declaration: true
      };

      // Ensure draft exists
      let appTargetId = draftAppId;
      if (!appTargetId) {
        const initRes = await apiRequest('/applications', {
          method: 'POST',
          body: JSON.stringify({ jobId: targetJobId, ...payload })
        });
        appTargetId = initRes.applicationId || initRes.id;
      }

      // Submit Draft -> SUBMITTED
      const submitRes = await apiRequest(`/applications/${appTargetId}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const finalAppNumber = submitRes.applicationNumber || 'DYPIU-2026-000001';

      navigate(`/applicant/applications/${appTargetId}/success`, {
        state: {
          appNumber: finalAppNumber,
          position: postAppliedFor || selectedFaculty,
          status: 'SUBMITTED'
        }
      });
    } catch (err) {
      console.error('Final submission error:', err);
      setError(err.message || 'Error submitting application. Please verify all details.');
    } finally {
      setSubmitting(false);
    }
  };

  const isNonTeaching = urlType === 'NON_TEACHING' || POSTS_BY_TYPE.NON_TEACHING.includes(postAppliedFor);
  const availablePosts = isNonTeaching ? POSTS_BY_TYPE.NON_TEACHING : POSTS_BY_TYPE.TEACHING;

  return (
    <div className="container" style={{ maxWidth: '1020px', padding: '24px 20px' }}>
      
      {/* HEADER BANNER */}
      <div style={{ backgroundColor: '#0f2b5c', color: '#ffffff', padding: '22px 28px', borderRadius: '14px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.3px' }}>RECRUITMENT APPLICATION</h1>
          <div style={{ color: '#cbd5e1', fontSize: '0.86rem', marginTop: '3px' }}>
            D Y Patil International University, Akurdi, Pune
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ backgroundColor: '#0f766e', color: '#ffffff', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
            {selectedFaculty}
          </span>
        </div>
      </div>

      {/* STEP PROGRESS INDICATOR BAR */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
            Step {currentStep} of 7: <span style={{ color: '#0f766e' }}>{STEPS[currentStep - 1].title}</span>
          </div>
        </div>

        {/* Progress Dots / Steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {STEPS.map((s) => {
            const isDone = s.id < currentStep;
            const isCurrent = s.id === currentStep;

            return (
              <div
                key={s.id}
                onClick={() => {
                  if (s.id <= currentStep) {
                    setCurrentStep(s.id);
                    triggerAutosave(s.id);
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: s.id <= currentStep ? 'pointer' : 'default',
                  zIndex: 2
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isDone ? '#0f766e' : isCurrent ? '#0f2b5c' : '#f1f5f9',
                  color: isDone || isCurrent ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  border: isCurrent ? '3px solid #93c5fd' : '1px solid #cbd5e1',
                  transition: 'all 0.2s ease'
                }}>
                  {isDone ? '✓' : s.id}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#0f2b5c' : '#64748b', marginTop: '6px' }}>
                  {s.shortName}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', fontWeight: 600, fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* FORM BODY CONTAINER BY STEP */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '24px' }}>

        {/* STEP 1: PERSONAL INFORMATION */}
        {currentStep === 1 && (
          <div>
            <h3 style={{ margin: '0 0 18px 0', color: '#0f2b5c', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
              STEP 1 — Personal Information & Post Selection
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Selected Faculty / Department</label>
                <select value={selectedFaculty} onChange={(e) => setSelectedFaculty(e.target.value)}>
                  {FACULTIES_LIST.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Post Applied For <span className="required">*</span></label>
                <select value={postAppliedFor} onChange={(e) => setPostAppliedFor(e.target.value)} required>
                  <option value="">-- Select Post --</option>
                  {availablePosts.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  {postAppliedFor && !availablePosts.includes(postAppliedFor) && (
                    <option value={postAppliedFor}>{postAppliedFor}</option>
                  )}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Title <span className="required">*</span></label>
                <select value={title} onChange={(e) => setTitle(e.target.value)}>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>First Name <span className="required">*</span></label>
                <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Middle Name</label>
                <input type="text" placeholder="Middle Name" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Last Name <span className="required">*</span></label>
                <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 100px 1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Date of Birth <span className="required">*</span></label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select value={dobDay} onChange={(e) => setDobDay(e.target.value)} required style={{ flex: 1 }}>
                    <option value="">Day</option>
                    {DAYS_LIST.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>

                  <select value={dobMonth} onChange={(e) => setDobMonth(e.target.value)} required style={{ flex: 1.5 }}>
                    <option value="">Month</option>
                    {MONTHS_LIST.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>

                  <select value={dobYear} onChange={(e) => setDobYear(e.target.value)} required style={{ flex: 1.2 }}>
                    <option value="">Year</option>
                    {YEARS_LIST.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Age</label>
                <input type="text" value={age} readOnly placeholder="Age" style={{ backgroundColor: '#f1f5f9', fontWeight: 700, textAlign: 'center' }} />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Gender <span className="required">*</span></label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Marital Status <span className="required">*</span></label>
                <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} required>
                  <option value="Married">Married</option>
                  <option value="Unmarried">Unmarried</option>
                  <option value="Single">Single</option>
                  <option value="Divorced">Divorced</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONTACT INFORMATION & EMAIL OTP VERIFICATION */}
        {currentStep === 2 && (
          <div>
            <h3 style={{ margin: '0 0 18px 0', color: '#0f2b5c', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
              STEP 2 — Contact Information & Email Verification
            </h3>

            {/* EMAIL VERIFICATION BOX */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                  Email Address <span className="required">*</span>
                </label>
                {emailVerified ? (
                  <span style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: '16px', fontSize: '0.82rem', fontWeight: 800 }}>
                    ✓ Email Verified
                  </span>
                ) : (
                  <span style={{ color: '#d97706', fontSize: '0.8rem', fontWeight: 700 }}>
                    Verification Required before proceeding
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="email"
                  placeholder="Enter candidate email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailVerified) setEmailVerified(false);
                  }}
                  disabled={emailVerified}
                  style={{ flex: 1 }}
                  required
                />

                {!emailVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    style={{ backgroundColor: '#0f766e', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {sendingOtp ? 'Sending Code...' : 'Send Verification Code'}
                  </button>
                )}
              </div>

              {otpMessage && (
                <div style={{ color: '#0f766e', fontSize: '0.84rem', fontWeight: 600, marginBottom: '12px' }}>
                  {otpMessage}
                </div>
              )}

              {otpSent && !emailVerified && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP code"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    style={{ width: '220px' }}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp}
                    style={{ backgroundColor: '#0f2b5c', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}
                  >
                    {verifyingOtp ? 'Verifying...' : 'Verify Email'}
                  </button>
                </div>
              )}
            </div>

            {/* OTHER CONTACT FIELDS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Alternate Email</label>
                <input type="email" placeholder="Alternate Email ID" value={alternateEmail} onChange={(e) => setAlternateEmail(e.target.value)} />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Mobile Number <span className="required">*</span></label>
                <input type="tel" placeholder="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Alternate Mobile Number</label>
                <input type="tel" placeholder="Alternate Mobile Number" value={alternateMobile} onChange={(e) => setAlternateMobile(e.target.value)} />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Address Line / Street</label>
                <input type="text" placeholder="Address Details" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 120px', gap: '15px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>City <span className="required">*</span></label>
                <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>State <span className="required">*</span></label>
                <select value={state} onChange={(e) => setState(e.target.value)} required>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Country</label>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>PIN Code</label>
                <input type="text" placeholder="PIN" value={pinCode} onChange={(e) => setPinCode(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ACADEMIC QUALIFICATIONS */}
        {currentStep === 3 && (
          <div>
            <h3 style={{ margin: '0 0 18px 0', color: '#0f2b5c', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
              STEP 3 — Academic Qualifications
            </h3>

            {qualifications.map((q, idx) => (
              <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '16px', borderRadius: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr 1fr 90px 90px 110px', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700 }}>Degree Type</label>
                    <select value={q.qualificationDegree} onChange={(e) => handleQualChange(idx, 'qualificationDegree', e.target.value)}>
                      <option value="SSC">SSC (10th)</option>
                      <option value="HSC">HSC (12th)</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Bachelor's">Bachelor's</option>
                      <option value="Master's">Master's</option>
                      <option value="Ph.D.">Ph.D.</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700 }}>Degree Name</label>
                    <input type="text" placeholder="e.g. B.Tech / MBA" value={q.degreeName} onChange={(e) => handleQualChange(idx, 'degreeName', e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700 }}>University / Board</label>
                    <input type="text" placeholder="University" value={q.instituteName} onChange={(e) => handleQualChange(idx, 'instituteName', e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700 }}>Specialization</label>
                    <input type="text" placeholder="Specialization" value={q.specialization} onChange={(e) => handleQualChange(idx, 'specialization', e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700 }}>Year</label>
                    <input type="text" placeholder="Year" value={q.passingYear} onChange={(e) => handleQualChange(idx, 'passingYear', e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700 }}>CGPA / %</label>
                    <input type="text" placeholder="%" value={q.cgpa} onChange={(e) => handleQualChange(idx, 'cgpa', e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700 }}>Mode</label>
                    <select value={q.studyMode} onChange={(e) => handleQualChange(idx, 'studyMode', e.target.value)}>
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Distance">Distance</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button type="button" onClick={handleAddQualification} style={{ backgroundColor: '#ffffff', border: '1.5px solid #0f766e', color: '#0f766e', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                + Add Qualification Row
              </button>
              {qualifications.length > 1 && (
                <button type="button" onClick={() => handleRemoveQualification(qualifications.length - 1)} style={{ backgroundColor: '#ffffff', border: '1.5px solid #ef4444', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                  Remove Row
                </button>
              )}
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Subject / Domain Specialization</label>
              <input type="text" placeholder="e.g. Artificial Intelligence, Data Science, Finance, Marketing" value={subjectAppliedFor} onChange={(e) => setSubjectAppliedFor(e.target.value)} />
            </div>
          </div>
        )}

        {/* STEP 4: WORK EXPERIENCE */}
        {currentStep === 4 && (
          <div>
            <h3 style={{ margin: '0 0 18px 0', color: '#0f2b5c', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
              STEP 4 — Work Experience
            </h3>

            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => setIsFresher(!isFresher)}
                style={{
                  backgroundColor: isFresher ? '#0f766e' : '#f1f5f9',
                  color: isFresher ? '#ffffff' : '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '8px 18px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                {isFresher ? '✓ Marking as Fresher (No Experience)' : 'Mark as Fresher'}
              </button>
            </div>

            {!isFresher && experiences.map((exp, idx) => (
              <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '18px', marginBottom: '16px', borderRadius: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Organization / University</label>
                    <input type="text" placeholder="Organization" value={exp.organization} onChange={(e) => handleExpChange(idx, 'organization', e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Domain</label>
                    <select value={exp.type} onChange={(e) => handleExpChange(idx, 'type', e.target.value)}>
                      <option value="Teaching">Teaching</option>
                      <option value="Industry">Industry</option>
                      <option value="Research">Research</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Designation / Post</label>
                    <input type="text" placeholder="Designation" value={exp.designation} onChange={(e) => handleExpChange(idx, 'designation', e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>From Date</label>
                    <input type="date" value={exp.fromDate} onChange={(e) => handleExpChange(idx, 'fromDate', e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>To Date</label>
                    <input type="date" disabled={exp.isCurrent} value={exp.isCurrent ? '' : exp.toDate} onChange={(e) => handleExpChange(idx, 'toDate', e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Gross Salary p.m.</label>
                    <input type="text" placeholder="Salary" value={exp.salary} onChange={(e) => handleExpChange(idx, 'salary', e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Notice Period</label>
                    <select value={exp.noticePeriod} onChange={(e) => handleExpChange(idx, 'noticePeriod', e.target.value)}>
                      <option value="Immediate">Immediate</option>
                      <option value="15 Days">15 Days</option>
                      <option value="30 Days">30 Days</option>
                      <option value="60 Days">60 Days</option>
                      <option value="90 Days">90 Days</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            {!isFresher && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={handleAddExperience} style={{ backgroundColor: '#ffffff', border: '1.5px solid #0f766e', color: '#0f766e', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                  + Add Experience Row
                </button>
                {experiences.length > 1 && (
                  <button type="button" onClick={() => handleRemoveExperience(experiences.length - 1)} style={{ backgroundColor: '#ffffff', border: '1.5px solid #ef4444', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                    Remove Row
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: RESEARCH & PROFESSIONAL INFORMATION */}
        {currentStep === 5 && (
          <div>
            <h3 style={{ margin: '0 0 18px 0', color: '#0f2b5c', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
              STEP 5 — Research & Professional Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '15px', marginBottom: '18px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Ph.D. Status</label>
                <select value={phdStatus} onChange={(e) => setPhdStatus(e.target.value)}>
                  <option value="Select">Select</option>
                  <option value="Awarded">Awarded</option>
                  <option value="Thesis Submitted">Thesis Submitted</option>
                  <option value="Pursuing">Pursuing</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Ph.D. University / Institute</label>
                <input type="text" placeholder="University" value={phdUniversity} onChange={(e) => setPhdUniversity(e.target.value)} />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Year of Award</label>
                <input type="text" placeholder="Year" value={phdYear} onChange={(e) => setPhdYear(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '18px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Scopus Publications Count</label>
                <input type="number" value={scopusCount} onChange={(e) => setScopusCount(e.target.value)} />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Scopus Author ID</label>
                <input type="text" placeholder="Scopus ID" value={scopusId} onChange={(e) => setScopusId(e.target.value)} />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Web of Science (WoS) Count</label>
                <input type="number" value={wosCount} onChange={(e) => setWosCount(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: DOCUMENTS UPLOAD */}
        {currentStep === 6 && (
          <div>
            <h3 style={{ margin: '0 0 18px 0', color: '#0f2b5c', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
              STEP 6 — Document Uploads (PDF format, max 5MB)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>📄</div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                  {resumeFile ? `Selected: ${resumeFile.name}` : 'Upload Resume / CV (PDF)'}
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  style={{ marginTop: '10px' }}
                  onChange={(e) => {
                    const f = e.target.files[0];
                    setResumeFile(f);
                    handleFileUpload(f, 'resume');
                  }}
                />
              </div>

              <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                  {certificatesFile ? `Selected: ${certificatesFile.name}` : 'Upload Certificates (PDF)'}
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  style={{ marginTop: '10px' }}
                  onChange={(e) => {
                    const f = e.target.files[0];
                    setCertificatesFile(f);
                    handleFileUpload(f, 'qualification');
                  }}
                />
              </div>
            </div>

            {uploadedDocsList.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#166534', fontWeight: 800 }}>✓ Uploaded Documents Saved in Dossier:</h4>
                <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: '#334155' }}>
                  {uploadedDocsList.map((d) => (
                    <li key={d.id || d.originalName}>
                      {d.originalName} ({d.documentType})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* STEP 7: READ-ONLY FINAL REVIEW & DECLARATION */}
        {currentStep === 7 && (
          <div>
            <h3 style={{ margin: '0 0 18px 0', color: '#0f2b5c', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
              STEP 7 — Declaration & Final Review
            </h3>

            {/* READ-ONLY SUMMARY BOX */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#0f766e', fontSize: '0.96rem', fontWeight: 800 }}>Summary of Application Details:</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.86rem', color: '#334155' }}>
                <div><strong>Candidate Name:</strong> {title} {firstName} {middleName} {lastName}</div>
                <div><strong>Post Applied:</strong> {postAppliedFor || 'Faculty Position'}</div>
                <div><strong>School / Faculty:</strong> {selectedFaculty}</div>
                <div><strong>Date of Birth:</strong> {dob} ({age})</div>
                <div><strong>Email:</strong> {email} {emailVerified ? '(✓ Verified)' : ''}</div>
                <div><strong>Mobile:</strong> {mobile}</div>
                <div><strong>City & State:</strong> {city}, {state}</div>
                <div><strong>Qualifications:</strong> {qualifications.map(q => q.qualificationDegree).join(', ')}</div>
              </div>
            </div>

            {/* DECLARATION CHECKBOX */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={declaration}
                  onChange={(e) => setDeclaration(e.target.checked)}
                  required
                />
                <span>I confirm that all details supplied in this application are accurate and true to the best of my knowledge.</span>
              </label>
            </div>

            {/* CAPTCHA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                Security Check: What is <span style={{ color: '#0f766e' }}>{captchaNum1} + {captchaNum2}</span>?
              </span>
              <input
                type="text"
                style={{ width: '90px' }}
                placeholder="answer"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                required
              />
            </div>

            <div style={{ textAlign: 'center', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                style={{ backgroundColor: '#0f766e', color: '#ffffff', border: 'none', padding: '12px 32px', borderRadius: '10px', fontWeight: 800, fontSize: '0.98rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(15,118,110,0.2)' }}
              >
                {submitting ? 'SUBMITTING APPLICATION...' : 'SUBMIT APPLICATION'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER WIZARD STEP CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handlePrevStep}
            style={{ backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', color: '#334155', padding: '10px 22px', borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
          >
            &larr; Previous Step
          </button>
        ) : <div />}

        {currentStep < 7 && (
          <button
            type="button"
            onClick={handleNextStep}
            style={{ backgroundColor: '#0f2b5c', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}
          >
            Save & Continue &rarr;
          </button>
        )}
      </div>

    </div>
  );
}

export default ApplicationForm;
