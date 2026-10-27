import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { IconSearch, IconBriefcase, IconCalendar } from '../components/icons/AdminIcons';

function CustomizedPositions() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchCustomVacancies();
  }, []);

  async function fetchCustomVacancies() {
    try {
      setLoading(true);
      setError('');
      // Calls public endpoint which filters status=PUBLISHED and deadline >= startOfToday
      const data = await apiRequest('/public/vacancies?category=CUSTOM');
      setVacancies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch customized positions error:', err);
      setError('Unable to load customized openings. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  // Derive available categories
  const categoriesList = Array.from(
    new Set(vacancies.map(v => v.customCategory || v.customLabel).filter(Boolean))
  );

  const filtered = vacancies.filter(v => {
    const q = searchQuery.toLowerCase().trim();
    const pos = (v.position || '').toLowerCase();
    const dept = (v.department || (v.school && v.school.name) || '').toLowerCase();
    const cat = (v.customCategory || v.customLabel || '').toLowerCase();

    const matchesQuery = !q || pos.includes(q) || dept.includes(q) || cat.includes(q);
    const matchesCat = !selectedCategory || cat === selectedCategory.toLowerCase();

    return matchesQuery && matchesCat;
  });

  return (
    <div className="page-watermark-wrapper" style={{ minHeight: '85vh', backgroundColor: '#F8FAFC', padding: '36px 20px 80px', fontFamily: "'Plus Jakarta Sans', Inter, -apple-system, sans-serif" }}>
      <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* TOP BACK BUTTON */}
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: '#721B28',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            &larr; Back to Positions
          </button>
        </div>

        {/* HERO BANNER */}
        <div style={{
          background: 'linear-gradient(135deg, #721B28 0%, #4A1019 100%)',
          borderRadius: '14px',
          padding: 'clamp(28px, 4vw, 44px)',
          color: '#FFFFFF',
          marginBottom: '32px',
          boxShadow: '0 8px 24px rgba(114, 27, 40, 0.15)',
          borderBottom: '4px solid #D4AF37'
        }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#FCD34D', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
            D Y PATIL INTERNATIONAL UNIVERSITY &bull; AKURDI, PUNE
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
            fontWeight: 800,
            margin: '0 0 10px 0',
            lineHeight: 1.2
          }}>
            Customized & Specialized Opportunities
          </h1>
          <p style={{ margin: 0, fontSize: '1rem', color: '#F1F5F9', maxWidth: '780px', lineHeight: 1.6 }}>
            Explore visiting faculty appointments, funded research project fellowships, academic consultancies, and student internships across university institutes.
          </p>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '28px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ flex: '2 1 260px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              <IconSearch size={16} color="#94A3B8" />
            </div>
            <input
              type="text"
              placeholder="Search by position title, school, or expertise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {categoriesList.length > 0 && (
            <div style={{ flex: '1 1 200px' }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">All Categories</option>
                {categoriesList.map((cat, i) => (
                  <option key={i} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {(searchQuery || selectedCategory) && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#721B28',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 8px'
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* POSITIONS LISTING */}
        {loading ? (
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#64748B', fontWeight: 600 }}>Loading customized recruitment openings...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '20px', color: '#991B1B', textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 700 }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '1.2rem', fontWeight: 800 }}>
              No Active Customized Vacancies Right Now
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#64748B', fontSize: '0.9rem', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
              We regularly announce visiting faculty fellowships, research positions, and specialized roles. You can also explore our core faculty and administrative careers.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/teaching"
                style={{
                  backgroundColor: '#721B28',
                  color: '#FFFFFF',
                  padding: '9px 18px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.86rem',
                  fontWeight: 700
                }}
              >
                View Teaching Positions &rarr;
              </Link>
              <Link
                to="/non-teaching"
                style={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  padding: '9px 18px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.86rem',
                  fontWeight: 700
                }}
              >
                View Non-Teaching Positions &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '22px' }}>
            {filtered.map((job) => {
              const categoryBadge = job.customLabel || job.customCategory || 'Customized Position';
              const deadlineDate = new Date(job.deadline);

              return (
                <div
                  key={job.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    position: 'relative'
                  }}
                >
                  <div>
                    {/* TOP BADGE */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{
                        backgroundColor: '#FEF2F2',
                        color: '#721B28',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        border: '1px solid #FECACA',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {categoryBadge}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#64748B', fontFamily: 'monospace' }}>
                        {job.vacancyNumber}
                      </span>
                    </div>

                    {/* TITLE */}
                    <h3 style={{
                      margin: '0 0 8px 0',
                      color: '#0F172A',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      lineHeight: 1.3
                    }}>
                      {job.position}
                    </h3>

                    {/* DEPARTMENT / SCHOOL */}
                    <div style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '14px', fontWeight: 600 }}>
                      {job.department || (job.school && job.school.name) || 'DYPIU Akurdi, Pune'}
                    </div>

                    {/* METADATA CHIPS */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                      <div style={metaChipStyle}>
                        <span>{job.employmentType || 'Full Time'}</span>
                      </div>
                      <div style={metaChipStyle}>
                        <span>{job.numPositions} {job.numPositions === 1 ? 'Opening' : 'Openings'}</span>
                      </div>
                      <div style={metaChipStyle}>
                        <span>{job.location || 'Pune'}</span>
                      </div>
                    </div>

                    {/* BRIEF DESCRIPTION */}
                    {job.description && (
                      <p style={{
                        margin: '0 0 16px 0',
                        fontSize: '0.84rem',
                        color: '#64748B',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {job.description}
                      </p>
                    )}
                  </div>

                  {/* BOTTOM FOOTER WITH DEADLINE & ACTIONS */}
                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748B', marginBottom: '14px' }}>
                      <IconCalendar size={13} color="#721B28" />
                      <span>
                        Deadline: <strong style={{ color: '#0F172A' }}>{deadlineDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Link
                        to={`/apply/${job.id}`}
                        style={{
                          flex: 1,
                          backgroundColor: '#721B28',
                          color: '#FFFFFF',
                          padding: '9px 14px',
                          borderRadius: '6px',
                          textAlign: 'center',
                          textDecoration: 'none',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          transition: 'background 0.15s ease'
                        }}
                      >
                        Apply Now &rarr;
                      </Link>
                      <Link
                        to={`/jobs/${job.id}`}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          color: '#0F172A',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          textAlign: 'center',
                          textDecoration: 'none',
                          fontSize: '0.84rem',
                          fontWeight: 700
                        }}
                      >
                        Details
                      </Link>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

const metaChipStyle = {
  backgroundColor: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '4px',
  padding: '3px 8px',
  fontSize: '0.74rem',
  color: '#475569',
  fontWeight: 600
};

export default CustomizedPositions;
