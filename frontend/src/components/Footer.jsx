import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer-dypiu" style={{ backgroundColor: '#0f2b5c', color: '#ffffff', padding: '0', marginTop: '60px' }}>
      <div className="footer-brand-stripe"></div>
      
      <div className="footer-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 32px 48px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '48px' }}>
        
        {/* BRAND & UNIVERSITY ADDRESS (MATCHING REFERENCE DESIGN) */}
        <div style={{ textAlign: 'left', maxWidth: '560px' }}>
          <img 
            src="/footerlogo.png" 
            alt="D Y PATIL INTERNATIONAL UNIVERSITY" 
            style={{ 
              height: '115px', 
              width: 'auto', 
              marginBottom: '28px',
              objectFit: 'contain',
              display: 'block'
            }} 
          />
          <div style={{ 
            color: '#ffffff', 
            fontSize: '1.25rem', 
            fontWeight: 500, 
            lineHeight: '1.8', 
            fontFamily: "'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          }}>
            <div>D. Y. Patil International University,</div>
            <div>Sector 29, Akurdi, Pune,</div>
            <div>Maharashtra. Pin - 411044.</div>
          </div>
        </div>

        {/* PORTAL QUICK LINKS */}
        <div style={{ display: 'flex', gap: '50px', flexWrap: 'wrap', paddingTop: '10px' }}>
          <div>
            <div style={{ color: '#ffffff', fontSize: '0.92rem', fontWeight: 700, marginBottom: '16px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              PORTAL NAVIGATION
            </div>
            <ul className="footer-links-list">
              <li><Link to="/teaching-positions" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Teaching Positions</Link></li>
              <li><Link to="/non-teaching-positions" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Non-Teaching Positions</Link></li>
              <li><Link to="/advertisments" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Advertisements</Link></li>
            </ul>
          </div>

          <div>
            <div style={{ color: '#ffffff', fontSize: '0.92rem', fontWeight: 700, marginBottom: '16px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              CANDIDATE ACCESS
            </div>
            <ul className="footer-links-list">
              <li><Link to="/login" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Candidate Login</Link></li>
              <li><Link to="/register" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Candidate Registration</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom-bar" style={{ borderColor: 'rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.75)' }}>
        &copy; {new Date().getFullYear()} D Y Patil International University, Akurdi, Pune. All Rights Reserved.
      </div>
    </footer>
  );
}

export default Footer;
