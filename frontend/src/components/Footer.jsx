import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer-dypiu" style={{ backgroundColor: '#669BBC', color: '#ffffff', padding: '0', marginTop: '60px' }}>
      <div 
        className="footer-content" 
        style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '44px 32px 36px 32px', 
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'flex-start', 
          flexWrap: 'wrap', 
          gap: '40px' 
        }}
      >
        {/* LEFT COLUMN: BIGGER BRAND LOGO & READABLE UNIVERSITY ADDRESS */}
        <div style={{ textAlign: 'left', maxWidth: '440px', flex: '1 1 340px' }}>
          <img 
            src="/footerlogo.png" 
            alt="D Y PATIL INTERNATIONAL UNIVERSITY" 
            className="footer-logo-img"
            style={{ 
              width: '310px', 
              height: 'auto', 
              marginBottom: '18px',
              objectFit: 'contain',
              display: 'block'
            }} 
          />
          <div style={{ 
            color: '#ffffff', 
            fontSize: '18px', 
            fontWeight: 500, 
            lineHeight: '1.6', 
            fontFamily: "Inter, 'DM Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          }}>
            <div>D. Y. Patil International University,</div>
            <div>Sector 29, Akurdi, Pune,</div>
            <div>Maharashtra. Pin - 411044.</div>
          </div>
        </div>

        {/* MIDDLE & RIGHT COLUMNS: PORTAL NAVIGATION & CANDIDATE ACCESS */}
        <div style={{ display: 'flex', gap: '56px', flexWrap: 'wrap', paddingTop: '4px' }}>
          {/* MIDDLE COLUMN: PORTAL NAVIGATION */}
          <div>
            <div style={{ 
              color: '#ffffff', 
              fontSize: '18px', 
              fontWeight: 700, 
              marginBottom: '16px', 
              letterSpacing: '0.5px', 
              textTransform: 'uppercase',
              fontFamily: "Inter, 'DM Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }}>
              PORTAL NAVIGATION
            </div>
            <ul className="footer-links-list">
              <li><Link to="/teaching-positions">Teaching Positions</Link></li>
              <li><Link to="/non-teaching-positions">Non-Teaching Positions</Link></li>
              <li><Link to="/advertisments">Advertisements</Link></li>
            </ul>
          </div>

          {/* RIGHT COLUMN: CANDIDATE ACCESS */}
          <div>
            <div style={{ 
              color: '#ffffff', 
              fontSize: '18px', 
              fontWeight: 700, 
              marginBottom: '16px', 
              letterSpacing: '0.5px', 
              textTransform: 'uppercase',
              fontFamily: "Inter, 'DM Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }}>
              CANDIDATE ACCESS
            </div>
            <ul className="footer-links-list">
              <li><Link to="/login">Candidate Login</Link></li>
              <li><Link to="/register">Candidate Registration</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* COMPACT CENTERED COPYRIGHT BAR */}
      <div 
        className="footer-bottom-bar" 
        style={{ 
          borderTop: '1px solid rgba(255, 255, 255, 0.2)', 
          color: 'rgba(255, 255, 255, 0.9)',
          padding: '14px 24px',
          textAlign: 'center',
          fontSize: '15px',
          fontFamily: "Inter, 'DM Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}
      >
        &copy; {new Date().getFullYear()} D Y Patil International University, Akurdi, Pune. All Rights Reserved.
      </div>
    </footer>
  );
}

export default Footer;

