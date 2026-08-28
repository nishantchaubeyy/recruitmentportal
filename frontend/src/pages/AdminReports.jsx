import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

function AdminReports() {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchReport() {
      try {
        const data = await apiRequest('/reports');
        setReport(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, []);

  const handleDownloadCSV = () => {
    if (report.length === 0) return;

    // Headers
    const headers = ['Position', 'Type', 'Department', 'Posted Date', 'Applications Received', 'Shortlisted', 'Rejected', 'Under Review'];
    
    // Construct rows
    const rows = report.map(job => [
      `"${job.position.replace(/"/g, '""')}"`,
      job.type,
      `"${job.department.replace(/"/g, '""')}"`,
      new Date(job.postedDate).toLocaleDateString('en-IN'),
      job.totalApplications,
      job.shortlisted,
      job.rejected,
      job.underReview
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dypiu_recruitment_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Recruitment Summary Reports</h2>
        {report.length > 0 && (
          <button onClick={handleDownloadCSV} className="btn btn-success">
            Download CSV Report
          </button>
        )}
      </div>
      <p style={{ color: '#64748b', marginBottom: '25px' }}>
        Job-wise metrics summarizing total candidates and current pipeline status breakdowns.
      </p>

      {error && (
        <div style={{ padding: '10px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading reports...</p>
      ) : report.length === 0 ? (
        <p style={{ fontStyle: 'italic', color: '#64748b' }}>No openings found to generate reports.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Position / Designation</th>
              <th>Department / School</th>
              <th>Type</th>
              <th>Posted Date</th>
              <th>Applications Received</th>
              <th>Shortlisted</th>
              <th>Rejected</th>
              <th>Under Review</th>
            </tr>
          </thead>
          <tbody>
            {report.map((job) => (
              <tr key={job.jobId}>
                <td>
                  <strong>{job.position}</strong>
                </td>
                <td>{job.department}</td>
                <td>
                  <span className="badge" style={{ backgroundColor: '#cbd5e1', color: '#1e293b' }}>
                    {job.type}
                  </span>
                </td>
                <td>{new Date(job.postedDate).toLocaleDateString('en-IN')}</td>
                <td><strong>{job.totalApplications}</strong></td>
                <td style={{ color: '#166534', fontWeight: 600 }}>{job.shortlisted}</td>
                <td style={{ color: '#991b1b', fontWeight: 600 }}>{job.rejected}</td>
                <td style={{ color: '#b45309', fontWeight: 600 }}>{job.underReview}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminReports;
