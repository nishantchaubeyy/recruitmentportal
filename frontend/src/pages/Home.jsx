import React from 'react';
import { useNavigate } from 'react-router-dom';
import VacancySlider from '../components/VacancySlider';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page-wrapper">
      {/* 1. HERO SECTION */}
      <section className="hero-section-clean" style={{ padding: '50px 24px 40px 24px' }}>
        {/* Subtle Decorative Shapes */}
        <div className="hero-shape shape-teal"></div>
        <div className="hero-shape shape-yellow"></div>
        <div className="hero-shape shape-orange"></div>

        <div className="hero-content-inner">
          {/* Main Heading */}
          <h1 className="hero-title-main" style={{ marginBottom: '14px' }}>Join DYPIU</h1>

          {/* Paragraph */}
          <p className="hero-description-text" style={{ marginBottom: '0' }}>
            Explore current teaching and non-teaching opportunities at DY Patil International University. 
            Empowering future educators, researchers, and academic administrative leaders.
          </p>
        </div>
      </section>

      {/* 2. CATEGORY BLOCKS SECTION (TEACHING & NON-TEACHING CARDS) */}
      <div className="container" id="categories" style={{ maxWidth: '980px', padding: '40px 24px 25px 24px' }}>
        <div className="section-header-center" style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.75rem', color: '#0f3b46', fontWeight: 800 }}>Explore Recruitment Categories</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Select a position type below to view available departments</p>
        </div>

        <div className="hero-image-card-grid">
          {/* BLOCK 1: TEACHING POSITIONS */}
          <div 
            onClick={() => navigate('/teaching')}
            className="hero-image-card"
          >
            <img src="/teaching.jpg" alt="Teaching Positions" className="hero-card-img" />
            <div className="hero-card-overlay" />
            <div className="hero-card-content">
              <h3 className="hero-card-title">Teaching Positions</h3>
              <p className="hero-card-subtitle">
                Professors, Associate Professors, Assistant Professors & Research Staff
              </p>
              <div className="hero-card-action">
                <span>Explore Teaching Faculties</span>
                <span className="action-arrow">&rarr;</span>
              </div>
            </div>
          </div>

          {/* BLOCK 2: NON-TEACHING POSITIONS */}
          <div 
            onClick={() => navigate('/non-teaching')}
            className="hero-image-card"
          >
            <img src="/non-teaching.jpg" alt="Non-Teaching Positions" className="hero-card-img" />
            <div className="hero-card-overlay" />
            <div className="hero-card-content">
              <h3 className="hero-card-title">Non-Teaching Positions</h3>
              <p className="hero-card-subtitle">
                Administrative Officers, Registrars, IT Support, Lab & Library Staff
              </p>
              <div className="hero-card-action">
                <span>Explore Non-Teaching Divisions</span>
                <span className="action-arrow">&rarr;</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC VACANCY SLIDER CAROUSEL (PLACED BELOW TEACHING & NON-TEACHING BLOCKS) */}
      <VacancySlider />

      {/* 4. GUIDELINES CARD */}
      <div className="container" style={{ maxWidth: '980px', padding: '30px 24px 40px 24px' }}>
        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '28px 32px', 
          boxShadow: '0 4px 14px rgba(15,23,42,0.04)'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#0f3b46', fontWeight: 800, fontSize: '1.1rem' }}>📌 Candidate Guidelines:</h4>
          <ul style={{ paddingLeft: '22px', color: '#475569', fontSize: '0.94rem', lineHeight: '1.8' }}>
            <li>Select <strong>Teaching Positions</strong> or <strong>Non-Teaching Positions</strong> above to view available department vacancies.</li>
            <li>Selecting a specific department or faculty will open the official DYPIU application form.</li>
            <li>Make sure to keep your updated CV (PDF format, max 5MB) ready before submitting.</li>
            <li>Use the <strong>Track Application</strong> link at any time to monitor your application progress.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Home;
