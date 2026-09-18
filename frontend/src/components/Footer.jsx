import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer-dypiu" style={{ backgroundColor: '#8B1235', color: '#FFFFFF', padding: '0', marginTop: '60px' }}>
      <div 
        className="footer-content" 
        style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '48px 32px 40px 32px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          flexWrap: 'wrap', 
          gap: '40px' 
        }}
      >
        {/* LEFT COLUMN: BRAND LOGO & UNIVERSITY ADDRESS */}
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
            color: '#FFFFFF', 
            fontSize: '16px', 
            fontWeight: 400, 
            lineHeight: '1.6', 
            fontFamily: "Inter, 'DM Sans', 'Plus Jakarta Sans', sans-serif" 
          }}>
            <div>D. Y. Patil International University,</div>
            <div>Sector 29, Akurdi, Pune,</div>
            <div>Maharashtra. Pin - 411044.</div>
          </div>
        </div>

        {/* MIDDLE & RIGHT COLUMNS: PORTAL NAVIGATION & CANDIDATE ACCESS */}
        <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap', paddingTop: '4px' }}>
          {/* MIDDLE COLUMN: PORTAL NAVIGATION */}
          <div>
            <div style={{ 
              color: '#FFFFFF', 
              fontSize: '17px', 
              fontWeight: 800, 
              marginBottom: '18px', 
              letterSpacing: '0.5px', 
              textTransform: 'uppercase',
              fontFamily: "Inter, 'DM Sans', 'Plus Jakarta Sans', sans-serif"
            }}>
              PORTAL NAVIGATION
            </div>
            <ul className="footer-nav-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '12px' }}>
                <Link to="/teaching" className="footer-arrow-link">
                  <span className="link-arrow">▸</span> Teaching Positions
                </Link>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Link to="/non-teaching" className="footer-arrow-link">
                  <span className="link-arrow">▸</span> Non-Teaching Positions
                </Link>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Link to="/advertisments" className="footer-arrow-link">
                  <span className="link-arrow">▸</span> Advertisements
                </Link>
              </li>
            </ul>
          </div>

          {/* RIGHT COLUMN: CANDIDATE ACCESS */}
          <div>
            <div style={{ 
              color: '#FFFFFF', 
              fontSize: '17px', 
              fontWeight: 800, 
              marginBottom: '18px', 
              letterSpacing: '0.5px', 
              textTransform: 'uppercase',
              fontFamily: "Inter, 'DM Sans', 'Plus Jakarta Sans', sans-serif"
            }}>
              CANDIDATE ACCESS
            </div>
            <ul className="footer-nav-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '12px' }}>
                <Link to="/login" className="footer-arrow-link">
                  <span className="link-arrow">▸</span> Candidate Login
                </Link>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Link to="/register" className="footer-arrow-link">
                  <span className="link-arrow">▸</span> Candidate Registration
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* COMPACT CENTERED COPYRIGHT BAR */}
      <div 
        className="footer-bottom-bar" 
        style={{ 
          borderTop: '1px solid rgba(255, 255, 255, 0.15)', 
          color: '#FFFFFF',
          backgroundColor: '#700e2a',
          padding: '14px 24px',
          textAlign: 'center',
          fontSize: '14px',
          fontFamily: "Inter, 'DM Sans', 'Plus Jakarta Sans', sans-serif"
        }}
      >
        &copy; {new Date().getFullYear()} D Y Patil International University, Akurdi, Pune. All Rights Reserved.
      </div>
    </footer>
  );
}

export default Footer;
