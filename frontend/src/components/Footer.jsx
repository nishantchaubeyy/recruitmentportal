import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer-dypiu">
      <div className="footer-brand-stripe"></div>
      
      <div className="footer-content">
        {/* Column 1: Brand & Overview */}
        <div className="footer-brand-column">
          <h3>D Y PATIL INTERNATIONAL UNIVERSITY</h3>
          <p>
            Akurdi, Pune — Maharashtra, India. <br />
            Empowering education, research, and career growth through institutional excellence.
          </p>
        </div>

        {/* Column 2: Quick Links */}
        <div className="footer-column">
          <h4>Navigation</h4>
          <ul className="footer-links-list">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/teaching">Teaching Positions</Link></li>
            <li><Link to="/non-teaching">Non-Teaching Positions</Link></li>
          </ul>
        </div>

        {/* Column 3: Applicant Portal */}
        <div className="footer-column">
          <h4>Candidate Portal</h4>
          <ul className="footer-links-list">
            <li><Link to="/track">Track Application</Link></li>
            <li><Link to="/login">Candidate Login</Link></li>
            <li><Link to="/register">Candidate Registration</Link></li>
          </ul>
        </div>

        {/* Column 4: Contact & Support */}
        <div className="footer-column">
          <h4>Recruitment Helpdesk</h4>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.7' }}>
            Email: <strong>careers@dypiu.ac.in</strong><br />
            Phone: +91 020 2765 3055<br />
            Office Hours: Mon - Sat (9:00 AM - 5:00 PM)
          </p>
        </div>
      </div>

      <div className="footer-bottom-bar">
        &copy; {new Date().getFullYear()} D Y Patil International University, Akurdi, Pune. All Rights Reserved.
      </div>
    </footer>
  );
}

export default Footer;
