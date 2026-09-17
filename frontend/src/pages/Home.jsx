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
  }
};

/* ─── COMPONENT ──────────────────────────────────────────────── */
function Home() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      {/* ─── Google Fonts: Playfair Display ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600;1,700&display=swap');

        .simple-category-card {
          position: relative;
          width: 100%;
          min-height: 195px;
          border-radius: 22px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          border: 2px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 14px 36px rgba(15, 23, 42, 0.14);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          cursor: pointer;
        }

        .simple-category-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 42px rgba(15, 23, 42, 0.2);
        }

        .card-teaching {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(209, 250, 229, 0.8) 100%);
        }

        .card-non-teaching {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(254, 215, 170, 0.8) 100%);
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

      {/* CATEGORY CARDS — Simple 2 Cards with Watermark Logo inside */}
      <div style={s.band}>
        <div style={s.grid}>

          {/* Card 1: Teaching */}
          <div
            className="simple-category-card card-teaching"
            role="button"
            tabIndex={0}
            aria-label="Teaching Positions"
            onClick={() => navigate('/teaching')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/teaching')}
          >
            {/* Watermark Logo Inside */}
            <img 
              src="/imageblocks.png" 
              alt="" 
              style={s.cardLogoInBetween} 
              aria-hidden="true" 
            />

            {/* Front Typography */}
            <div style={{ position: 'relative', zIndex: 3, textAlign: 'center' }}>
              <h3 style={s.cardTitle}>TEACHING</h3>
            </div>
          </div>

          {/* Card 2: Non-Teaching */}
          <div
            className="simple-category-card card-non-teaching"
            role="button"
            tabIndex={0}
            aria-label="Non-Teaching Positions"
            onClick={() => navigate('/non-teaching')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/non-teaching')}
          >
            {/* Watermark Logo Inside */}
            <img 
              src="/imageblocks.png" 
              alt="" 
              style={s.cardLogoInBetween} 
              aria-hidden="true" 
            />

            {/* Front Typography */}
            <div style={{ position: 'relative', zIndex: 3, textAlign: 'center' }}>
              <h3 style={s.cardTitle}>NON-TEACHING</h3>
            </div>
          </div>

        </div>
      </div>

      {/* FEATURED ROLES SLIDER */}
      <VacancySlider />

    </div>
  );
}

export default Home;