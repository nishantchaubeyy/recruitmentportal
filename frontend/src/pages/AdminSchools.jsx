import React, { useState, useEffect, useRef } from 'react';
import { apiRequest, getMediaUrl } from '../utils/api';
import {
  IconBriefcase,
  IconPlus,
  IconFileText,
  IconEye,
  IconTrash
} from '../components/icons/AdminIcons';

function AdminSchools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Filtering
  const [typeFilter, setTypeFilter] = useState(''); // '', 'TEACHING', 'NON_TEACHING'
  const [posterFilter, setPosterFilter] = useState(''); // '', 'WITH_POSTER', 'WITHOUT_POSTER'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeSchoolForUpload, setActiveSchoolForUpload] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Full Poster Preview Modal
  const [previewModalSchool, setPreviewModalSchool] = useState(null);

  // Deleting state
  const [deletingId, setDeletingId] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/admin/schools');
      setSchools(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load schools list.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(''), 4000);
  };

  const handleOpenUpload = (school) => {
    setActiveSchoolForUpload(school);
    setSelectedFile(null);
    setPreviewUrl('');
    setUploadError('');
  };

  const handleCloseUpload = () => {
    setActiveSchoolForUpload(null);
    setSelectedFile(null);
    setPreviewUrl('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setUploadError('Invalid format. Only JPEG, JPG, PNG, and WebP images are allowed.');
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit.');
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    setUploadError('');
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !activeSchoolForUpload) return;

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('poster', selectedFile);

      await apiRequest(`/admin/schools/${activeSchoolForUpload.id}/poster`, {
        method: 'POST',
        body: formData
      });

      showNotification(`Recruitment poster updated for "${activeSchoolForUpload.name}".`);
      handleCloseUpload();
      fetchSchools();
    } catch (err) {
      setUploadError(err.message || 'Failed to upload poster. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePoster = async (school) => {
    if (!window.confirm(`Are you sure you want to remove the recruitment poster for "${school.name}"? The school will automatically switch back to displaying active vacancy cards.`)) {
      return;
    }

    setDeletingId(school.id);
    try {
      await apiRequest(`/admin/schools/${school.id}/poster`, {
        method: 'DELETE'
      });
      showNotification(`Poster removed for "${school.name}". Vacancy cards will now display.`);
      fetchSchools();
    } catch (err) {
      alert(`Failed to remove poster: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Schools
  const filteredSchools = schools.filter((s) => {
    if (typeFilter && s.type !== typeFilter) return false;
    const hasPoster = Boolean(s.posterUrl || s.recruitmentPosterUrl);
    if (posterFilter === 'WITH_POSTER' && !hasPoster) return false;
    if (posterFilter === 'WITHOUT_POSTER' && hasPoster) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchCode = s.code?.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    return true;
  });

  const totalWithPoster = schools.filter((s) => Boolean(s.posterUrl || s.recruitmentPosterUrl)).length;
  const totalSchools = schools.length;

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem', fontWeight: 800 }}>
            Faculty & School Posters
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Upload and manage recruitment posters per School/Faculty. Schools with an active poster will display the poster only, replacing vacancy cards.
          </p>
        </div>

        {/* Stats Summary Pill */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '8px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Posters Active
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f766e' }}>
              {totalWithPoster} / {totalSchools} Schools
            </div>
          </div>
        </div>
      </div>

      {successBanner && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✓</span>
          <span>{successBanner}</span>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Filter Control Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: '1 1 180px' }}>
          <label style={filterLabelStyle}>FACULTY TYPE</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
            <option value="">All Types ({schools.length})</option>
            <option value="TEACHING">Teaching Faculties</option>
            <option value="NON_TEACHING">Non-Teaching Divisions</option>
          </select>
        </div>

        <div style={{ flex: '1 1 180px' }}>
          <label style={filterLabelStyle}>POSTER STATUS</label>
          <select value={posterFilter} onChange={(e) => setPosterFilter(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            <option value="WITH_POSTER">With Poster (Poster Mode)</option>
            <option value="WITHOUT_POSTER">Without Poster (Vacancy Cards Mode)</option>
          </select>
        </div>

        <div style={{ flex: '1 1 240px' }}>
          <label style={filterLabelStyle}>SEARCH SCHOOLS</label>
          <input
            type="text"
            placeholder="Search school or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            <p style={{ fontWeight: 600 }}>Loading schools and poster configurations...</p>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📋</div>
            <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>No schools match your filter criteria.</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem' }}>Try clearing filters or search query.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 20px' }}>School / Faculty</th>
                  <th style={{ padding: '14px 16px' }}>Type</th>
                  <th style={{ padding: '14px 16px' }}>Current Display Mode</th>
                  <th style={{ padding: '14px 16px' }}>Poster Preview</th>
                  <th style={{ padding: '14px 16px' }}>Active Vacancies</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school, index) => {
                  const poster = school.posterUrl || school.recruitmentPosterUrl;
                  const hasPoster = Boolean(poster);
                  const activeVacancies = school._count?.jobs ?? 0;

                  return (
                    <tr
                      key={school.id}
                      style={{
                        borderBottom: index < filteredSchools.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* School Name & Code */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.94rem' }}>
                          {school.name}
                        </div>
                        {school.code && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                            Code: {school.code}
                          </div>
                        )}
                      </td>

                      {/* Type Tag */}
                      <td style={{ padding: '16px 16px' }}>
                        <span style={{
                          backgroundColor: school.type === 'TEACHING' ? '#ccfbf1' : '#e0e7ff',
                          color: school.type === 'TEACHING' ? '#0f766e' : '#3730a3',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>
                          {school.type === 'TEACHING' ? 'Teaching' : 'Non-Teaching'}
                        </span>
                      </td>

                      {/* Current Display Mode */}
                      <td style={{ padding: '16px 16px' }}>
                        {hasPoster ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                            Poster Mode (Active)
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94a3b8' }}></span>
                            Vacancy Cards Mode
                          </div>
                        )}
                      </td>

                      {/* Poster Preview Thumbnail */}
                      <td style={{ padding: '16px 16px' }}>
                        {hasPoster ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              onClick={() => setPreviewModalSchool(school)}
                              style={{
                                width: '54px',
                                height: '54px',
                                borderRadius: '6px',
                                border: '1.5px solid #0d9488',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                backgroundColor: '#f8fafc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Click to view full poster"
                            >
                              <img
                                src={getMediaUrl(poster)}
                                alt={`Poster for ${school.name}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                            <button
                              onClick={() => setPreviewModalSchool(school)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#0f766e',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                padding: 0
                              }}
                            >
                              View Full
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                            No poster assigned
                          </span>
                        )}
                      </td>

                      {/* Active Vacancies */}
                      <td style={{ padding: '16px 16px' }}>
                        <span style={{
                          fontWeight: 700,
                          color: activeVacancies > 0 ? '#0f172a' : '#94a3b8',
                          fontSize: '0.88rem'
                        }}>
                          {activeVacancies} {activeVacancies === 1 ? 'opening' : 'openings'}
                        </span>
                        {hasPoster && activeVacancies > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                            (Hidden while poster is active)
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                          {hasPoster ? (
                            <>
                              <button
                                onClick={() => handleOpenUpload(school)}
                                style={secondaryBtnStyle}
                                title="Upload a new poster to replace the current one"
                              >
                                Replace Poster
                              </button>
                              <button
                                onClick={() => handleDeletePoster(school)}
                                disabled={deletingId === school.id}
                                style={dangerBtnStyle}
                                title="Remove poster and switch back to vacancy cards"
                              >
                                {deletingId === school.id ? 'Removing...' : 'Remove'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenUpload(school)}
                              style={primaryBtnStyle}
                              title="Upload a recruitment poster for this school"
                            >
                              + Upload Poster
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* UPLOAD / REPLACE MODAL */}
      {activeSchoolForUpload && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>
                  {activeSchoolForUpload.posterUrl || activeSchoolForUpload.recruitmentPosterUrl ? 'Replace Recruitment Poster' : 'Upload Recruitment Poster'}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#0d9488', fontWeight: 700, marginTop: '2px' }}>
                  {activeSchoolForUpload.name}
                </div>
              </div>
              <button
                onClick={handleCloseUpload}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUploadSubmit} style={{ padding: '24px' }}>
              {uploadError && (
                <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {uploadError}
                </div>
              )}

              {/* Current Poster Notice if replacing */}
              {(activeSchoolForUpload.posterUrl || activeSchoolForUpload.recruitmentPosterUrl) && !previewUrl && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={getMediaUrl(activeSchoolForUpload.posterUrl || activeSchoolForUpload.recruitmentPosterUrl)}
                    alt="Current Poster"
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>CURRENT POSTER ASSIGNED</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Uploading a new poster will replace this image.</div>
                  </div>
                </div>
              )}

              {/* File Dropzone Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #0d9488',
                  borderRadius: '10px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  backgroundColor: previewUrl ? '#f0fdf4' : '#fafafa',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginBottom: '16px'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {previewUrl ? (
                  <div>
                    <img
                      src={previewUrl}
                      alt="Selected Preview"
                      style={{ maxHeight: '220px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    />
                    <div style={{ marginTop: '10px', fontSize: '0.85rem', fontWeight: 700, color: '#0f766e' }}>
                      {selectedFile?.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      Click to choose a different image
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🖼️</div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                      Click to browse or drag and drop poster image
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                      Supported formats: <strong>JPG, JPEG, PNG, WebP</strong> (Max: 10MB)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#0d9488', marginTop: '4px', fontWeight: 600 }}>
                      Recommended: 1200 × 1600 px (Portrait aspect ratio)
                    </div>
                  </div>
                )}
              </div>

              {/* Guidance Info Box */}
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.5 }}>
                <strong>Display Behavior:</strong> Once uploaded, this poster will appear directly inside the expanded faculty card on the public website, completely replacing vacancy cards for <em>{activeSchoolForUpload.name}</em>.
              </div>

              {/* Modal Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleCloseUpload}
                  style={cancelBtnStyle}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  style={{
                    ...primaryBtnStyle,
                    opacity: !selectedFile || uploading ? 0.6 : 1,
                    cursor: !selectedFile || uploading ? 'not-allowed' : 'pointer',
                    padding: '9px 20px'
                  }}
                >
                  {uploading ? 'Uploading...' : 'Save & Publish Poster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL POSTER PREVIEW MODAL */}
      {previewModalSchool && (
        <div style={modalOverlayStyle} onClick={() => setPreviewModalSchool(null)}>
          <div
            style={{
              ...modalCardStyle,
              maxWidth: '820px',
              padding: '0',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.15rem', fontWeight: 800 }}>
                  {previewModalSchool.name}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Recruitment Poster Live Preview
                </div>
              </div>
              <button
                onClick={() => setPreviewModalSchool(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '24px', backgroundColor: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', maxHeight: '75vh', overflowY: 'auto' }}>
              <img
                src={getMediaUrl(previewModalSchool.posterUrl || previewModalSchool.recruitmentPosterUrl)}
                alt={`Poster for ${previewModalSchool.name}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '68vh',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                }}
              />
            </div>

            <div style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Status: <strong style={{ color: '#0f766e' }}>Active on website</strong>
              </span>
              <button
                onClick={() => setPreviewModalSchool(null)}
                style={secondaryBtnStyle}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared UI Styles ──────────────────────────────────────────
const filterLabelStyle = {
  display: 'block',
  fontSize: '0.68rem',
  fontWeight: 800,
  color: '#64748b',
  marginBottom: '6px',
  letterSpacing: '0.5px'
};

const selectStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '0.85rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  outline: 'none',
  fontWeight: 600
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '0.85rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box'
};

const primaryBtnStyle = {
  backgroundColor: '#0f766e',
  color: '#ffffff',
  border: 'none',
  padding: '7px 14px',
  borderRadius: '6px',
  fontWeight: 700,
  fontSize: '0.82rem',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease'
};

const secondaryBtnStyle = {
  backgroundColor: '#f1f5f9',
  color: '#334155',
  border: '1px solid #cbd5e1',
  padding: '6px 12px',
  borderRadius: '6px',
  fontWeight: 700,
  fontSize: '0.82rem',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
};

const dangerBtnStyle = {
  backgroundColor: '#fef2f2',
  color: '#b91c1c',
  border: '1px solid #fecaca',
  padding: '6px 12px',
  borderRadius: '6px',
  fontWeight: 700,
  fontSize: '0.82rem',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
};

const cancelBtnStyle = {
  backgroundColor: '#ffffff',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  padding: '8px 16px',
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer'
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  width: '100%',
  maxWidth: '560px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
  overflow: 'hidden',
  animation: 'fadeIn 0.2s ease-out'
};

export default AdminSchools;
