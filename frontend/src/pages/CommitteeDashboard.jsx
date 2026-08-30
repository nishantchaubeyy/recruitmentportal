import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

function CommitteeDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedInterview, setSelectedInterview] = useState(null);

  // Evaluation Form state
  const [evalData, setEvalData] = useState({
    communication: 8,
    technicalScore: 8,
    experienceScore: 8,
    domainScore: 8,
    recommendation: 'RECOMMEND',
    remarks: ''
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  async function fetchAssignments() {
    try {
      setLoading(true);
      const data = await apiRequest('/committee/assignments');
      setAssignments(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load committee candidate assignments.');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenEvaluation = (interview) => {
    setSelectedInterview(interview);
    setEvalData({
      communication: 8,
      technicalScore: 8,
      experienceScore: 8,
      domainScore: 8,
      recommendation: 'RECOMMEND',
      remarks: ''
    });
  };

  const handleEvaluationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInterview) return;

    setError('');
    setSuccess('');

    try {
      await apiRequest(`/interviews/${selectedInterview.id}/evaluation`, {
        method: 'POST',
        body: JSON.stringify(evalData)
      });

      setSuccess('Candidate evaluation score submitted confidentially.');
      setSelectedInterview(null);
      fetchAssignments();
    } catch (err) {
      setError(err.message || 'Failed to submit evaluation.');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '1050px' }}>
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ color: '#0f3b46', margin: 0, fontWeight: 800 }}>Selection Committee Evaluation Portal</h2>
        <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>
          Evaluate assigned candidate dossiers and record confidential interview recommendations.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', marginBottom: '20px' }}>
          {success}
        </div>
      )}

      {/* EVALUATION FORM MODAL */}
      {selectedInterview && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '30px',
            boxShadow: '0 20px 45px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#0f3b46' }}>Candidate Evaluation Form</h3>
              <button 
                onClick={() => setSelectedInterview(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f2b5c' }}>
                {selectedInterview.candidate?.name || 'Assigned Candidate'}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
                Vacancy: <strong>{selectedInterview.job?.position}</strong> ({selectedInterview.job?.department})
              </div>
            </div>

            <form onSubmit={handleEvaluationSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Communication Skills (1-10)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10"
                    className="form-input"
                    value={evalData.communication}
                    onChange={e => setEvalData({ ...evalData, communication: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Technical Expertise (1-10)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10"
                    className="form-input"
                    value={evalData.technicalScore}
                    onChange={e => setEvalData({ ...evalData, technicalScore: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Relevant Experience (1-10)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10"
                    className="form-input"
                    value={evalData.experienceScore}
                    onChange={e => setEvalData({ ...evalData, experienceScore: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Domain Knowledge (1-10)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10"
                    className="form-input"
                    value={evalData.domainScore}
                    onChange={e => setEvalData({ ...evalData, domainScore: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Committee Recommendation *</label>
                <select 
                  className="form-input"
                  value={evalData.recommendation}
                  onChange={e => setEvalData({ ...evalData, recommendation: e.target.value })}
                >
                  <option value="RECOMMEND">Recommend for Selection</option>
                  <option value="RECOMMEND_WITH_RESERVATION">Recommend with Reservation</option>
                  <option value="DO_NOT_RECOMMEND">Do Not Recommend</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Confidential Evaluation Remarks</label>
                <textarea 
                  className="form-input"
                  rows="3"
                  placeholder="Enter detailed strengths, technical assessment comments, and committee observations..."
                  value={evalData.remarks}
                  onChange={e => setEvalData({ ...evalData, remarks: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSelectedInterview(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                >
                  Submit Confidential Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGNED CANDIDATES LIST */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Loading assigned candidate dossiers...</p>
      ) : assignments.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <p style={{ margin: 0, fontSize: '1.05rem' }}>No candidate evaluations assigned to your profile currently.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {assignments.map(inv => (
            <div key={inv.id} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f3b46', marginBottom: '4px' }}>
                {inv.candidate?.name || 'Candidate Dossier'}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '16px' }}>
                Position: <strong>{inv.job?.position}</strong> ({inv.job?.department})
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', fontSize: '0.85rem', color: '#475569', marginBottom: '18px' }}>
                <div>🗓 Date: <strong>{new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ({inv.time})</strong></div>
                <div>📍 Mode: <strong>{inv.mode}</strong></div>
              </div>

              <button 
                className="btn btn-primary btn-sm btn-block"
                onClick={() => handleOpenEvaluation(inv)}
              >
                Evaluate Candidate &rarr;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CommitteeDashboard;
