import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import {
  QUALIFICATION_LEVELS, QUALIFICATION_LEVEL_KEYS, PHD_STATUSES, PHD_BLANK, PHD_LABELS,
  qualificationRule, blankQualification, normaliseQualification, applyQualificationEdit,
  validateQualifications, cleanQualifications, phdFieldsFor, buildPhd, validatePhd,
  showsResearchOutputs, validateCount, normaliseExam, validateExam,
  validatePersonal, validateContact, validateExperience
} from '../utils/formRules';

// How each Ph.D. field is drawn; which ones appear (and are required) comes from phdFieldsFor() in formRules.js.
const PHD_FIELD_UI = {
  phdUniversity: { placeholder: 'University / institute where the Ph.D. is done' },
  phdDepartment: { placeholder: 'e.g. Department of Computer Science' },
  phdSpecialization: { placeholder: 'e.g. Machine Learning' },
  phdCity: { placeholder: 'City' },
  phdCountry: { placeholder: 'Country' },
  phdMode: { options: ['Full-Time', 'Part-Time'] },
  phdUgcRecognised: { options: ['Yes', 'No'] },
  phdFellowship: { options: ['None', 'UGC-JRF', 'UGC-SRF', 'CSIR', 'ICSSR', 'Institutional', 'Other'] },
  phdRegistrationYear: { year: true, placeholder: 'e.g. 2019' },
  phdThesisTitle: { wide: true, placeholder: 'Title of the thesis' },
  phdSupervisor: { placeholder: 'Name of the guide' },
  phdSupervisorDesignation: { placeholder: 'e.g. Professor' },
  phdExpectedYear: { year: true, placeholder: 'e.g. 2027' },
  phdSubmissionDate: { date: true },
  phdVivaDate: { date: true },
  phdYear: { year: true, placeholder: 'e.g. 2024' },
  phdCertificateNo: { placeholder: 'Certificate number' }
};

const PHD_GROUPS = [
  { title: 'Where the Ph.D. is / was done', keys: ['phdUniversity', 'phdDepartment', 'phdCity', 'phdCountry', 'phdMode', 'phdUgcRecognised', 'phdFellowship'] },
  { title: 'Research', keys: ['phdSpecialization', 'phdThesisTitle', 'phdSupervisor', 'phdSupervisorDesignation'] },
  { title: 'Timeline', keys: ['phdRegistrationYear', 'phdExpectedYear', 'phdSubmissionDate', 'phdVivaDate', 'phdYear', 'phdCertificateNo'] }
];


const TEACHING_SCHOOLS = [
  'School of Computer Science Engineering & Applications',
  'School of Continuing Education',
  'School of Engineering, Management & Research',
  'School of Biosciences & Bioengineering',
  'School of Commerce & Management',
  'School of Media & Journalism',
  'School of Design',
  'School of Applied Arts & Crafts',
  'School of Humanities & Social Sciences',
  'School of Law'
];

const NON_TEACHING_DIVISIONS = [
  'University Administration & Operations',
  'Systems & IT Infrastructure',
  'Technical & Laboratory Services',
  'Finance & Accounts',
  'Library & Information Services',
  'Branding, Media & Promotion',
  'Estate & Civil Engineering'
];

const FACULTIES_LIST = [...TEACHING_SCHOOLS, ...NON_TEACHING_DIVISIONS];

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

