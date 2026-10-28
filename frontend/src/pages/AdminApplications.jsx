import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, API_URL, IS_MOCK } from '../utils/api';
import { IconSearch, IconCalendar, IconDownload } from '../components/icons/AdminIcons';
import { STATUS_TABS, statusLabel, statusBadgeStyle } from '../utils/status';
import ScheduleInterviewModal from '../components/ScheduleInterviewModal';

function AdminApplications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Dropdown Reference Data
  const [schools, setSchools] = useState([]);
  const [positions, setPositions] = useState([]);

  // Filter States
  const currentStatusTab = searchParams.get('status') || 'ALL';
  const [schoolFilter, setSchoolFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [nameFilter, setNameFilter] = useState('');
  const [applicationIdFilter, setApplicationIdFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Debounced input holders
  const [debouncedName, setDebouncedName] = useState('');
  const [debouncedAppId, setDebouncedAppId] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, total: 0 });

  // Schedule Interview Modal State
  const [selectedAppForInterview, setSelectedAppForInterview] = useState(null);

  // 1. Fetch dropdown lists (Schools & Positions)
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [schoolsRes, jobsRes] = await Promise.all([
          apiRequest('/public/schools').catch(() => []),
          apiRequest('/admin/vacancies').catch(() => [])
        ]);
        setSchools(Array.isArray(schoolsRes) ? schoolsRes : []);
        
        const jobsList = Array.isArray(jobsRes) ? jobsRes : (jobsRes?.data || []);
        const uniqueTitles = Array.from(new Set(jobsList.map(j => j.position).filter(Boolean)));
        setPositions(uniqueTitles);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    loadFilterOptions();
  }, []);

  // 2. 300ms Debounce for text inputs (Name, Application ID, Search Term)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedName(nameFilter);
    }, 300);
    return () => clearTimeout(handler);
  }, [nameFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAppId(applicationIdFilter);
    }, 300);
    return () => clearTimeout(handler);
  }, [applicationIdFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // 3. Refetch applications whenever filters change
  useEffect(() => {
    fetchApplications(1);
  }, [
    currentStatusTab,
    schoolFilter,
    positionFilter,
    typeFilter,
    debouncedName,
    debouncedAppId,
    debouncedSearch
  ]);

  async function fetchApplications(page = 1) {
    try {
      setLoading(true);
      setError('');
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '15'
      });

      if (currentStatusTab !== 'ALL') query.set('status', currentStatusTab);
      if (schoolFilter && schoolFilter !== 'ALL') query.set('schoolId', schoolFilter);
      if (positionFilter && positionFilter !== 'ALL') query.set('position', positionFilter);
      if (typeFilter && typeFilter !== 'ALL') query.set('type', typeFilter);
      if (debouncedName.trim()) query.set('candidateName', debouncedName.trim());
      if (debouncedAppId.trim()) query.set('applicationId', debouncedAppId.trim());
      if (debouncedSearch.trim()) query.set('q', debouncedSearch.trim());

      const res = await apiRequest(`/applications?${query.toString()}`);
      setApplications(res?.data || res || []);
      if (res?.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }

  const handleStatusTabChange = (status) => {
    if (status === 'ALL') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };

  const handleClearFilters = () => {
    setSchoolFilter('');
    setPositionFilter('');
    setTypeFilter('ALL');
    setNameFilter('');
    setApplicationIdFilter('');
    setSearchTerm('');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplications(1);
  };

  const handleClearApplications = () => {
    if (window.confirm('Are you sure you want to clear all candidate applications?')) {
      localStorage.removeItem('MOCK_APPLICATIONS_PERSIST');
      setApplications([]);
      fetchApplications(1);
    }
  };

  const handleInterviewScheduled = (res) => {
    setSelectedAppForInterview(null);
    let msg = 'Interview scheduled successfully. Invitations dispatched via email.';
    if (res?.zoomWarning) {
      msg += ` Note: ${res.zoomWarning}`;
    }
    setActionSuccess(msg);
    fetchApplications(pagination.page);
    setTimeout(() => setActionSuccess(''), 6000);
  };

  const getStatusBadgeStyle = statusBadgeStyle;

  const handleDownloadCV = async (appId, docId, originalName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/applications/${appId}/documents/${docId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not download CV. The candidate may not have uploaded one yet.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ color: '#0F172A', margin: 0, fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.3px' }}>
            Candidate Applications Screening
          </h2>
          <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '0.84rem' }}>
            Review candidate dossiers, filter by faculty or cadre, schedule panel interviews, and update recruitment status.
          </p>
        </div>
        {IS_MOCK && (
          <button
            onClick={handleClearApplications}
            style={clearButtonStyle}
          >
            Reset / Clear Demo Applications
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '8px', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {actionSuccess && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#721B28', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
          {actionSuccess}
        </div>
      )}

      {/* PIPELINE STATUS TAB BAR */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #E2E8F0', overflowX: 'auto', paddingBottom: '0' }}>
        {STATUS_TABS.map(tab => {
          const active = currentStatusTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleStatusTabChange(tab.key)}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                fontSize: '0.86rem',
                fontWeight: active ? 800 : 600,
                color: active ? '#721B28' : '#64748B',
                borderBottom: active ? '3px solid #721B28' : '3px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* FEATURE 2: EXPLICIT FILTER ROW & SEARCH BAR */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        
        {/* ROW 1: PRIMARY FREE TEXT SEARCH BAR */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: '12px', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              <IconSearch size={16} color="#94A3B8" />
            </div>
            <input 
              type="text"
              placeholder="Search by candidate name, application ID, or position..."
              style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.86rem', outline: 'none' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <button type="submit" style={{ backgroundColor: '#721B28', color: '#FFFFFF', padding: '9px 20px', border: 'none', borderRadius: '6px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
            Search
          </button>
        </form>

        {/* ROW 2: EXPLICIT FILTERS ROW (School, Position, Name, App ID, Vacancy Type, Clear) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
          alignItems: 'center'
        }}>
          
          {/* School / Faculty dropdown */}
          <div>
            <label style={filterLabelStyle}>School / Faculty</label>
            <select
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="">All Schools / Faculties</option>
              {schools.map(sch => (
                <option key={sch.id} value={sch.id}>
                  {sch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Applied For / Position dropdown */}
          <div>
            <label style={filterLabelStyle}>Position / Title</label>
            <select
              value={positionFilter}
              onChange={e => setPositionFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="">All Positions</option>
              {positions.map((pos, idx) => (
                <option key={idx} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          {/* Candidate Name Input */}
          <div>
            <label style={filterLabelStyle}>Candidate Name</label>
            <input
              type="text"
              placeholder="Filter by name..."
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
              style={textInputStyle}
            />
          </div>

          {/* Application ID Input */}
          <div>
            <label style={filterLabelStyle}>Application ID</label>
            <input
              type="text"
              placeholder="e.g. APP-2026-..."
              value={applicationIdFilter}
              onChange={e => setApplicationIdFilter(e.target.value)}
              style={textInputStyle}
            />
          </div>

          {/* Vacancy Type Dropdown */}
          <div>
            <label style={filterLabelStyle}>Vacancy Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="ALL">All Types</option>
              <option value="TEACHING">Teaching</option>
              <option value="NON_TEACHING">Non-Teaching</option>
              <option value="CUSTOM">Customized</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #721B28',
                color: '#721B28',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              Clear Filters
            </button>
          </div>

        </div>
      </div>

      {/* DATA TABLE */}
      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>Loading applications...</div>
      ) : applications.length === 0 ? (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748B' }}>
          <p style={{ margin: 0, fontSize: '0.92rem' }}>No candidate applications found for the selected stage and filter criteria.</p>
        </div>
      ) : (
        <>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#721B28', color: '#FFFFFF', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>App No.</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Candidate Name</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Position Applied</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>School / Dept</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Applied On</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Resume</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => {
                  const badge = getStatusBadgeStyle(app.status);
                  const candidateName = app.applicant?.name || `${app.personalInfo?.firstName || ''} ${app.personalInfo?.lastName || ''}`.trim() || 'Candidate';
                  const candidateEmail = app.applicant?.user?.email || app.personalInfo?.email;
                  const isCustomVacancy = app.job?.type === 'CUSTOM';
                  const typeBadgeText = isCustomVacancy ? (app.job?.customLabel || app.job?.customCategory || 'Customized') : app.job?.type;

                  return (
                    <tr key={app.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                        {app.applicationNumber}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{candidateName}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '1px' }}>{candidateEmail}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{app.job?.position || app.personalInfo?.postAppliedFor || 'Position'}</div>
                        <div style={{ display: 'inline-block', fontSize: '0.72rem', color: '#721B28', fontWeight: 700, backgroundColor: '#FEF2F2', padding: '1px 6px', borderRadius: '4px', marginTop: '2px' }}>
                          {typeBadgeText}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {app.job?.department || app.personalInfo?.faculty || 'DYPIU Campus'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`
                        }}>
                          {statusLabel(app.status) || 'Application Submitted'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {app.documents && app.documents.length > 0 ? (
                          <button
                            onClick={() => handleDownloadCV(app.id, app.documents[0].id, app.documents[0].originalName)}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1.5px solid #721B28',
                              color: '#721B28',
                              padding: '5px 10px',
                              borderRadius: '5px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 2px rgba(114,27,40,0.06)'
                            }}
                            title={`Download Resume: ${app.documents[0].originalName || 'resume.pdf'}`}
                          >
                            <IconDownload size={13} color="#721B28" />
                            Download Resume
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: '#94A3B8', fontStyle: 'italic' }}>
                            Not attached
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => setSelectedAppForInterview(app)}
                            style={{
                              backgroundColor: '#721B28',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Schedule panel interview with Meeting invite"
                          >
                            <IconCalendar size={13} color="#FFFFFF" />
                            {app.status === 'INTERVIEW_SCHEDULED' ? 'Reschedule' : 'Schedule Interview'}
                          </button>
                          <button 
                            onClick={() => navigate(`/admin/applications/${app.id}`)}
                            style={ghostButtonStyle}
                          >
                            Review &rarr;
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION BAR */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total || applications.length} applications)
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchApplications(pagination.page - 1)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                    color: pagination.page <= 1 ? '#94A3B8' : '#0F172A'
                  }}
                >
                  &larr; Prev
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchApplications(pagination.page + 1)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                    color: pagination.page >= pagination.totalPages ? '#94A3B8' : '#0F172A'
                  }}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* SCHEDULE INTERVIEW MODAL */}
      <ScheduleInterviewModal
        application={selectedAppForInterview}
        isOpen={Boolean(selectedAppForInterview)}
        onClose={() => setSelectedAppForInterview(null)}
        onSuccess={handleInterviewScheduled}
      />

    </div>
  );
}

const filterLabelStyle = {
  display: 'block',
  fontSize: '0.74rem',
  fontWeight: 700,
  color: '#475569',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.4px'
};

const selectStyle = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  fontSize: '0.84rem',
  color: '#0F172A',
  backgroundColor: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box'
};

const textInputStyle = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  fontSize: '0.84rem',
  color: '#0F172A',
  backgroundColor: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box'
};

const clearButtonStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  color: '#991B1B',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '0.78rem',
  fontWeight: 700,
  cursor: 'pointer'
};

const ghostButtonStyle = {
  background: 'none',
  border: '1px solid #CBD5E1',
  color: '#0F172A',
  fontSize: '0.78rem',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '5px 10px',
  borderRadius: '4px',
  transition: 'all 0.15s ease'
};

export default AdminApplications;
