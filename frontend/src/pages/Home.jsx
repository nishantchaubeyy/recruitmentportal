import React from 'react';
import { useNavigate } from 'react-router-dom';
import VacancySlider from '../components/VacancySlider';

/* ─── OVERLAP MATH ─────────────────────────────────────────────
   HALF = 120: cards straddle the hero bottom edge seamlessly.
────────────────────────────────────────────────────────────── */
const HALF = 120;

/* ─── STYLES ─────────────────────────────────────────────────── */
const s = {
  page: { backgroundColor: '#ffffff', minHeight: '100vh' },

  hero: {
    position: 'relative',
    width: '100%',
    minHeight: '440px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: `70px 24px ${HALF}px`,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },

  /* LAYER 1 — Full DYPIU campus entrance photo (/DYPIU.png) */
  heroImgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center 18%',
    transform: 'none',
    zIndex: 0,
    pointerEvents: 'none',
  },

  /* LAYER 2 — Pure subtle dark navy tint (NO white fade) */
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.40)',
    zIndex: 1,
    pointerEvents: 'none',
  },

  /* LAYER 3 — Sharp "Join DYPIU!" header */
  heroInner: {
    position: 'relative',
    zIndex: 10,
    maxWidth: '820px',
    margin: '0 auto',
    padding: '0 12px',
  },

  h1: {
    fontSize: 'clamp(2.5rem, 6vw, 4rem)',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '-0.5px',
    lineHeight: 1.1,
    margin: 0,
    textShadow: '0 3px 18px rgba(0,0,0,0.65)',
  },

  /* ── CARDS BAND ── */
  band: {
    position: 'relative',
    zIndex: 20,
    marginTop: `-${HALF}px`,
    padding: '0 16px 0',
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 300px))',
    gap: '32px',
    width: '100%',
    maxWidth: '680px',
    justifyContent: 'center',
  },

  /* Premium Editorial Serif Card Title (#171717 Near-Black) */
  cardTitle: {
    fontFamily: "'Playfair Display', 'Cormorant Garamond', 'Times New Roman', Georgia, serif",
    fontSize: 'clamp(1.75rem, 3.5vw, 2.15rem)',
    fontWeight: 800,
    color: '#171717',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.2,
  },

  /* Blurred Logo Watermark Layer In-Between */
  cardLogoInBetween: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center',
    opacity: 0.18,
    filter: 'blur(1.5px)',
    transform: 'scale(1.15)',
    pointerEvents: 'none',
    zIndex: 2,
  },

  guide: { maxWidth: '900px', margin: '0 auto', padding: '0 20px 52px' },
  guideBox: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '22px 28px',
    boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
  },
  guideH: { margin: '0 0 10px', color: '#0f2b5c', fontWeight: 800, fontSize: '0.95rem' },
  guideUl: { paddingLeft: '20px', color: '#475569', fontSize: '0.88rem', lineHeight: 1.9, margin: 0 },
};

