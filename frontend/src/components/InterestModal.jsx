import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

function InterestModal({ isOpen, onClose, defaultCategory = 'TEACHING', defaultSchoolId = '', defaultPosition = '' }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    category: defaultCategory,
    schoolId: defaultSchoolId,
    interestedPosition: defaultPosition,
    message: ''
  });

  const [schools, setSchools] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        email: '',
        mobile: '',
        category: defaultCategory,
        schoolId: defaultSchoolId,
        interestedPosition: defaultPosition,
        message: ''
      });
      setSuccessMsg('');
      setErrorMsg('');
      fetchSchools(defaultCategory);
    }
  }, [isOpen, defaultCategory, defaultSchoolId, defaultPosition]);

  const fetchSchools = async (category) => {
    try {
      const data = await apiRequest(`/public/schools?type=${category}`);
      setSchools(data || []);
    } catch (err) {
      console.error('Failed to fetch schools for interest modal:', err);
    }
  };

  const handleCategoryChange = (cat) => {
    setFormData((prev) => ({ ...prev, category: cat, schoolId: '' }));
    fetchSchools(cat);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const data = await apiRequest('/public/vacancy-interest', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      setSuccessMsg(data.message || 'Interest registered successfully! We will notify you when a vacancy opens.');
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={backdropStyle} onClick={onClose}>
      <div className="modal-card" style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#0f3b46', fontSize: '1.25rem', fontWeight: 800 }}>
            Notify Me When Open
          </h3>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
          Applications for this position are currently closed. Leave your details below and we will automatically notify you when a relevant vacancy opens at DYPIU.
        </p>

        {successMsg && (
          <div style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 600 }}>
            ✓ {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Vacancy Type *</label>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                <input
                  type="radio"
                  name="category"
                  value="TEACHING"
                  checked={formData.category === 'TEACHING'}
                  onChange={() => handleCategoryChange('TEACHING')}
                />
                Teaching
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                <input
                  type="radio"
                  name="category"
                  value="NON_TEACHING"
                  checked={formData.category === 'NON_TEACHING'}
                  onChange={() => handleCategoryChange('NON_TEACHING')}
                />
                Non-Teaching
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Full Name *</label>
              <input
                type="text"
                required
                style={inputStyle}
                placeholder="Dr. Rahul Verma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email"
                required
                style={inputStyle}
                placeholder="rahul@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Mobile Number *</label>
              <input
                type="tel"
                required
                style={inputStyle}
                placeholder="9876543210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Interested School / Division</label>
              <select
                style={inputStyle}
                value={formData.schoolId}
                onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
              >
                <option value="">-- Select School --</option>
                {schools.map((sch) => (
                  <option key={sch.id} value={sch.id}>{sch.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Interested Position / Designation *</label>
            <input
              type="text"
              required
              style={inputStyle}
              placeholder="e.g. Assistant Professor – Computer Science or Graphic Designer"
              value={formData.interestedPosition}
              onChange={(e) => setFormData({ ...formData, interestedPosition: e.target.value })}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Optional Message / Qualifications Summary</label>
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Ph.D. with 3 years teaching experience in Machine Learning..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={submitBtnStyle}>
              {submitting ? 'Submitting...' : 'Notify Me'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const backdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1100,
  padding: '20px'
};

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '560px',
  padding: '28px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  color: '#64748b',
  cursor: 'pointer',
  padding: '0 4px'
};

const formGroupStyle = {
  marginBottom: '14px'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 700,
  color: '#334155',
  marginBottom: '4px'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '0.9rem',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box'
};

const cancelBtnStyle = {
  padding: '10px 18px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#475569',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer'
};

const submitBtnStyle = {
  padding: '10px 22px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#0f766e',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer'
};

export default InterestModal;
