import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiRequest } from '../utils/api';

function AdminCreateJob() {
  const { id } = useParams(); // If id exists, it's Edit mode
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    vacancyNumber: '',
    type: 'TEACHING',
    schoolId: '',
    departmentId: '',
    positionId: '',
    position: '',
    department: '',
    employmentType: 'Full Time',
    numPositions: 1,
    location: 'Pune',
    qualification: '',
    experience: '',
    skills: '',
    salaryScale: '',
    description: '',
    eligibilityCriteria: '',
    requiredDocuments: 'CV/Resume, Educational Certificates, Experience Letters',
    openingDate: new Date().toISOString().split('T')[0],
    deadline: '',
    status: 'DRAFT'
  });

  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch Schools when Vacancy Type changes
  useEffect(() => {
    fetchSchools(formData.type);
  }, [formData.type]);

  // 2. Fetch Departments when School changes
  useEffect(() => {
    if (formData.schoolId) {
      fetchDepartments(formData.schoolId);
    } else {
      setDepartments([]);
      setPositions([]);
    }
  }, [formData.schoolId]);

  // 3. Fetch Positions when Department changes
  useEffect(() => {
    if (formData.departmentId) {
      fetchPositions(formData.departmentId);
    } else {
      setPositions([]);
    }
  }, [formData.departmentId]);

  // If Edit Mode, fetch existing vacancy data
  useEffect(() => {
    if (isEditMode) {
      fetchExistingJob(id);
    }
  }, [id]);

  const fetchSchools = async (type) => {
    try {
      const data = await apiRequest(`/admin/schools?type=${type}`);
      setSchools(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch schools error:', err);
    }
  };

  const fetchDepartments = async (schId) => {
    try {
      const data = await apiRequest(`/admin/schools/${schId}/departments`);
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch departments error:', err);
    }
  };

  const fetchPositions = async (deptId) => {
    try {
      const data = await apiRequest(`/admin/departments/${deptId}/positions`);
      setPositions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch positions error:', err);
    }
  };

  const fetchExistingJob = async (jobId) => {
    setLoading(true);
    try {
      const data = await apiRequest(`/admin/vacancies/${jobId}`);
      if (data) {
        setFormData({
          vacancyNumber: data.vacancyNumber || '',
          type: data.type || 'TEACHING',
          schoolId: data.schoolId || '',
          departmentId: data.departmentId || '',
          positionId: data.positionId || '',
          position: data.position || '',
          department: data.department || '',
          employmentType: data.employmentType || 'Full Time',
          numPositions: data.numPositions || 1,
          location: data.location || 'Pune',
          qualification: data.qualification || '',
          experience: data.experience || '',
          skills: data.skills || '',
          salaryScale: data.salaryScale || '',
          description: data.description || '',
          eligibilityCriteria: data.eligibilityCriteria || '',
          requiredDocuments: data.requiredDocuments || '',
          openingDate: data.openingDate ? data.openingDate.split('T')[0] : new Date().toISOString().split('T')[0],
          deadline: data.deadline ? data.deadline.split('T')[0] : '',
          status: data.status || 'DRAFT'
        });
      }
    } catch (err) {
      setErrorMsg('Failed to load existing vacancy details.');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setFormData((prev) => ({
      ...prev,
      type: newType,
      schoolId: '',
      departmentId: '',
      positionId: '',
      position: '',
      department: ''
    }));
  };

  const handleSchoolChange = (e) => {
    const schId = e.target.value;
    const selectedSch = schools.find((s) => s.id === schId);

    setFormData((prev) => ({
      ...prev,
      schoolId: schId,
      departmentId: '',
      positionId: '',
      position: '',
      department: selectedSch ? selectedSch.name : ''
    }));
  };

  const handleDepartmentChange = (e) => {
    const deptId = e.target.value;
    const selectedDept = departments.find((d) => d.id === deptId);

    setFormData((prev) => ({
      ...prev,
      departmentId: deptId,
      positionId: '',
      position: ''
    }));
  };

  const handlePositionChange = (e) => {
    const posVal = e.target.value;
    // Check if selecting an existing position ID or typing custom string
    const selectedPos = positions.find((p) => p.id === posVal || p.title === posVal);

    if (selectedPos) {
      setFormData((prev) => ({
        ...prev,
        positionId: selectedPos.id,
        position: selectedPos.title
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        positionId: '',
        position: posVal
      }));
    }
  };

  const handleSubmit = async (targetStatus) => {
    setSubmitting(true);
    setErrorMsg('');

    const payload = {
      ...formData,
      status: targetStatus || formData.status
    };

    if (!payload.position || !payload.qualification || !payload.experience || !payload.description || !payload.deadline) {
      setErrorMsg('Please fill in all mandatory fields: Position, Qualification, Experience, Description, and Deadline.');
      setSubmitting(false);
      return;
    }

    try {
      const endpoint = isEditMode ? `/admin/vacancies/${id}` : '/admin/vacancies';
      const method = isEditMode ? 'PUT' : 'POST';

      await apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload)
      });

      navigate('/admin/jobs');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading form...</div>;
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '960px' }}>
      {/* Top Bar */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link to="/admin/jobs" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
            &larr; Back to Vacancies List
          </Link>
          <h2 style={{ margin: '6px 0 0 0', color: '#0f172a', fontSize: '1.5rem', fontWeight: 800 }}>
            {isEditMode ? 'Edit Vacancy Opening' : 'CREATE VACANCY'}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => handleSubmit('DRAFT')}
            disabled={submitting}
            style={draftBtnStyle}
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('PUBLISHED')}
            disabled={submitting}
            style={publishBtnStyle}
          >
            {submitting ? 'Publishing...' : 'Publish Vacancy'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Clean Basic Form Card */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <form onSubmit={(e) => e.preventDefault()}>
          {/* SECTION 1: VACANCY CLASSIFICATION & DROPDOWNS */}
          <div style={sectionBoxStyle}>
            <h4 style={sectionTitleStyle}>1. Classification & Department Setup</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Vacancy Type *</label>
                <select style={selectStyle} value={formData.type} onChange={handleTypeChange}>
                  <option value="TEACHING">Teaching</option>
                  <option value="NON_TEACHING">Non-Teaching</option>
                </select>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Vacancy / Reference Number</label>
                <input
                  type="text"
                  placeholder="Auto-generated if left blank (e.g. VAC-2026-001)"
                  style={inputStyle}
                  value={formData.vacancyNumber}
                  onChange={(e) => setFormData({ ...formData, vacancyNumber: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '12px' }}>
              {/* School / Institute Dropdown */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>School / Institute *</label>
                <select style={selectStyle} value={formData.schoolId} onChange={handleSchoolChange}>
                  <option value="">-- Select School --</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Department Dynamic Dropdown */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Department *</label>
                <select style={selectStyle} value={formData.departmentId} onChange={handleDepartmentChange} disabled={!formData.schoolId}>
                  <option value="">-- Select Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Position Dynamic Dropdown or Custom Title */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Position / Designation *</label>
                {positions.length > 0 ? (
                  <select style={selectStyle} value={formData.positionId || formData.position} onChange={handlePositionChange}>
                    <option value="">-- Select Position --</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Assistant Professor – Computer Science"
                    style={inputStyle}
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: POSITION TERMS & DATES */}
          <div style={sectionBoxStyle}>
            <h4 style={sectionTitleStyle}>2. Employment Terms & Schedule</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Employment Type</label>
                <select style={selectStyle} value={formData.employmentType} onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Adjunct">Adjunct</option>
                </select>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Number of Openings</label>
                <input
                  type="number"
                  min="1"
                  style={inputStyle}
                  value={formData.numPositions}
                  onChange={(e) => setFormData({ ...formData, numPositions: e.target.value })}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Location</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Salary / Pay Scale</label>
                <input
                  type="text"
                  placeholder="e.g. 7th Pay Commission Scale"
                  style={inputStyle}
                  value={formData.salaryScale}
                  onChange={(e) => setFormData({ ...formData, salaryScale: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '12px' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Application Opening Date *</label>
                <input
                  type="date"
                  required
                  style={inputStyle}
                  value={formData.openingDate}
                  onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Application Deadline *</label>
                <input
                  type="date"
                  required
                  style={inputStyle}
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Publication Status</label>
                <select style={selectStyle} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="CLOSED">Closed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: QUALIFICATIONS, DESCRIPTION & ELIGIBILITY */}
          <div style={sectionBoxStyle}>
            <h4 style={sectionTitleStyle}>3. Candidate Requirements & Description</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Qualification *</label>
                <textarea
                  rows={3}
                  required
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Ph.D. in Computer Science or M.Tech with First Class..."
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Experience *</label>
                <textarea
                  rows={3}
                  required
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Minimum 2 to 5 years teaching/industry research experience..."
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                />
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Skills & Competencies</label>
              <input
                type="text"
                placeholder="Python, Machine Learning, Web Technologies, Database Systems"
                style={inputStyle}
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Job Description *</label>
              <textarea
                rows={4}
                required
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Detailed duties and responsibilities for this position..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Eligibility Criteria</label>
                <textarea
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Ph.D. mandatory, NET/SET qualification preferred..."
                  value={formData.eligibilityCriteria}
                  onChange={(e) => setFormData({ ...formData, eligibilityCriteria: e.target.value })}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Required Documents</label>
                <textarea
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="CV/Resume, Educational Certificates, Experience Letters..."
                  value={formData.requiredDocuments}
                  onChange={(e) => setFormData({ ...formData, requiredDocuments: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => navigate('/admin/jobs')}
              style={cancelBtnStyle}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('DRAFT')}
              disabled={submitting}
              style={draftBtnStyle}
            >
              Save Draft
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('PUBLISHED')}
              disabled={submitting}
              style={publishBtnStyle}
            >
              {submitting ? 'Publishing...' : 'Publish Vacancy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const sectionBoxStyle = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '20px',
  marginBottom: '20px'
};

const sectionTitleStyle = {
  fontSize: '0.95rem',
  color: '#0f3b46',
  fontWeight: 800,
  margin: '0 0 16px 0',
  borderBottom: '1px solid #cbd5e1',
  paddingBottom: '8px'
};

const formGroupStyle = {
  marginBottom: '12px'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#334155',
  marginBottom: '4px'
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '0.88rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box'
};

const selectStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '0.88rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box'
};

const draftBtnStyle = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#334155',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer'
};

const publishBtnStyle = {
  padding: '10px 24px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#0f766e',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer'
};

const cancelBtnStyle = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#f1f5f9',
  color: '#64748b',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer'
};

export default AdminCreateJob;