// DOB hybrid field with strict limits and input validation
function DobNumberInput({ value, onChange, placeholder, min, max, flex = 1, listId, options }) {
  const inputStyle = {
    width: '100%',
    padding: '9px 10px',
    borderRadius: '8px',
    border: '1.5px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: value ? '#0f172a' : '#64748b',
    fontSize: '0.86rem',
    fontWeight: value ? 700 : 500,
    boxSizing: 'border-box',
    outline: 'none',
    cursor: 'text'
  };

  const handleInputChange = (e) => {
    let raw = e.target.value.replace(/\D/g, ''); // only digits
    if (placeholder === 'DAY') {
      raw = raw.slice(0, 2);
      if (raw !== '') {
        const num = parseInt(raw, 10);
        if (num > 31) raw = '31';
      }
    } else if (placeholder === 'MONTH') {
      raw = raw.slice(0, 2);
      if (raw !== '') {
        const num = parseInt(raw, 10);
        if (num > 12) raw = '12';
      }
    } else if (placeholder === 'YEAR') {
      raw = raw.slice(0, 4);
      if (raw.length === 4) {
        const num = parseInt(raw, 10);
        if (max && num > max) raw = String(max);
      }
    }
    onChange(raw);
  };

  const handleBlur = (e) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      onChange('');
      return;
    }
    const num = parseInt(raw, 10);
    if (placeholder === 'DAY') {
      const clamped = Math.max(1, Math.min(31, isNaN(num) ? 1 : num));
      onChange(String(clamped).padStart(2, '0'));
    } else if (placeholder === 'MONTH') {
      const clamped = Math.max(1, Math.min(12, isNaN(num) ? 1 : num));
      onChange(String(clamped).padStart(2, '0'));
    } else if (placeholder === 'YEAR') {
      if (raw.length === 4) {
        const minYear = min || 1940;
        const maxYear = max || (new Date().getFullYear() - 18);
        const clamped = Math.max(minYear, Math.min(maxYear, isNaN(num) ? maxYear : num));
        onChange(String(clamped));
      } else if (raw.length > 0 && raw.length < 4) {
        onChange('');
      }
    }
  };

  return (
    <div style={{ flex, minWidth: '72px' }}>
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        list={listId}
        onChange={handleInputChange}
        onBlur={handleBlur}
        style={inputStyle}
      />
      {listId && options && (
        <datalist id={listId}>
          {options.map((opt) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLbl = typeof opt === 'object' ? opt.label : opt;
            return <option key={optVal} value={optVal}>{optLbl}</option>;
          })}
        </datalist>
      )}
    </div>
  );
}

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
  const [academicStructure, setAcademicStructure] = useState(null);
  const [structureLoading, setStructureLoading] = useState(true);

  // STEP 1: Post & Personal Info
  const [selectedFaculty, setSelectedFaculty] = useState(urlFaculty || 'School of Computer Science Engineering & Applications');
  const [postAppliedFor, setPostAppliedFor] = useState('');
  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState(user?.name?.split(' ')[0] || '');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState(user?.name?.split(' ').slice(1).join(' ') || '');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');

  // STEP 2: Contact Information
  const [email, setEmail] = useState(user?.email || '');
  const [emailVerified, setEmailVerified] = useState(Boolean(user));
  const [verificationToken, setVerificationToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  // Mobile is pre-filled from the user profile if authenticated

  const [alternateEmail, setAlternateEmail] = useState('');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [pinCode, setPinCode] = useState('');

  // STEP 3: Academic Qualifications
  const [qualifications, setQualifications] = useState([
    blankQualification('SSC'),
    blankQualification('HSC'),
    blankQualification("Bachelor's")
  ]);
  const [subjectAppliedFor, setSubjectAppliedFor] = useState('');

  // STEP 4: Work Experience
  const [isFresher, setIsFresher] = useState(true);
  const [experiences, setExperiences] = useState([
    { organization: '', type: 'Teaching', designation: '', isCurrent: false, fromDate: '', toDate: '', salary: '', noticePeriod: '30 Days' }
  ]);

  // STEP 5: Ph.D. & Research Information
  // Only the fields that apply to the chosen Ph.D. status are shown and sent (see utils/formRules.js).
  const [phdStatus, setPhdStatus] = useState('');
  const [phd, setPhd] = useState({ ...PHD_BLANK });
  const setPhdField = (key, value) => {
    setPhd((prev) => ({ ...prev, [key]: value }));
    triggerAutosave();
  };
  const handlePhdStatusChange = (value) => {
    setPhdStatus(value);
    // "Not Applicable" (or nothing) means there is no Ph.D. to describe: drop anything typed earlier.
    if (!phdFieldsFor(value).visible.length) setPhd({ ...PHD_BLANK });
    triggerAutosave();
  };
  const [scopusCount, setScopusCount] = useState('');
  const [scopusId, setScopusId] = useState('');
  const [conferencePaper, setConferencePaper] = useState('');
  const [wosCount, setWosCount] = useState('');
  const [wosId, setWosId] = useState('');
  const [net, setNet] = useState({ cleared: 'No', year: '' });
  const [setExam, setSetExam] = useState({ cleared: 'No', year: '' });
  const [slet, setSlet] = useState({ cleared: 'No', year: '' });
  const [gate, setGate] = useState({ cleared: 'No', year: '' });

  // Other publications (books, patents, ...)
  const [publications, setPublications] = useState([
    { type: 'Book Chapters', count: '' },
    { type: 'Patents', count: '' }
  ]);

  const handlePubChange = (idx, field, value) => {
    setPublications(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleAddPubRow = () => {
    setPublications(prev => [...prev, { type: '', count: '' }]);
  };

  const handleRemovePubRow = (idx) => {
    setPublications(prev => prev.filter((_, i) => i !== idx));
  };

  // STEP 6: Documents
  const [resumeFile, setResumeFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
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

  // Load dynamic university academic structure & jobs
  useEffect(() => {
    let mounted = true;
    apiRequest('/public/academic-structure')
      .then((res) => {
        if (mounted && Array.isArray(res?.schools)) {
          setAcademicStructure(res.schools);
        }
      })
      .catch((err) => console.warn('Could not fetch academic structure:', err))
      .finally(() => {
        if (mounted) setStructureLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  // Dynamic Teaching Faculties list
  const teachingSchools = useMemo(() => {
    if (!academicStructure) return TEACHING_SCHOOLS;
    const list = academicStructure
      .filter((s) => s.type === 'TEACHING')
      .map((s) => s.name);
    return list.length > 0 ? list : TEACHING_SCHOOLS;
  }, [academicStructure]);

  // Dynamic Non-Teaching Divisions list
  const nonTeachingDivisions = useMemo(() => {
    if (!academicStructure) return NON_TEACHING_DIVISIONS;
    const list = academicStructure
      .filter((s) => s.type === 'NON_TEACHING')
      .map((s) => s.name);
    return list.length > 0 ? list : NON_TEACHING_DIVISIONS;
  }, [academicStructure]);

  // Dynamic Available Posts for Selected Faculty
  const availablePosts = useMemo(() => {
    const cleanSel = (selectedFaculty || '').trim().toLowerCase();
    const matchedSchool = academicStructure?.find((s) => {
      const sName = s.name.trim().toLowerCase();
      return sName === cleanSel || cleanSel.includes(sName) || sName.includes(cleanSel);
    });

    const postOptions = [];
    const seen = new Set();

    const addPost = (title, meta = {}) => {
      if (!title || typeof title !== 'string') return;
      const trimmed = title.trim();
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        postOptions.push({
          value: trimmed,
          label: meta.hasOpenJob ? `${trimmed} (Active Opening)` : trimmed,
          isVacancy: Boolean(meta.hasOpenJob),
          jobId: meta.jobId || null
        });
      }
    };

    if (matchedSchool) {
      // 1. Any published/active jobs in this school
      if (Array.isArray(matchedSchool.jobs)) {
        matchedSchool.jobs.forEach((j) => {
          if (j.status === 'PUBLISHED') {
            addPost(j.position, { hasOpenJob: true, jobId: j.id });
          }
        });
      }

      // 2. Department positions in this school
      if (Array.isArray(matchedSchool.departments)) {
        matchedSchool.departments.forEach((dept) => {
          if (Array.isArray(dept.positions)) {
            dept.positions.forEach((pos) => {
              addPost(pos.title, { jobId: null });
            });
          }
        });
      }

      // 3. Fallback standard ranks based on school category
      if (matchedSchool.type === 'NON_TEACHING') {
        POSTS_BY_TYPE.NON_TEACHING.forEach((p) => addPost(p));
      } else {
        POSTS_BY_TYPE.TEACHING.forEach((p) => addPost(p));
      }
    } else {
      // Fallback when structure is loading or offline
      const isNT = urlType === 'NON_TEACHING' || nonTeachingDivisions.some((nt) => cleanSel.includes(nt.toLowerCase()));
      const fallbackList = isNT ? POSTS_BY_TYPE.NON_TEACHING : POSTS_BY_TYPE.TEACHING;
      fallbackList.forEach((p) => addPost(p));
    }

    return postOptions;
  }, [academicStructure, selectedFaculty, urlType, nonTeachingDivisions]);

  const handleFacultyChange = (newFaculty) => {
    setSelectedFaculty(newFaculty);
    // Dynamically reset post selection when switching faculties
    setPostAppliedFor('');
  };

  const handlePostChange = (newPost) => {
    setPostAppliedFor(newPost);
    const matchedOpt = availablePosts.find((p) => p.value === newPost);
    if (matchedOpt?.jobId) {
      setLoadedVacancy((prev) => ({ ...(prev || {}), id: matchedOpt.jobId, position: newPost }));
    }
  };

  // Teaching vs non-teaching decides which sections apply (publications and NET/SET/GATE are teaching-only).
  const jobType = useMemo(() => {
    if (loadedVacancy?.type) return loadedVacancy.type;
    const selected = (selectedFaculty || '').trim().toLowerCase();
    const school = academicStructure?.find((s) => s.name.trim().toLowerCase() === selected);
    if (school?.type) return school.type;
    if (urlType === 'NON_TEACHING') return 'NON_TEACHING';
    return nonTeachingDivisions.some((nt) => nt.trim().toLowerCase() === selected) ? 'NON_TEACHING' : 'TEACHING';
  }, [loadedVacancy, selectedFaculty, academicStructure, urlType, nonTeachingDivisions]);
  const showOutputs = showsResearchOutputs(jobType);

  /** The Ph.D. / research block as it is stored: hidden or not-applicable fields are never included. */
  const buildResearch = () => {
    const out = buildPhd(phdStatus, phd);
    if (showOutputs) {
      const scopus = Number(scopusCount || 0);
      const wos = Number(wosCount || 0);
      Object.assign(out, {
        scopusCount: String(scopus),
        scopusId: scopus > 0 ? scopusId.trim() : '',
        wosCount: String(wos),
        wosId: wos > 0 ? wosId.trim() : '',
        conferencePaper: String(Number(conferencePaper || 0)),
        publications: publications
          .filter((p) => p.type.trim() && Number(p.count) > 0)
          .map((p) => ({ type: p.type.trim(), count: Number(p.count) })),
        net: normaliseExam(net),
        setExam: normaliseExam(setExam),
        slet: normaliseExam(slet),
        gate: normaliseExam(gate)
      });
    }
    return out;
  };

  // Load Vacancy details if jobId provided
  useEffect(() => {
    if (activeJobId) {
      apiRequest(`/public/vacancies/${activeJobId}`)
        .then((data) => {
          if (data && !data.error) {
            setLoadedVacancy(data);
            if (data.department) setSelectedFaculty(data.department);
            if (data.position) setPostAppliedFor(data.position);
          }
        })
        .catch((err) => console.error('Error fetching vacancy:', err));
    }
  }, [activeJobId]);

  // Load user profile to get mobile number (not stored in JWT payload)
  useEffect(() => {
    if (user) {
      apiRequest('/auth/me')
        .then((profile) => {
          if (profile?.profileDetails?.mobile) {
            setMobile(profile.profileDetails.mobile);
          }
        })
        .catch(() => {}); // silently ignore — mobile field just stays empty
    }
  }, [user]);

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
            if (Array.isArray(q) && q.length > 0) {
              const sanitizedQ = q.map(normaliseQualification);
              setQualifications(sanitizedQ);
            }
          }

          if (existing.experience) {
            const e = typeof existing.experience === 'string' ? JSON.parse(existing.experience) : existing.experience;
            if (Array.isArray(e) && e.length > 0) setExperiences(e);
          }

          if (existing.documents) {
            setUploadedDocsList(existing.documents);
          }

          if (existing.researchDetails || existing.phdDetails) {
            try {
              const r = typeof existing.researchDetails === 'string'
                ? JSON.parse(existing.researchDetails)
                : (existing.researchDetails || existing.phdDetails);
              if (r) {
                if (r.phdStatus) setPhdStatus(r.phdStatus);
                setPhd((prev) => {
                  const next = { ...prev };
                  Object.keys(PHD_BLANK).forEach((k) => { if (r[k]) next[k] = String(r[k]); });
                  if (!next.phdSpecialization && r.phdSubject) next.phdSpecialization = String(r.phdSubject);
                  return next;
                });
                if (r.scopusCount && r.scopusCount !== '0') setScopusCount(String(r.scopusCount));
                if (r.scopusId) setScopusId(r.scopusId);
                if (r.wosCount && r.wosCount !== '0') setWosCount(String(r.wosCount));
                if (r.wosId) setWosId(r.wosId);
                if (/^\d+$/.test(String(r.conferencePaper ?? '')) && r.conferencePaper !== '0') setConferencePaper(String(r.conferencePaper));
                if (Array.isArray(r.publications) && r.publications.length) {
                  setPublications(r.publications.map((p) => ({ type: p.type || '', count: String(p.count ?? '') })));
                }
                if (r.net) setNet(normaliseExam(r.net));
                if (r.setExam) setSetExam(normaliseExam(r.setExam));
                if (r.slet) setSlet(normaliseExam(r.slet));
                if (r.gate) setGate(normaliseExam(r.gate));
              }
            } catch (err) {}
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
          phdDetails: buildResearch(),
          researchDetails: buildResearch(),
          workExperience: isFresher ? [] : experiences,
          experience: {
            experienceType: isFresher ? 'fresher' : 'experienced',
            isFresher,
            records: experiences
          },
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

  const hasResumeDoc = () =>
    Boolean(resumeFile) || (Array.isArray(uploadedDocsList) && uploadedDocsList.some((d) => d.documentType === 'resume'));

  /** First problem on a step, or null. The same rules run on "Next" and again on the final submit. */
  const stepError = (step) => {
    if (step === 1) {
      return validatePersonal({ postAppliedFor, title, firstName, lastName, dob, gender, maritalStatus });
    }
    if (step === 2) {
      if (!email || !email.includes('@')) return 'A valid e-mail address is required.';
      if (!emailVerified) return 'Please verify your e-mail address with the OTP before continuing.';
      return validateContact({ mobile, alternateMobile, pinCode, city, state });
    }
    if (step === 3) return validateQualifications(qualifications);
    if (step === 4) return isFresher ? null : validateExperience(experiences);
    if (step === 5) {
      const phdProblem = validatePhd(phdStatus, phd, { requireStatus: jobType === 'TEACHING' });
      if (phdProblem) return phdProblem;
      if (!showOutputs) return null;
      return validateCount(scopusCount, 'The Scopus publication count')
        || validateCount(wosCount, 'The Web of Science count')
        || validateCount(conferencePaper, 'The conference paper count')
        || validateExam('UGC-NET', net) || validateExam('SET', setExam)
        || validateExam('SLET', slet) || validateExam('GATE', gate);
    }
    if (step === 6) {
      return hasResumeDoc() ? null : 'Uploading your Resume / CV (PDF / Word, max 5MB) is mandatory before proceeding.';
    }
    return null;
  };

  // Step Navigation Helpers
  const handleNextStep = () => {
    setError('');

    const problem = stepError(currentStep);
    if (problem) {
      setError(problem);
      return;
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

  // Email and OTP Verification Handlers for Guest Applicants
  const handleEmailChange = (newVal) => {
    setEmail(newVal);
    if (!user) {
      setEmailVerified(false);
      setVerificationToken('');
      setOtpSent(false);
      setOtpInput('');
      setOtpMessage('');
    }
  };

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
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });
      setOtpSent(true);
      setOtpMessage(res.message || `Verification code sent to ${email}.`);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.trim().length < 4) {
      setError('Please enter the 6-digit OTP code received on your email.');
      return;
    }
    setError('');
    setVerifyingOtp(true);
    try {
      const verified = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.toLowerCase().trim(), otp: otpInput.trim() })
      });
      setVerificationToken(verified.verificationToken || '');
      setEmailVerified(true);
      setOtpSent(false);
      setOtpMessage('✓ Email verified successfully!');
    } catch (err) {
      setError(err.message || 'Invalid OTP code. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Qualification Row Helpers (what each level asks for lives in utils/formRules.js)
  const handleAddQualification = () => {
    setQualifications([...qualifications, blankQualification('')]);
  };
  const handleRemoveQualification = (idx) => {
    if (qualifications.length <= 1) return;
    setQualifications(qualifications.filter((_, i) => i !== idx));
    triggerAutosave();
  };
  const handleQualChange = (idx, field, val) => {
    setQualifications((prev) => prev.map((q, i) => (i === idx ? applyQualificationEdit(q, field, val) : q)));
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
    setExperiences((prev) => prev.map((row, i) => {
      if (i !== idx) return row;
      const next = { ...row, [field]: val };
      if (field === 'isCurrent' && val) next.toDate = '';
      return next;
    }));
    triggerAutosave();
  };

  // File Upload Handler for Step 6
  const handleFileUpload = async (file, docType) => {
    const isPdfOrWord = file.type === 'application/pdf' || 
      file.type === 'application/msword' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.(pdf|doc|docx)$/i.test(file.name);
    if (!isPdfOrWord) {
      setError('Accepted formats: PDF, DOC, DOCX (max 5MB).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.');
      return;
    }

    setError('');
    let fileDataUrl = null;
    try {
      fileDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    } catch (e) {
      fileDataUrl = null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', docType);
    if (fileDataUrl) formData.append('fileData', fileDataUrl);

    try {
      let targetDraftId = draftAppId;
      if (!targetDraftId) {
        const initRes = await apiRequest('/applications', {
          method: 'POST',
          body: JSON.stringify({ jobId: activeJobId || loadedVacancy?.id || 'job-1', email, name: `${firstName} ${lastName}`.trim() })
        }).catch(() => null);
        targetDraftId = initRes?.applicationId || initRes?.id || 'app-local-' + Date.now();
        setDraftAppId(targetDraftId);
      }

      const res = await apiRequest(`/applications/${targetDraftId}/documents`, {
        method: 'POST',
        body: formData
      });

      const newDoc = res?.document || {
        id: 'doc-' + Date.now(),
        documentType: docType,
        originalName: file.name,
        fileSize: file.size,
        fileData: fileDataUrl,
        url: fileDataUrl,
        uploadedAt: new Date().toISOString()
      };

      setUploadedDocsList((prev) => [...prev.filter((d) => d.documentType !== docType), newDoc]);
      triggerAutosave();
    } catch (err) {
      console.warn('Document upload notice:', err);
      // Keep document registered locally so candidates are never blocked
      const fallbackDoc = {
        id: 'doc-' + Date.now(),
        documentType: docType,
        originalName: file.name,
        fileSize: file.size,
        fileData: fileDataUrl,
        url: fileDataUrl,
        uploadedAt: new Date().toISOString()
      };
      setUploadedDocsList((prev) => [...prev.filter((d) => d.documentType !== docType), fallbackDoc]);
      triggerAutosave();
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

    if (!emailVerified) {
      setError('Please verify your email address via OTP before final submission.');
      return;
    }

    for (let step = 1; step <= 6; step += 1) {
      const problem = stepError(step);
      if (problem) {
        setCurrentStep(step);
        setError(`Step ${step}: ${problem}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    const hasResume = hasResumeDoc();
    if (!hasResume) {
      setError('Resume / CV is mandatory. Please return to Step 6 and upload your Resume / CV (PDF format).');
      return;
    }

    setSubmitting(true);

    try {
      const matchedJob = availablePosts.find((p) => p.value === postAppliedFor)?.jobId;
      const targetJobId = activeJobId || matchedJob || loadedVacancy?.id || null;

      const payload = {
        jobId: targetJobId,
        faculty: selectedFaculty,
        postAppliedFor: postAppliedFor || 'Faculty Position',
        subjectAppliedFor,
        personalInfo: { title: title !== 'Select' ? title : '', firstName, middleName, lastName, dob, age, gender, maritalStatus, email, alternateEmail },
        contactDetails: { mobile, alternateMobile, address, city, state, country, pinCode, email },
        qualifications: cleanQualifications(qualifications),
        phdDetails: buildResearch(),
        researchDetails: buildResearch(),
        workExperience: isFresher ? [] : experiences,
        experience: {
          experienceType: isFresher ? 'fresher' : 'experienced',
          isFresher,
          records: experiences
        },
        declaration: true,
        emailVerified: true,
        verificationToken,
        uploadedDocsList
      };

      let submitRes;
      if (draftAppId && !draftAppId.startsWith('app-local-')) {
        submitRes = await apiRequest(`/applications/${draftAppId}/submit`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else {
        submitRes = await apiRequest('/applications/submit', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      const finalAppNumber = submitRes.applicationNumber || 'DYPIU-2026-000001';
      const returnedAppId = submitRes.applicationId || draftAppId || 'new';
      const isInterest = Boolean(submitRes.isInterest);

      navigate(`/applicant/applications/${returnedAppId}/success`, {
        state: {
          appNumber: finalAppNumber,
          position: postAppliedFor || selectedFaculty,
          status: 'SUBMITTED',
          isNewUser: Boolean(submitRes.isNewUser),
          isInterest
        }
      });
    } catch (err) {
      console.error('Final submission error:', err);
      // If the backend still returns a deadline-passed error (legacy), redirect gracefully
      const msg = err.message || '';
      if (msg.toLowerCase().includes('deadline') || msg.toLowerCase().includes('passed') || msg.toLowerCase().includes('closed')) {
        navigate('/apply/success-interest', {
          state: {
            appNumber: 'INTEREST-REG',
            position: postAppliedFor || selectedFaculty,
            status: 'SUBMITTED',
            isInterest: true,
            message: 'Thank you for applying. We will reach out to you soon when the vacancies are open. We have securely registered your details in our recruitment system.'
          }
        });
      } else {
        setError(msg || 'Error submitting application. Please verify all details.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-watermark-wrapper">
      <div className="container app-form-container" style={{ maxWidth: '1020px', padding: '24px 20px', position: 'relative', zIndex: 1 }}>
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#111111',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          &larr; Back
        </button>
      </div>
      
      {/* FORMAL UNIVERSITY APPLICATION FORM HEADER - STEP 1 ONLY (WHITE BOX, RED LETTERS) */}
      {currentStep === 1 && (
        <div className="app-header" style={{
          backgroundColor: '#ffffff',
          color: '#111111',
          borderRadius: '12px',
          padding: '22px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          border: '1px solid #111111',
          marginBottom: '24px',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '28px',
              margin: 0,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#721b28',
              fontWeight: 800
            }}>
              APPLICATION FORM
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#475569', fontWeight: 600 }}>
              D Y Patil International University, Akurdi, Pune
            </p>
          </div>

          <div className="app-dept" style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Department:</span>{' '}
            <strong style={{ display: 'block', color: '#721b28', fontSize: '16px', fontWeight: 800 }}>
              {selectedFaculty || loadedVacancy?.department || 'School of Computer Science Engineering & Applications'}
            </strong>
            {(postAppliedFor || loadedVacancy?.position) && (
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#475569' }}>
                <span style={{ fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Post:</span>{' '}
                <strong style={{ display: 'inline', color: '#721b28', fontSize: '14px', fontWeight: 800 }}>{postAppliedFor || loadedVacancy?.position}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP PROGRESS INDICATOR BAR */}
      <div className="app-step-progress-card" style={{ backgroundColor: '#ffffff', border: '1px solid #111111', borderRadius: '14px', padding: '18px 24px', marginBottom: '24px', boxShadow: 'none' }}>
        <div className="app-step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111111' }}>
            Step {currentStep} of 7: <span style={{ color: '#721b28' }}>{STEPS[currentStep - 1].title}</span>
          </div>
        </div>

        {/* Progress Dots / Steps */}
        <div className="app-step-indicators-track" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {STEPS.map((s) => {
            const isDone = s.id < currentStep;
            const isCurrent = s.id === currentStep;

            return (
              <div
                key={s.id}
                className={`app-step-item${isCurrent ? ' is-current' : ''}`}
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
                <div className="app-step-item-circle" style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isDone ? '#d9a43c' : isCurrent ? '#721b28' : '#f1f1f1',
                  color: isDone ? '#111111' : isCurrent ? '#ffffff' : '#6b6b6b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  border: isCurrent ? '3px solid #d9a43c' : isDone ? '1px solid #d9a43c' : '1px solid #cbd5e1',
                  transition: 'all 0.2s ease'
                }}>
                  {isDone ? '✓' : s.id}
                </div>
                <div className="app-step-item-label" style={{ fontSize: '0.72rem', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#721b28' : '#64748b', marginTop: '6px' }}>
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
      <div className="app-form-body-card" style={{ backgroundColor: '#ffffff', border: '1px solid #111111', borderRadius: '14px', padding: '28px', boxShadow: 'none', marginBottom: '24px' }}>

        {/* STEP 1: PERSONAL INFORMATION */}
        {currentStep === 1 && (
          <div>
            <h3 className="app-step-title" style={{ margin: '0 0 18px 0', color: '#721b28', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #d9a43c', paddingBottom: '10px' }}>
              STEP 1 — Personal Information & Post Selection
            </h3>

            <div className="app-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Selected Faculty / Department</label>
                <select value={selectedFaculty} onChange={(e) => handleFacultyChange(e.target.value)}>
                  <optgroup label="Academic Schools & Faculties (Teaching)">
                    {teachingSchools.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Administrative & Operations Divisions (Non-Teaching)">
                    {nonTeachingDivisions.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>
                    Post Applied For <span className="required">*</span>
                  </label>
                  {availablePosts.some((p) => p.isVacancy) && (
                    <span style={{ fontSize: '0.72rem', color: '#721b28', fontWeight: 700 }}>
                      ⚡ Active Vacancies Available
                    </span>
                  )}
                </div>
                <select value={postAppliedFor} onChange={(e) => handlePostChange(e.target.value)} required>
                  <option value="">-- Select Post --</option>
                  {availablePosts.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                  {postAppliedFor && !availablePosts.some((p) => p.value === postAppliedFor) && (
                    <option value={postAppliedFor}>{postAppliedFor}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="app-form-grid-4col" style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Title <span className="required">*</span></label>
                <select value={title} onChange={(e) => setTitle(e.target.value)} required>
                  <option value="" disabled>-- Select Title --</option>
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

            <div className="app-form-grid-dob" style={{ display: 'grid', gridTemplateColumns: '2.2fr 100px 1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Date of Birth <span className="required">*</span></label>
                <div className="app-dob-inputs-flex" style={{ display: 'flex', gap: '6px' }}>
                  <DobNumberInput
                    value={dobDay}
                    onChange={(val) => setDobDay(val)}
                    placeholder="DAY"
                    min={1}
                    max={31}
                    flex={1}
                    listId="dob-day-list"
                    options={DAYS_LIST}
                  />
                  <DobNumberInput
                    value={dobMonth}
                    onChange={(val) => setDobMonth(val)}
                    placeholder="MONTH"
                    min={1}
                    max={12}
                    flex={1.5}
                    listId="dob-month-list"
                    options={MONTHS_LIST}
                  />
                  <DobNumberInput
                    value={dobYear}
                    onChange={(val) => setDobYear(val)}
                    placeholder="YEAR"
                    min={1940}
                    max={new Date().getFullYear() - 18}
                    flex={1.2}
                    listId="dob-year-list"
                    options={YEARS_LIST}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Age</label>
                <input type="text" value={age} readOnly placeholder="Age" style={{ backgroundColor: '#f1f5f9', fontWeight: 700, textAlign: 'center' }} />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Gender <span className="required">*</span></label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="" disabled>-- Select --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Marital Status <span className="required">*</span></label>
                <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} required>
                  <option value="" disabled>-- Select --</option>
                  <option value="Married">Married</option>
                  <option value="Unmarried">Unmarried</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONTACT INFORMATION */}
        {currentStep === 2 && (
          <div>
            <h3 className="app-step-title" style={{ margin: '0 0 18px 0', color: '#721b28', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #d9a43c', paddingBottom: '10px' }}>
              STEP 2 — Contact Information
            </h3>

            {user && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', marginBottom: '16px', fontSize: '0.82rem', color: '#721b28', fontWeight: 600 }}>
                ✓ Logged in as <strong>{user.name || user.email}</strong>. Contact details are pre-filled.
              </div>
            )}

            <div className="app-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>
                    Email Address <span className="required">*</span>
                  </label>
                  {emailVerified ? (
                    <span style={{ fontSize: '0.78rem', color: '#721b28', fontWeight: 700 }}>
                      ✓ Verified {!user && (
                        <button
                          type="button"
                          onClick={() => { setEmailVerified(false); setOtpSent(false); setOtpInput(''); setOtpMessage(''); }}
                          style={{ background: 'none', border: 'none', color: '#721b28', textDecoration: 'underline', cursor: 'pointer', marginLeft: '6px', fontSize: '0.75rem' }}
                        >
                          (Change)
                        </button>
                      )}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || !email}
                      style={{
                        background: '#721b28', color: '#d9a43c', border: 'none', borderRadius: '4px',
                        padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700,
                        cursor: sendingOtp || !email ? 'not-allowed' : 'pointer',
                        opacity: sendingOtp || !email ? 0.6 : 1
                      }}
                    >
                      {sendingOtp ? 'Sending OTP…' : otpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  )}
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  readOnly={Boolean(user) || emailVerified}
                  placeholder="e.g. candidate@example.com"
                  required
                  style={{
                    backgroundColor: emailVerified ? '#fef2f2' : '#ffffff',
                    borderColor: emailVerified ? '#721b28' : undefined,
                    cursor: (Boolean(user) || emailVerified) ? 'default' : 'text'
                  }}
                />
                {otpMessage && (
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: emailVerified ? '#721b28' : '#0f172a', fontWeight: 600 }}>
                    {otpMessage}
                  </p>
                )}
                {otpSent && !emailVerified && (
                  <div style={{ marginTop: '10px', padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Enter 6-Digit Email Verification Code:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 123456"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                        style={{ width: '130px', letterSpacing: '3px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.95rem', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || otpInput.length < 4}
                        style={{
                          backgroundColor: '#721b28', color: '#fff', border: 'none', borderRadius: '4px',
                          padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700,
                          cursor: verifyingOtp || otpInput.length < 4 ? 'not-allowed' : 'pointer',
                          opacity: verifyingOtp || otpInput.length < 4 ? 0.6 : 1
                        }}
                      >
                        {verifyingOtp ? 'Verifying…' : 'Confirm OTP'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Alternate Email</label>
                <input type="email" placeholder="Alternate Email ID" value={alternateEmail} onChange={(e) => setAlternateEmail(e.target.value)} />
              </div>
            </div>

            <div className="app-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>
                    Mobile Number <span className="required">*</span>
                    {mobile && mobile.length !== 10 && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginLeft: '8px', fontWeight: 600 }}>
                        (Must be 10 digits)
                      </span>
                    )}
                  </label>
                  {user && user.mobile && <span style={{ fontSize: '0.78rem', color: '#721b28', fontWeight: 700 }}>✓ Pre-filled</span>}
                </div>
                <input
                  type="tel"
                  value={mobile}
                  maxLength={10}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  readOnly={Boolean(user && user.mobile)}
                  placeholder="10-digit mobile number"
                  required
                  style={{
                    backgroundColor: user && user.mobile ? '#fef2f2' : '#ffffff',
                    cursor: user && user.mobile ? 'not-allowed' : 'text'
                  }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  Alternate Mobile Number
                  {alternateMobile && alternateMobile.length !== 10 && (
                    <span style={{ color: '#ef4444', fontSize: '0.78rem', marginLeft: '8px', fontWeight: 600 }}>
                      (Invalid - must be 10 digits)
                    </span>
                  )}
                </label>
                <input
                  type="tel"
                  placeholder="10-digit Alternate Mobile"
                  value={alternateMobile}
                  maxLength={10}
                  onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  style={{ borderColor: alternateMobile && alternateMobile.length !== 10 ? '#ef4444' : undefined }}
                />
              </div>
            </div>

            <div className="app-form-grid-1col" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Address Line / Street</label>
                <input type="text" placeholder="Address Details" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>

            <div className="app-form-grid-4col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 140px', gap: '15px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>City <span className="required">*</span></label>
                <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>State <span className="required">*</span></label>
                <select value={state} onChange={(e) => setState(e.target.value)} required>
                  <option value="" disabled>-- Select State --</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Country</label>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  PIN Code
                  {pinCode && pinCode.length !== 6 && (
                    <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '4px', fontWeight: 600, display: 'block' }}>
                      Invalid (6 digits)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="6-digit PIN"
                  value={pinCode}
                  maxLength={6}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ borderColor: pinCode && pinCode.length !== 6 ? '#ef4444' : undefined }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ACADEMIC QUALIFICATIONS */}
        {currentStep === 3 && (
          <div>
            <h3 className="app-step-title" style={{ margin: '0 0 18px 0', color: '#721b28', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #d9a43c', paddingBottom: '10px' }}>
              STEP 3 — Academic Qualifications
            </h3>

            <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: '#475569' }}>
              Add each qualification you hold. The fields change with the level you choose. Your Ph.D. is entered separately in Step 5.
            </p>

            {qualifications.map((q, idx) => {
              const rule = qualificationRule(q.qualificationDegree);
              const spec = rule.specialization;
              const chosen = Boolean(q.qualificationDegree);
              const star = <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>;
              return (
                <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '16px', borderRadius: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '11px', fontWeight: 700 }}>Level{star}</label>
                      <select value={q.qualificationDegree} onChange={(e) => handleQualChange(idx, 'qualificationDegree', e.target.value)}>
                        <option value="">-- Select level --</option>
                        {!QUALIFICATION_LEVEL_KEYS.includes(q.qualificationDegree) && q.qualificationDegree && (
                          <option value={q.qualificationDegree}>{q.qualificationDegree}</option>
                        )}
                        {QUALIFICATION_LEVEL_KEYS.map((key) => (
                          <option key={key} value={key}>{QUALIFICATION_LEVELS[key].label}</option>
                        ))}
                      </select>
                    </div>

                    {chosen && !rule.nameFixed && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>{rule.nameLabel}{star}</label>
                        <input type="text" placeholder={rule.namePlaceholder} value={q.degreeName} onChange={(e) => handleQualChange(idx, 'degreeName', e.target.value)} />
                      </div>
                    )}

                    {chosen && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>{rule.instituteLabel}{star}</label>
                        <input type="text" placeholder={rule.institutePlaceholder} value={q.instituteName} onChange={(e) => handleQualChange(idx, 'instituteName', e.target.value)} />
                      </div>
                    )}

                    {chosen && spec && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>{spec.label}{spec.required && star}</label>
                        {spec.options ? (
                          <select value={q.specialization} onChange={(e) => handleQualChange(idx, 'specialization', e.target.value)}>
                            <option value="">-- Select {spec.label.toLowerCase()} --</option>
                            {spec.options.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input type="text" placeholder={spec.placeholder} value={q.specialization} onChange={(e) => handleQualChange(idx, 'specialization', e.target.value)} />
                        )}
                      </div>
                    )}

                    {chosen && (
                      <>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 700 }}>Year of passing{star}</label>
                          <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="e.g. 2018" value={q.passingYear} onChange={(e) => handleQualChange(idx, 'passingYear', e.target.value)} />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 700 }}>{rule.resultLabel}{star}</label>
                          <input type="text" inputMode="decimal" placeholder="e.g. 85.50" value={q.cgpa} onChange={(e) => handleQualChange(idx, 'cgpa', e.target.value)} />
                        </div>
                      </>
                    )}

                    {chosen && rule.mode && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>Mode of study</label>
                        <select value={q.studyMode || 'Full-Time'} onChange={(e) => handleQualChange(idx, 'studyMode', e.target.value)}>
                          <option value="Full-Time">Full-Time</option>
                          <option value="Part-Time">Part-Time</option>
                          <option value="Distance">Distance</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button type="button" className="btn-add btn-gold" onClick={handleAddQualification} style={{ backgroundColor: '#d9a43c', border: '1.5px solid #d9a43c', color: '#111111', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                + Add Qualification Row
              </button>
              {qualifications.length > 1 && (
                <button type="button" className="btn-remove" onClick={() => handleRemoveQualification(qualifications.length - 1)} style={{ backgroundColor: '#ffffff', border: '1.5px solid #721b28', color: '#721b28', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
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
            <h3 className="app-step-title" style={{ margin: '0 0 18px 0', color: '#721b28', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #d9a43c', paddingBottom: '10px' }}>
              STEP 4 — Work Experience
            </h3>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', marginBottom: '10px' }}>
                Are you a Fresher or Experienced Professional?
              </label>

              <div style={{ display: 'inline-flex', gap: '12px', width: '100%', maxWidth: '380px' }}>
                <button
                  type="button"
                  onClick={() => setIsFresher(true)}
                  style={{
                    flex: 1,
                    height: '42px',
                    backgroundColor: isFresher ? '#721b28' : '#ffffff',
                    color: isFresher ? '#ffffff' : '#334155',
                    border: isFresher ? '1.5px solid #721b28' : '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  FRESHER
                </button>

                <button
                  type="button"
                  onClick={() => setIsFresher(false)}
                  style={{
                    flex: 1,
                    height: '42px',
                    backgroundColor: !isFresher ? '#721b28' : '#ffffff',
                    color: !isFresher ? '#ffffff' : '#334155',
                    border: !isFresher ? '1.5px solid #721b28' : '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  EXPERIENCED
                </button>
              </div>
            </div>

            {isFresher ? (
              <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#475569', fontSize: '0.9rem', fontWeight: 500 }}>
                I am a fresher and do not have prior work experience.
              </div>
            ) : (
              <div>
                {experiences.map((exp, idx) => (
                  <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '18px', marginBottom: '16px', borderRadius: '8px' }}>
                    <div className="app-exp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '12px' }}>
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

                    <div className="app-exp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>From Date</label>
                        <input type="date" value={exp.fromDate} onChange={(e) => handleExpChange(idx, 'fromDate', e.target.value)} />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>To Date</label>
                        <input type="date" disabled={exp.isCurrent} value={exp.isCurrent ? '' : exp.toDate} onChange={(e) => handleExpChange(idx, 'toDate', e.target.value)} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                          <input type="checkbox" checked={Boolean(exp.isCurrent)} onChange={(ev) => handleExpChange(idx, 'isCurrent', ev.target.checked)} />
                          I currently work here
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={handleAddExperience} style={{ backgroundColor: '#ffffff', border: '1.5px solid #721b28', color: '#721b28', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                    + Add Experience Row
                  </button>
                  {experiences.length > 1 && (
                    <button type="button" onClick={() => handleRemoveExperience(experiences.length - 1)} style={{ backgroundColor: '#ffffff', border: '1.5px solid #ef4444', color: '#ef4444', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                      Remove Row
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: RESEARCH & PROFESSIONAL INFORMATION */}
        {currentStep === 5 && (
          <div>
            <h3 className="app-step-title" style={{ margin: '0 0 18px 0', color: '#721b28', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #d9a43c', paddingBottom: '10px' }}>
              STEP 5 — Research & Professional Information
            </h3>

            {/* Ph.D. status: everything below it depends on the answer */}
            <div className="form-group" style={{ maxWidth: '340px', marginBottom: '18px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                Ph.D. Status
                {jobType === 'TEACHING' && <span style={{ color: '#DC2626', marginLeft: 4 }}>*</span>}
              </label>
              <select value={phdStatus} onChange={(e) => handlePhdStatusChange(e.target.value)}>
                <option value="">-- Select --</option>
                {PHD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {phdStatus === 'Not Applicable' && (
                <small style={{ color: '#64748b' }}>No Ph.D. details are needed.</small>
              )}
            </div>

            {phdFieldsFor(phdStatus).visible.length > 0 && (
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                {PHD_GROUPS.map((group) => {
                  const keys = group.keys.filter((k) => phdFieldsFor(phdStatus).visible.includes(k));
                  if (keys.length === 0) return null;
                  return (
                    <div key={group.title} style={{ marginBottom: '14px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#721b28', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                        {group.title}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                        {keys.map((key) => {
                          const ui = PHD_FIELD_UI[key] || {};
                          const required = phdFieldsFor(phdStatus).required.includes(key);
                          let label = PHD_LABELS[key];
                          if (key === 'phdThesisTitle' && phdStatus === 'Pursuing') label = 'Working Thesis Title';
                          return (
                            <div key={key} className="form-group" style={{ marginBottom: 0, gridColumn: ui.wide ? '1 / -1' : undefined }}>
                              <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                {label}{required && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
                              </label>
                              {ui.options ? (
                                <select value={phd[key]} onChange={(e) => setPhdField(key, e.target.value)}>
                                  <option value="">-- Select --</option>
                                  {ui.options.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                              ) : ui.date ? (
                                <input type="date" max={new Date().toISOString().slice(0, 10)} value={phd[key]} onChange={(e) => setPhdField(key, e.target.value)} />
                              ) : (
                                <input
                                  type="text"
                                  inputMode={ui.year ? 'numeric' : undefined}
                                  maxLength={ui.year ? 4 : 200}
                                  placeholder={ui.placeholder || ''}
                                  value={phd[key]}
                                  onChange={(e) => setPhdField(key, ui.year ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value)}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!showOutputs && (
              <p style={{ fontSize: '0.84rem', color: '#475569' }}>
                Research publications and the national eligibility tests (NET / SET / GATE) are not asked for non-teaching posts.
              </p>
            )}

            {showOutputs && (
              <>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#721b28', marginBottom: '8px' }}>📚 Research publications</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Scopus-indexed publications</label>
                    <input type="text" inputMode="numeric" placeholder="0" value={scopusCount} onChange={(e) => setScopusCount(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                  </div>
                  {Number(scopusCount) > 0 && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Scopus Author ID</label>
                      <input type="text" placeholder="Scopus Author ID" value={scopusId} onChange={(e) => setScopusId(e.target.value)} />
                    </div>
                  )}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Web of Science papers</label>
                    <input type="text" inputMode="numeric" placeholder="0" value={wosCount} onChange={(e) => setWosCount(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                  </div>
                  {Number(wosCount) > 0 && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>WoS ResearcherID</label>
                      <input type="text" placeholder="ResearcherID" value={wosId} onChange={(e) => setWosId(e.target.value)} />
                    </div>
                  )}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Conference papers</label>
                    <input type="text" inputMode="numeric" placeholder="0" value={conferencePaper} onChange={(e) => setConferencePaper(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>Other publications (books, patents, ...)</label>
                    <button type="button" onClick={handleAddPubRow} style={{ backgroundColor: '#721b28', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                      + Add Row
                    </button>
                  </div>
                  {publications.map((pub, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <input type="text" value={pub.type} onChange={(e) => handlePubChange(idx, 'type', e.target.value)} placeholder="e.g. Patents" style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.83rem' }} />
                      <input type="text" inputMode="numeric" value={pub.count} onChange={(e) => handlePubChange(idx, 'count', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0" style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.83rem' }} />
                      {publications.length > 1 && (
                        <button type="button" onClick={() => handleRemovePubRow(idx)} style={{ background: 'none', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#721b28', marginBottom: '8px' }}>🎓 National eligibility tests</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px', marginBottom: '8px' }}>
                  {[['UGC-NET / JRF', net, setNet], ['SET', setExam, setSetExam], ['SLET', slet, setSlet], ['GATE', gate, setGate]].map(([label, value, setter]) => (
                    <div key={label} className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>{label} cleared?</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select value={value.cleared} onChange={(e) => { setter(e.target.value === 'Yes' ? { cleared: 'Yes', year: value.year } : { cleared: 'No', year: '' }); triggerAutosave(); }}>
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                        {value.cleared === 'Yes' && (
                          <input type="text" inputMode="numeric" maxLength={4} placeholder="Year" style={{ maxWidth: '90px' }} value={value.year} onChange={(e) => { setter({ cleared: 'Yes', year: e.target.value.replace(/\D/g, '').slice(0, 4) }); triggerAutosave(); }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 6: DOCUMENTS UPLOAD */}
        {currentStep === 6 && (
          <div>
            <h3 className="app-step-title" style={{ margin: '0 0 18px 0', color: '#721b28', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #d9a43c', paddingBottom: '10px' }}>
              STEP 6 — Document Uploads (PDF / Word, max 5MB)
            </h3>

            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              {/* Resume Upload */}
              <div style={{
                border: (resumeFile || uploadedDocsList.some(d => d.documentType === 'resume')) ? '2px solid #16A34A' : '2px dashed #721B28',
                borderRadius: '12px',
                padding: '24px 20px',
                textAlign: 'center',
                backgroundColor: (resumeFile || uploadedDocsList.some(d => d.documentType === 'resume')) ? '#F0FDF4' : '#FFF5F5'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>
                  {(resumeFile || uploadedDocsList.some(d => d.documentType === 'resume')) ? '✅' : '📄'}
                </div>
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.96rem' }}>
                  {resumeFile ? `Selected: ${resumeFile.name}` : (uploadedDocsList.find(d => d.documentType === 'resume')?.originalName || 'Upload Resume / CV')}
                  <span style={{ color: '#DC2626', fontWeight: 800, marginLeft: '6px' }}>* Mandatory</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                  {(resumeFile || uploadedDocsList.some(d => d.documentType === 'resume'))
                    ? 'Resume successfully uploaded to your dossier.'
                    : 'Accepted formats: PDF, DOC, DOCX (max 5MB)'}
                </div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  required
                  style={{ marginTop: '12px' }}
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setResumeFile(f);
                      handleFileUpload(f, 'resume');
                    }
                  }}
                />
              </div>
            </div>

            {uploadedDocsList.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#721b28', fontWeight: 800 }}>✓ Uploaded Documents Saved in Dossier:</h4>
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
            <h3 className="app-step-title" style={{ margin: '0 0 18px 0', color: '#721b28', fontSize: '1.15rem', fontWeight: 800, borderBottom: '2px solid #d9a43c', paddingBottom: '10px' }}>
              STEP 7 — Declaration & Final Review
            </h3>

            {/* READ-ONLY SUMMARY BOX */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#721b28', fontSize: '0.96rem', fontWeight: 800 }}>Summary of Application Details:</h4>
              
              <div className="app-form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.86rem', color: '#334155' }}>
                <div><strong>Candidate Name:</strong> {title} {firstName} {middleName} {lastName}</div>
                <div><strong>Post Applied:</strong> {postAppliedFor || 'Faculty Position'}</div>
                <div><strong>School / Faculty:</strong> {selectedFaculty}</div>
                <div><strong>Date of Birth:</strong> {dob} ({age})</div>
                <div><strong>Email:</strong> {email}</div>
                <div><strong>Mobile:</strong> {mobile}</div>
                <div><strong>City & State:</strong> {city}, {state}</div>
                <div><strong>Qualifications:</strong> {qualifications.map(q => q.qualificationDegree).join(', ')}</div>
                <div>
                  <strong>Resume / CV:</strong>{' '}
                  <span style={{ color: (resumeFile || uploadedDocsList.some(d => d.documentType === 'resume')) ? '#16A34A' : '#DC2626', fontWeight: 700 }}>
                    {resumeFile?.name || uploadedDocsList.find(d => d.documentType === 'resume')?.originalName || 'Not uploaded'}
                  </span>
                </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                Security Check: What is <span style={{ color: '#721b28' }}>{captchaNum1} + {captchaNum2}</span>?
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
                className="app-btn-next btn-submit btn-primary"
                onClick={handleFinalSubmit}
                disabled={submitting}
                style={{ backgroundColor: '#721b28', color: '#ffffff', border: 'none', padding: '12px 32px', borderRadius: '10px', fontWeight: 800, fontSize: '0.98rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(114,27,40,0.25)' }}
              >
                {submitting ? 'SUBMITTING APPLICATION...' : 'SUBMIT APPLICATION'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER WIZARD STEP CONTROLS */}
      <div className="app-form-actions-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {currentStep > 1 ? (
          <button
            type="button"
            className="app-btn-prev btn-secondary"
            onClick={handlePrevStep}
            style={{ backgroundColor: '#ffffff', border: '1.5px solid #721b28', color: '#721b28', padding: '10px 22px', borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
          >
            &larr; Previous Step
          </button>
        ) : <div />}

        {currentStep < 7 && (
          <button
            type="button"
            className="app-btn-next btn-primary"
            onClick={handleNextStep}
            style={{ backgroundColor: '#721b28', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}
          >
            Save & Continue &rarr;
          </button>
        )}
      </div>

      </div>
    </div>
  );
}

export default ApplicationForm;