/* ─── COMPONENT ──────────────────────────────────────────────── */
function Home() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      {/* ─── Google Fonts: Playfair Display + Uiverse Aurora Glass Card CSS ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600;1,700&display=swap');

        /* From Uiverse.io by ali-sazzad (with clean dark shadow - no white glow bleed) */
        .sazzad-card {
          position: relative;
          width: 100%;
          min-height: 200px;
          border-radius: 22px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;

          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.85);

          box-shadow:
            0 16px 36px rgba(15, 23, 42, 0.16),
            0 4px 12px rgba(15, 23, 42, 0.08);

          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease;
          cursor: pointer;
        }

        .sazzad-card:hover {
          transform: translateY(-8px);
          box-shadow:
            0 24px 48px rgba(15, 23, 42, 0.22),
            0 8px 16px rgba(15, 23, 42, 0.12);
        }

        /* Inner Glow Panel */
        .sazzad-bg {
          position: absolute;
          inset: 6px;
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.94),
            rgba(248, 250, 252, 0.82)
          );
          border-radius: 18px;
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          z-index: 1;
        }

        /* Animated Aurora Blob - Green / Teal for Teaching */
        .sazzad-aurora-teal {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          filter: blur(26px);
          z-index: 1;

          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.90),
            rgba(5, 150, 105, 0.45),
            transparent
          );

          animation: sazzad-aurora-move 6.5s infinite ease-in-out;
          opacity: 0.95;
        }

        /* Animated Aurora Blob - Orange / Coral for Non-Teaching */
        .sazzad-aurora-orange {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          filter: blur(26px);
          z-index: 1;

          background: radial-gradient(
            circle,
            rgba(249, 115, 22, 0.90),
            rgba(234, 88, 12, 0.45),
            transparent
          );

          animation: sazzad-aurora-move 6.5s infinite ease-in-out;
          opacity: 0.95;
        }

        /* Aurora Animation */
        @keyframes sazzad-aurora-move {
          0% {
            transform: translate(-60%, -60%) scale(1);
          }
          30% {
            transform: translate(10%, -40%) scale(1.15);
          }
          60% {
            transform: translate(20%, 20%) scale(1.05);
          }
          80% {
            transform: translate(-40%, 10%) scale(1.2);
          }
          100% {
            transform: translate(-60%, -60%) scale(1);
          }
        }

        .sazzad-content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          width: 100%;
        }
      `}</style>

      {/* HERO — Pure photo + uniform dark tint + crisp "Join DYPIU!" */}
      <section style={s.hero} aria-label="DYPIU Careers Hero">

        {/* Layer 1: Full DYPIU Campus Entrance photo */}
        <img 
          src="/DYPIU.png" 
          alt="D Y Patil International University Campus" 
          style={s.heroImgLayer} 
          aria-hidden="true" 
        />

        {/* Layer 2: Pure uniform tint (NO white fade) */}
        <div style={s.heroOverlay} aria-hidden="true" />

        {/* Layer 3: Clean "Join DYPIU!" heading */}
        <div style={s.heroInner}>
          <h1 style={s.h1}>Join DYPIU!</h1>
        </div>

      </section>

      {/* CATEGORY CARDS — Frosted Glass Aurora Card with Watermark Logo & Editorial Serif Typography */}
      <div style={s.band}>
        <div style={s.grid}>

          {/* Card 1: Teaching */}
          <div
            className="sazzad-card"
            role="button"
            tabIndex={0}
            aria-label="Teaching Positions"
            onClick={() => navigate('/teaching')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/teaching')}
          >
            {/* Frosted Glass Background */}
            <div className="sazzad-bg" />
            
            {/* Animated Teal Aurora Glow */}
            <div className="sazzad-aurora-teal" />
            
            {/* Watermark Logo In-Between */}
            <img 
              src="/imageblocks.png" 
              alt="" 
              style={s.cardLogoInBetween} 
              aria-hidden="true" 
            />

            {/* Front Editorial Serif Typography */}
            <div className="sazzad-content">
              <h3 style={s.cardTitle}>TEACHING</h3>
            </div>
          </div>

          {/* Card 2: Non-Teaching */}
          <div
            className="sazzad-card"
            role="button"
            tabIndex={0}
            aria-label="Non-Teaching Positions"
            onClick={() => navigate('/non-teaching')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/non-teaching')}
          >
            {/* Frosted Glass Background */}
            <div className="sazzad-bg" />
            
            {/* Animated Orange Aurora Glow */}
            <div className="sazzad-aurora-orange" />
            
            {/* Watermark Logo In-Between */}
            <img 
              src="/imageblocks.png" 
              alt="" 
              style={s.cardLogoInBetween} 
              aria-hidden="true" 
            />

            {/* Front Editorial Serif Typography */}
            <div className="sazzad-content">
              <h3 style={s.cardTitle}>NON-TEACHING</h3>
            </div>
          </div>

        </div>
      </div>

      {/* FEATURED ROLES SLIDER */}
      <VacancySlider />

      {/* CANDIDATE GUIDELINES */}
      <div style={s.guide}>
        <div style={s.guideBox}>
          <h4 style={s.guideH}>Candidate Guidelines</h4>
          <ul style={s.guideUl}>
            <li>Select <strong>Teaching Positions</strong> or <strong>Non-Teaching Positions</strong> above to browse available vacancies.</li>
            <li>Selecting a department opens the official DYPIU application form.</li>
            <li>Have your CV ready in PDF format (max 5 MB) before submitting.</li>
            <li>Use the <strong>Track Application</strong> link to monitor your application at any time.</li>
          </ul>
        </div>
      </div>

    </div>
  );
}

export default Home;