import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiRequest } from '../utils/api';

const FACULTIES_LIST = [
  'SCHOOL OF COMPUTER SCIENCE & ENGINEERING',
  'SCHOOL OF MANAGEMENT',
  'SCHOOL OF BIOSCIENCES & BIOENGINEERING',
  'SCHOOL OF DESIGN',
  'SCHOOL OF MEDIA & JOURNALISM',
  'SCHOOL OF PHARMACY',
  'SCHOOL OF LIBERAL ARTS & HUMANITIES',
  'RESEARCH & INNOVATION CENTRES',
  'ADMINISTRATIVE & REGISTRAR OFFICE',
  'SYSTEMS & IT INFRASTRUCTURE',
  'TECHNICAL & LABORATORY ASSISTANTS',
  'FINANCE & ACCOUNTS DEPARTMENT',
  'LIBRARY & INFORMATION SERVICES',
  'EXECUTIVE & SECRETARIAL SUPPORT',
  'NON-TEACHING & ADMINISTRATIVE STAFF'
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
    'Executive Assistant / Stenographer',
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

function ApplicationForm() {
  const [searchParams] = useSearchParams();
  const { jobId: routeJobId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const queryJobId = searchParams.get('jobId');
  const activeJobId = queryJobId || routeJobId;

  const urlFaculty = searchParams.get('faculty') ? decodeURIComponent(searchParams.get('faculty')) : '';
  const urlType = searchParams.get('type') || 'TEACHING';

  const [selectedFaculty, setSelectedFaculty] = useState(urlFaculty || 'SCHOOL OF COMPUTER SCIENCE & ENGINEERING');
  const [postAppliedFor, setPostAppliedFor] = useState('');
  const [subjectAppliedFor, setSubjectAppliedFor] = useState('');
  const [instituteAppliedTo, setInstituteAppliedTo] = useState('D Y Patil International University, Akurdi, Pune');
  const [loadedVacancy, setLoadedVacancy] = useState(null);

  // Fetch active vacancy details if jobId is provided
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
        .catch((err) => console.error('Error fetching vacancy in ApplicationForm:', err));
    }
  }, [activeJobId]);

  // Personal Info
  const [title, setTitle] = useState('Select');
  const [firstName, setFirstName] = useState(user?.name?.split(' ')[0] || '');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState(user?.name?.split(' ').slice(1).join(' ') || '');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState('');

  // Sync Day/Month/Year dropdowns with dob string
  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      setDob(`${dobYear}-${dobMonth}-${dobDay}`);
    } else {
      setDob('');
    }
  }, [dobDay, dobMonth, dobYear]);
  const [gender, setGender] = useState('Male');
  const [maritalStatus, setMaritalStatus] = useState('Married');
  const [email, setEmail] = useState(user?.email || '');
  const [alternateEmail, setAlternateEmail] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [city, setCity] = useState('Pune');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');

  // Qualifications
  const [qualifications, setQualifications] = useState([
    {
      qualificationDegree: 'Select',
      degreeName: '',
      instituteName: '',
      specialization: '',
      passingYear: '',
      cgpa: '',
      studyMode: 'Select'
    }
  ]);

  // Ph.D. details
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

  // Work Experience
  const [isFresher, setIsFresher] = useState(false);
  const [experiences, setExperiences] = useState([
    {
      organization: '',
      type: 'Select Teaching/Industry',
      designation: '',
      isCurrent: false,
      fromDate: '',
      toDate: '',
      salary: '',
      noticePeriod: 'Select Notice Period'
    }
  ]);

  // File & submission
  const [resumeFile, setResumeFile] = useState(null);
  const [declaration, setDeclaration] = useState(false);
  const [captchaNum1] = useState(Math.floor(Math.random() * 8) + 1);
  const [captchaNum2] = useState(Math.floor(Math.random() * 8) + 1);
  const [captchaInput, setCaptchaInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto calculate age
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

  const handleAddQualification = () => {
    setQualifications([
      ...qualifications,
      {
        qualificationDegree: 'Select',
        degreeName: '',
        instituteName: '',
        specialization: '',
        passingYear: '',
        cgpa: '',
        studyMode: 'Select'
      }
    ]);
  };

  const handleRemoveQualification = (index) => {
    if (qualifications.length <= 1) return;
    setQualifications(qualifications.filter((_, i) => i !== index));
  };

  const handleQualChange = (index, field, value) => {
    const updated = [...qualifications];
    updated[index][field] = value;
    setQualifications(updated);
  };

  const handleAddExperience = () => {
    setExperiences([
      ...experiences,
      {
        organization: '',
        type: 'Select Teaching/Industry',
        designation: '',
        isCurrent: false,
        fromDate: '',
        toDate: '',
        salary: '',
        noticePeriod: 'Select Notice Period'
      }
    ]);
  };

  const handleRemoveExperience = (index) => {
    if (experiences.length <= 1) return;
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const handleExpChange = (index, field, value) => {
    const updated = [...experiences];
    updated[index][field] = value;
    setExperiences(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!postAppliedFor || postAppliedFor === 'Select Post Applied For') {
      setError('Please select the Post Applied For.');
      window.scrollTo(0, 0);
      return;
    }

    if (!firstName || !lastName) {
      setError('First Name and Last Name are required.');
      window.scrollTo(0, 0);
      return;
    }

    if (!dob) {
      setError('Date of Birth is mandatory.');
      window.scrollTo(0, 0);
      return;
    }

    if (!email || !mobile) {
      setError('Email ID and Mobile Number are mandatory.');
      window.scrollTo(0, 0);
      return;
    }

    if (!declaration) {
      setError('Please confirm the declaration check before submitting.');
      return;
    }

    if (parseInt(captchaInput) !== captchaNum1 + captchaNum2) {
      setError(`Math Security check failed. What is ${captchaNum1} + ${captchaNum2}?`);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        faculty: selectedFaculty,
        postAppliedFor: postAppliedFor || 'Faculty Position',
        subjectAppliedFor,
        personalInfo: { title, firstName, middleName, lastName, dob, age, gender, maritalStatus, email, alternateEmail },
        contactDetails: { state, city, mobile, alternateMobile, instituteAppliedTo },
        qualifications,
        phdDetails: { phdStatus, phdUniversity, phdYear, scopusCount, scopusId, conferencePaper, wosCount, wosId, net, setExam, slet, gate },
        workExperience: isFresher ? [] : experiences,
        declaration: true
      };

      const fullName = `${title !== 'Select' ? title : ''} ${firstName} ${lastName}`.trim();
      const catType = urlType || (isNonTeaching ? 'NON_TEACHING' : 'TEACHING');

      // If active open vacancy exists
      if (activeJobId && loadedVacancy && (loadedVacancy.isApplicationOpen !== false || loadedVacancy.status === 'PUBLISHED')) {
        const response = await apiRequest('/applications', {
          method: 'POST',
          body: JSON.stringify({ jobId: activeJobId, ...payload })
        });

        const targetId = response.applicationId || response.id || 'app-new';

        const submitRes = await apiRequest(`/applications/${targetId}/submit`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        navigate(`/applicant/applications/${targetId}/success`, {
          state: {
            appNumber: submitRes.applicationNumber || 'APP-2026-000001',
            position: postAppliedFor || selectedFaculty,
            status: 'SUBMITTED'
          }
        });
      } else {
        // No active open vacancy for this specific submission -> Save Interest Request
        await apiRequest('/public/vacancy-interest', {
          method: 'POST',
          body: JSON.stringify({
            name: fullName,
            email,
            mobile,
            interestedPosition: postAppliedFor || selectedFaculty,
            category: catType,
            message: `Applied via form for ${selectedFaculty}. Qualification: ${qualifications[0]?.qualificationDegree || ''}`
          })
        });

        const randomRef = `INT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

        navigate(`/applicant/applications/success`, {
          state: {
            isInterest: true,
            appNumber: randomRef,
            position: postAppliedFor || selectedFaculty,
            status: 'WILL NOTIFY WHEN OPEN',
            message: 'Thank you for submitting your form! Applications for this position are currently closed. We have registered your details in our system and will automatically notify you as soon as a relevant vacancy opens at D Y Patil International University.'
          }
        });
      }
    } catch (err) {
      setError(err.message || 'Error submitting application. Please check all required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const NON_TEACHING_NAMES = [
    'NON-TEACHING & ADMINISTRATIVE STAFF',
    'ADMINISTRATIVE & REGISTRAR OFFICE',
    'SYSTEMS & IT INFRASTRUCTURE',
    'TECHNICAL & LABORATORY ASSISTANTS',
    'FINANCE & ACCOUNTS DEPARTMENT',
    'LIBRARY & INFORMATION SERVICES',
    'EXECUTIVE & SECRETARIAL SUPPORT'
  ];
  const isNonTeaching = urlType === 'NON_TEACHING' || NON_TEACHING_NAMES.includes(selectedFaculty);
  const availablePosts = isNonTeaching ? POSTS_BY_TYPE.NON_TEACHING : POSTS_BY_TYPE.TEACHING;

  return (
    <div className="container" style={{ maxWidth: '1050px' }}>
      
      {/* Header Banner */}
      <div className="form-header-card">
        <div>
          <h1>RECRUITMENT APPLICATION</h1>
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
            D Y Patil International University, Akurdi, Pune
          </div>
        </div>
        <div>
          <span className="badge-school">{selectedFaculty}</span>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '14px 18px', borderRadius: '8px', marginBottom: '25px', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* SECTION 1: POST APPLIED FOR */}
        <div className="form-section-card">
          <div className="form-section-header">
            <span>📌</span>
            <span>POST & SPECIALIZATION DETAILS</span>
          </div>
          <div className="form-section-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label>Selected Faculty / Department</label>
                <select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                >
                  {FACULTIES_LIST.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                  {selectedFaculty && !FACULTIES_LIST.includes(selectedFaculty) && (
                    <option value={selectedFaculty}>{selectedFaculty}</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Post Applied For <span className="required">*</span></label>
                <select
                  value={postAppliedFor}
                  onChange={(e) => setPostAppliedFor(e.target.value)}
                  required
                >
                  <option value="">Select Post Applied For</option>
                  {availablePosts.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  {postAppliedFor && !availablePosts.includes(postAppliedFor) && (
                    <option value={postAppliedFor}>{postAppliedFor}</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: PERSONAL INFORMATION */}
        <div className="form-section-card">
          <div className="form-section-header">
            <span>👤</span>
            <span>PERSONAL INFORMATION & CONTACT DETAILS</span>
          </div>
          <div className="form-section-body">
            
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <div className="form-group">
                <label>Title <span className="required">*</span></label>
                <select value={title} onChange={(e) => setTitle(e.target.value)}>
                  <option value="Select">Select</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                </select>
              </div>

              <div className="form-group">
                <label>First Name <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Middle Name</label>
                <input
                  type="text"
                  placeholder="Middle Name"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Last Name <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Row 2: Date of Birth, Age, Gender, Marital Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div className="form-group">
                <label>Date of Birth <span className="required">*</span></label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={dobDay}
                    onChange={(e) => setDobDay(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  >
                    <option value="">Day</option>
                    {DAYS_LIST.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <select
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value)}
                    required
                    style={{ flex: 1.5 }}
                  >
                    <option value="">Month</option>
                    {MONTHS_LIST.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  <select
                    value={dobYear}
                    onChange={(e) => setDobYear(e.target.value)}
                    required
                    style={{ flex: 1.2 }}
                  >
                    <option value="">Year</option>
                    {YEARS_LIST.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Age</label>
                <input
                  type="text"
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', textAlign: 'center', fontWeight: 700, color: '#0f2b5c' }}
                  value={age}
                  readOnly
                  placeholder="Age"
                />
              </div>

              <div className="form-group">
                <label>Gender <span className="required">*</span></label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="">-- Select --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Marital Status <span className="required">*</span></label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  required
                >
                  <option value="">-- Select --</option>
                  <option value="Married">Married</option>
                  <option value="Unmarried">Unmarried</option>
                  <option value="Single">Single</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>

            {/* Emails & Mobiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label>Email ID <span className="required">*</span></label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Alternate Email ID</label>
                <input
                  type="email"
                  placeholder="Enter alternate email"
                  value={alternateEmail}
                  onChange={(e) => setAlternateEmail(e.target.value)}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label>State <span className="required">*</span></label>
                  <select value={state} onChange={(e) => setState(e.target.value)}>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>City <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Mobile No. <span className="required">*</span></label>
                  <input
                    type="tel"
                    placeholder="Mobile No"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Alternate Mobile No.</label>
                  <input
                    type="tel"
                    placeholder="Mobile No"
                    value={alternateMobile}
                    onChange={(e) => setAlternateMobile(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>University / Institute Applied To</label>
                <select value={instituteAppliedTo} onChange={(e) => setInstituteAppliedTo(e.target.value)}>
                  <option value="D Y Patil International University, Akurdi, Pune">
                    D Y Patil International University, Akurdi, Pune
                  </option>
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 3: QUALIFICATIONS */}
        <div className="form-section-card">
          <div className="form-section-header">
            <span>🎓</span>
            <span>ACADEMIC & PROFESSIONAL QUALIFICATIONS</span>
          </div>
          <div className="form-section-body">

            {qualifications.map((q, idx) => (
              <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr 100px 90px 120px', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Degree Type</label>
                    <select
                      value={q.qualificationDegree}
                      onChange={(e) => handleQualChange(idx, 'qualificationDegree', e.target.value)}
                    >
                      <option value="Select">Select</option>
                      <option value="SSC">SSC (10th)</option>
                      <option value="HSC">HSC (12th)</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Bachelor's">Bachelor's</option>
                      <option value="Master's">Master's</option>
                      <option value="M.Phil.">M.Phil.</option>
                      <option value="Ph.D.">Ph.D.</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Name of Degree</label>
                    <input
                      type="text"
                      placeholder="e.g. B.Tech / MBA"
                      value={q.degreeName}
                      onChange={(e) => handleQualChange(idx, 'degreeName', e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>University / Board</label>
                    <input
                      type="text"
                      placeholder="University name"
                      value={q.instituteName}
                      onChange={(e) => handleQualChange(idx, 'instituteName', e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Specialization</label>
                    <input
                      type="text"
                      placeholder="Specialization"
                      value={q.specialization}
                      onChange={(e) => handleQualChange(idx, 'specialization', e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Year</label>
                    <input
                      type="text"
                      placeholder="Year"
                      value={q.passingYear}
                      onChange={(e) => handleQualChange(idx, 'passingYear', e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>CGPA / %</label>
                    <input
                      type="text"
                      placeholder="% / CGPA"
                      value={q.cgpa}
                      onChange={(e) => handleQualChange(idx, 'cgpa', e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Mode</label>
                    <select
                      value={q.studyMode}
                      onChange={(e) => handleQualChange(idx, 'studyMode', e.target.value)}
                    >
                      <option value="Select">Select</option>
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Distance">Distance</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '22px' }}>
              <button type="button" className="btn-action-outline" onClick={handleAddQualification}>
                + Add Qualification Row
              </button>
              {qualifications.length > 1 && (
                <button type="button" className="btn-action-outline" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleRemoveQualification(qualifications.length - 1)}>
                  Remove Row
                </button>
              )}
            </div>

            <div className="form-group">
              <label>Subject / Domain Applied For <span className="required">*</span></label>
              <input
                type="text"
                placeholder="Enter Subject (e.g. Artificial Intelligence, Marketing, Pharmacy)"
                value={subjectAppliedFor}
                onChange={(e) => setSubjectAppliedFor(e.target.value)}
                required
              />
            </div>

            {/* Ph.D. Details */}
            {!isNonTeaching && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '20px' }}>
                <h4 style={{ color: '#0f172a', margin: '0 0 15px 0', fontSize: '1rem', fontWeight: 700 }}>Ph.D. & Research Credentials</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div className="form-group">
                    <label>Ph.D. Status</label>
                    <select value={phdStatus} onChange={(e) => setPhdStatus(e.target.value)}>
                      <option value="Select">Select</option>
                      <option value="Awarded">Awarded</option>
                      <option value="Thesis Submitted">Thesis Submitted</option>
                      <option value="Pursuing">Pursuing</option>
                      <option value="Not Applicable">Not Applicable</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>University / Institute</label>
                    <input
                      type="text"
                      placeholder="University / Institute"
                      value={phdUniversity}
                      onChange={(e) => setPhdUniversity(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Year of Passing</label>
                    <input
                      type="text"
                      placeholder="Year"
                      value={phdYear}
                      onChange={(e) => setPhdYear(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px', gap: '15px', marginBottom: '15px' }}>
                  <div className="form-group">
                    <label>Scopus Indexed Publications</label>
                    <input
                      type="number"
                      placeholder="Publication count"
                      value={scopusCount}
                      onChange={(e) => setScopusCount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Scopus Author ID</label>
                    <input
                      type="text"
                      placeholder="Scopus ID"
                      value={scopusId}
                      onChange={(e) => setScopusId(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Conference Presentations</label>
                    <div className="segmented-pill-group" style={{ marginTop: '3px' }}>
                      <button type="button" className={`segmented-pill-btn ${conferencePaper === 'Yes' ? 'active' : ''}`} onClick={() => setConferencePaper('Yes')}>Yes</button>
                      <button type="button" className={`segmented-pill-btn ${conferencePaper === 'No' ? 'active' : ''}`} onClick={() => setConferencePaper('No')}>No</button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div className="form-group">
                    <label>Web of Science (WoS) Publications</label>
                    <input
                      type="number"
                      placeholder="WoS count"
                      value={wosCount}
                      onChange={(e) => setWosCount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>WoS ID</label>
                    <input
                      type="text"
                      placeholder="WoS ID"
                      value={wosId}
                      onChange={(e) => setWosId(e.target.value)}
                    />
                  </div>
                </div>

                {/* Exams */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '13px' }}>NET</label>
                    <div className="segmented-pill-group" style={{ marginBottom: '6px' }}>
                      <button type="button" className={`segmented-pill-btn ${net.cleared === 'Yes' ? 'active' : ''}`} onClick={() => setNet({ ...net, cleared: 'Yes' })}>Yes</button>
                      <button type="button" className={`segmented-pill-btn ${net.cleared === 'No' ? 'active' : ''}`} onClick={() => setNet({ ...net, cleared: 'No' })}>No</button>
                    </div>
                    {net.cleared === 'Yes' && (
                      <input type="text" placeholder="Year" value={net.year} onChange={(e) => setNet({ ...net, year: e.target.value })} />
                    )}
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '13px' }}>SET</label>
                    <div className="segmented-pill-group" style={{ marginBottom: '6px' }}>
                      <button type="button" className={`segmented-pill-btn ${setExam.cleared === 'Yes' ? 'active' : ''}`} onClick={() => setSetExam({ ...setExam, cleared: 'Yes' })}>Yes</button>
                      <button type="button" className={`segmented-pill-btn ${setExam.cleared === 'No' ? 'active' : ''}`} onClick={() => setSetExam({ ...setExam, cleared: 'No' })}>No</button>
                    </div>
                    {setExam.cleared === 'Yes' && (
                      <input type="text" placeholder="Year" value={setExam.year} onChange={(e) => setSetExam({ ...setExam, year: e.target.value })} />
                    )}
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '13px' }}>SLET</label>
                    <div className="segmented-pill-group" style={{ marginBottom: '6px' }}>
                      <button type="button" className={`segmented-pill-btn ${slet.cleared === 'Yes' ? 'active' : ''}`} onClick={() => setSlet({ ...slet, cleared: 'Yes' })}>Yes</button>
                      <button type="button" className={`segmented-pill-btn ${slet.cleared === 'No' ? 'active' : ''}`} onClick={() => setSlet({ ...slet, cleared: 'No' })}>No</button>
                    </div>
                    {slet.cleared === 'Yes' && (
                      <input type="text" placeholder="Year" value={slet.year} onChange={(e) => setSlet({ ...slet, year: e.target.value })} />
                    )}
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '13px' }}>GATE</label>
                    <div className="segmented-pill-group" style={{ marginBottom: '6px' }}>
                      <button type="button" className={`segmented-pill-btn ${gate.cleared === 'Yes' ? 'active' : ''}`} onClick={() => setGate({ ...gate, cleared: 'Yes' })}>Yes</button>
                      <button type="button" className={`segmented-pill-btn ${gate.cleared === 'No' ? 'active' : ''}`} onClick={() => setGate({ ...gate, cleared: 'No' })}>No</button>
                    </div>
                    {gate.cleared === 'Yes' && (
                      <input type="text" placeholder="Year" value={gate.year} onChange={(e) => setGate({ ...gate, year: e.target.value })} />
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

        {/* SECTION 4: WORK EXPERIENCE */}
        <div className="form-section-card">
          <div className="form-section-header">
            <span>💼</span>
            <span>WORK EXPERIENCE (START FROM PRESENT JOB)</span>
          </div>
          <div className="form-section-body">

            <div style={{ marginBottom: '18px' }}>
              <div className="segmented-pill-group">
                <button
                  type="button"
                  className={`segmented-pill-btn ${!isFresher ? 'active' : ''}`}
                  onClick={() => setIsFresher(false)}
                >
                  Experience
                </button>
                <button
                  type="button"
                  className={`segmented-pill-btn ${isFresher ? 'active' : ''}`}
                  onClick={() => setIsFresher(true)}
                >
                  Fresher
                </button>
              </div>
            </div>

            {!isFresher && experiences.map((exp, idx) => (
              <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '18px', marginBottom: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Organization / University</label>
                    <input
                      type="text"
                      placeholder="Organization name"
                      value={exp.organization}
                      onChange={(e) => handleExpChange(idx, 'organization', e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Domain</label>
                    <select
                      value={exp.type}
                      onChange={(e) => handleExpChange(idx, 'type', e.target.value)}
                    >
                      <option value="Select Teaching/Industry">Select Teaching/Industry</option>
                      <option value="Teaching">Teaching</option>
                      <option value="Industry">Industry</option>
                      <option value="Research">Research</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Designation / Post</label>
                    <input
                      type="text"
                      placeholder="Designation"
                      value={exp.designation}
                      onChange={(e) => handleExpChange(idx, 'designation', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={exp.isCurrent}
                      onChange={(e) => handleExpChange(idx, 'isCurrent', e.target.checked)}
                    />
                    <span>I am currently working in this role</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>From Date</label>
                    <input
                      type="date"
                      value={exp.fromDate}
                      onChange={(e) => handleExpChange(idx, 'fromDate', e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>To Date</label>
                    <input
                      type="date"
                      disabled={exp.isCurrent}
                      value={exp.isCurrent ? '' : exp.toDate}
                      onChange={(e) => handleExpChange(idx, 'toDate', e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Current Gross Salary</label>
                    <input
                      type="text"
                      placeholder="Gross p.m."
                      value={exp.salary}
                      onChange={(e) => handleExpChange(idx, 'salary', e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Notice Period</label>
                    <select
                      value={exp.noticePeriod}
                      onChange={(e) => handleExpChange(idx, 'noticePeriod', e.target.value)}
                    >
                      <option value="Select Notice Period">Select Notice Period</option>
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
                <button type="button" className="btn-action-outline" onClick={handleAddExperience}>
                  + Add Experience Row
                </button>
                {experiences.length > 1 && (
                  <button type="button" className="btn-action-outline" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleRemoveExperience(experiences.length - 1)}>
                    Remove Row
                  </button>
                )}
              </div>
            )}

          </div>
        </div>

        {/* SECTION 5: RESUME & SUBMISSION */}
        <div className="form-section-card">
          <div className="form-section-header">
            <span>📄</span>
            <span>CURRICULUM VITAE & FINAL SUBMISSION</span>
          </div>
          <div className="form-section-body">

            <div className="upload-dropzone">
              <label style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📁</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                  {resumeFile ? `Selected: ${resumeFile.name}` : 'Click to Upload Resume / CV (PDF)'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  PDF format only. Maximum file size 5MB.
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => setResumeFile(e.target.files[0])}
                />
              </label>
            </div>

            <div style={{ margin: '22px 0 15px 0' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={declaration}
                  onChange={(e) => setDeclaration(e.target.checked)}
                  required
                />
                <span>I confirm that all details supplied in this application are accurate and true to the best of my knowledge.</span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                Security Check: What is <span style={{ color: '#2563eb' }}>{captchaNum1} + {captchaNum2}</span>?
              </span>
              <input
                type="text"
                style={{ width: '100px' }}
                placeholder="answer"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                required
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <button type="submit" className="btn-dypiu-submit" disabled={submitting}>
                <span>✔️</span>
                <span>{submitting ? 'SUBMITTING APPLICATION...' : 'SUBMIT APPLICATION'}</span>
              </button>
            </div>

          </div>
        </div>

      </form>
    </div>
  );
}

export default ApplicationForm;
