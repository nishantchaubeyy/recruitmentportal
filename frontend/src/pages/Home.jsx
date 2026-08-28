import React from 'react';
import { useNavigate } from 'react-router-dom';
import VacancySlider from '../components/VacancySlider';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page-wrapper">
      {/* 1. HERO SECTION */}
      <section className="hero-conic-gradient-bg">
        <h1 style={{
          fontSize: '4.2rem',
          fontWeight: 900,
          color: '#0f2b5c',
          margin: 0,
          letterSpacing: '-1px',
          textAlign: 'center',
          lineHeight: '1.1'
        }}>
          Join DYPIU!
        </h1>
      </section>

      {/* 2. RECRUITMENT CATEGORIES SECTION */}
      <div className="container" id="categories" style={{ maxWidth: '980px', padding: '20px 24px 35px 24px' }}>
        <div className="centered-card-grid">
          {/* CARD 1: TEACHING POSITIONS */}
          <div 
            onClick={() => navigate('/teaching')}
            className="centered-category-card"
          >
            {/* Soft Abstract Pastel Geometric Background */}
            <img src="/imageblocks.png" alt="DYPIU Teaching Positions" className="centered-card-img" />

            {/* Translucent Soft Readability Overlay */}
            <div className="centered-card-overlay" />

            {/* Card Content (Centered Stack) */}
            <div className="centered-card-content">
              {/* Minimalist Outline Badge */}
              <div className="centered-card-badge-outline badge-outline-teal">
                ACADEMIC POSITIONS
              </div>

              {/* Bold Playfair Display Serif Heading */}
              <h3 className="centered-card-serif-heading">
                Teaching Positions
              </h3>
            </div>
          </div>

          {/* CARD 2: NON-TEACHING POSITIONS */}
          <div 
            onClick={() => navigate('/non-teaching')}
            className="centered-category-card"
          >
            {/* Soft Abstract Pastel Geometric Background */}
            <img src="/imageblocks.png" alt="DYPIU Non-Teaching Positions" className="centered-card-img" />

            {/* Translucent Soft Readability Overlay */}
            <div className="centered-card-overlay" />

            {/* Card Content (Centered Stack) */}
            <div className="centered-card-content">
              {/* Minimalist Outline Badge */}
              <div className="centered-card-badge-outline badge-outline-orange">
                ADMINISTRATIVE & STAFF
              </div>

              {/* Bold Playfair Display Serif Heading */}
              <h3 className="centered-card-serif-heading">
                Non-Teaching Positions
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC VACANCY SLIDER CAROUSEL */}
      <VacancySlider />

      {/* 4. CANDIDATE GUIDELINES CARD */}
      <div className="container" style={{ maxWidth: '980px', padding: '30px 24px 40px 24px' }}>
        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '28px 32px', 
          boxShadow: '0 4px 14px rgba(15,23,42,0.04)'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#0f2b5c', fontWeight: 800, fontSize: '1.1rem' }}>Candidate Guidelines:</h4>
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
