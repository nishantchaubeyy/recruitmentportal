import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, getMediaUrl } from '../utils/api';
import DYPIUWatermark from '../components/DYPIUWatermark';

/* ─── STYLES ─────────────────────────────────────────────────── */
const s = {
  page: { backgroundColor: '#ffffff', minHeight: '100vh' },

  hero: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#0f172a',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },

  heroImgLayer: {
    width: '100%',
    height: 'auto',
    maxHeight: '540px',
    objectFit: 'contain',
    display: 'block',
  },
};

const StatCounter = ({ target, duration = 1600, suffix = '+' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let animationFrameId = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic curve for smooth counter animation
      const current = Math.floor((1 - Math.pow(1 - progress, 3)) * target);
      setCount(current);
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
};

function Home() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState({
    TEACHING: false,
    NON_TEACHING: false
  });

  // Hero Background Image Carousel Slider (homeimg.png and image.png)
  const heroImages = [
    '/homeimg.png',
    '/image.png'
  ];
  const [heroImageIdx, setHeroImageIdx] = useState(0);
  const [isPreloading, setIsPreloading] = useState(true);

  useEffect(() => {
    // Re-enable transitions only after initial first paint to prevent page load flash
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsPreloading(false);
      });
    });

    const sliderTimer = setInterval(() => {
      setHeroImageIdx((prevIdx) => (prevIdx + 1) % heroImages.length);
    }, 5000);

    return () => {
      cancelAnimationFrame(timer);
      clearInterval(sliderTimer);
    };
  }, [heroImages.length]);

  // Modal States
  const [selectedJobModal, setSelectedJobModal] = useState(null);
  const [activePosterUrl, setActivePosterUrl] = useState(null);

  useEffect(() => {
    fetchVacancies();
  }, []);

  const fetchVacancies = async () => {
    setLoading(true);
    try {
      const [vacData, schoolData] = await Promise.all([
        apiRequest('/public/vacancies').catch(() => []),
        apiRequest('/public/schools').catch(() => [])
      ]);
      setVacancies(Array.isArray(vacData) ? vacData : []);
      setSchools(Array.isArray(schoolData) ? schoolData : []);
    } catch (err) {
      console.error('Error fetching vacancies:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to resolve poster url for a job from job or school
  const findPosterForJob = (job, schoolsList = []) => {
    if (!job) return null;
    if (job.posterUrl) return job.posterUrl;
    if (job.school && (job.school.posterUrl || job.school.recruitmentPosterUrl)) {
      return job.school.posterUrl || job.school.recruitmentPosterUrl;
    }
    
    // Match with schools list by ID or name
    if (schoolsList && schoolsList.length > 0) {
      const matched = schoolsList.find(s => {
        if (job.schoolId && s.id === job.schoolId) return true;
        if (job.school && job.school.id && s.id === job.school.id) return true;
        
        const dept = (job.department || (job.school && job.school.name) || '').toLowerCase().trim();
        const sName = (s.name || '').toLowerCase().trim();
        const sCode = (s.code || '').toLowerCase().trim();
        if (!dept || (!sName && !sCode)) return false;
        
        return dept === sName || dept.includes(sName) || sName.includes(dept) || (sCode && dept.includes(sCode));
      });

      if (matched && (matched.posterUrl || matched.recruitmentPosterUrl)) {
        return matched.posterUrl || matched.recruitmentPosterUrl;
      }
    }
    return null;
  };

  // Derive unique departments/schools for filter dropdown
  const departmentsList = Array.from(
    new Set(
      vacancies
        .map(v => v.department || (v.school && v.school.name))
        .filter(Boolean)
    )
  );

  // Filtered vacancies logic
  const filteredVacancies = vacancies.filter(v => {
    const title = (v.position || v.title || '').toLowerCase();
    const dept = (v.department || (v.school && v.school.name) || '').toLowerCase();
    const type = (v.type || '').toUpperCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesQuery = !query || title.includes(query) || dept.includes(query);
    const matchesDept = !selectedDept || (v.department || (v.school && v.school.name)) === selectedDept;
    const matchesCategorySelect = !selectedCategory || type === selectedCategory;

    // Checkbox filters
    const activeCats = [];
    if (activeCategoryFilter.TEACHING) activeCats.push('TEACHING');
    if (activeCategoryFilter.NON_TEACHING) activeCats.push('NON_TEACHING');
    const matchesCheckboxCat = activeCats.length === 0 || activeCats.includes(type);

    return matchesQuery && matchesDept && matchesCategorySelect && matchesCheckboxCat;
  });

  const toggleCategoryCheckbox = (catKey) => {
    setActiveCategoryFilter(prev => ({
      ...prev,
      [catKey]: !prev[catKey]
    }));
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedDept('');
    setSelectedCategory('');
    setActiveCategoryFilter({ TEACHING: false, NON_TEACHING: false });
  };

  return (
    <div style={s.page}>
      {/* ─── Page Custom CSS ─── */}
      <style>{`
        /* ── OPEN POSITIONS SEARCH & FILTERS SECTION ── */
        .open-positions-section {
          max-width: 1200px;
          margin: 40px auto 80px;
          padding: 0 24px;
          position: relative;
        }

        .section-header-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 2px solid #000000;
          padding-bottom: 12px;
        }

        .section-title {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          color: #000000;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .result-count-text {
          font-size: 1rem;
          font-weight: 700;
          color: #374151;
          margin: 0;
        }

        .search-bar-container {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
          margin-bottom: 28px;
        }

        .search-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: 12px;
          align-items: center;
        }

        @media (max-width: 900px) {
          .search-grid {
            grid-template-columns: 1fr;
          }
        }

        .search-input-field, .search-select-field {
          width: 100%;
          padding: 11px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.92rem;
          color: #1e293b;
          background-color: #ffffff;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .search-input-field:focus, .search-select-field:focus {
          border-color: #8B1235;
        }

        .btn-search-submit {
          background-color: #8B1235;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 0.92rem;
          padding: 11px 24px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .btn-search-submit:hover {
          background-color: #700e2a;
          color: #F2B01E;
        }

        .filter-checkbox-row {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }

        .filter-checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          user-select: none;
        }

        .filter-checkbox-label input[type="checkbox"] {
          accent-color: #8B1235;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .btn-clear-filters {
          background: none;
          border: none;
          color: #8B1235;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          margin-left: auto;
        }

        .btn-clear-filters:hover {
          color: #700e2a;
        }

        /* ── ELONGATED FULL-WIDTH RECTANGULAR VACANCY BOXES ── */
        .vacancy-list-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }

        .job-card-elongated {
          background: #ffffff;
          border: 2px solid #8B1235;
          border-radius: 12px;
          padding: 22px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          width: 100%;
          box-shadow: 0 4px 14px rgba(139, 18, 53, 0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }

        .job-card-elongated:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(139, 18, 53, 0.14);
        }

        @media (max-width: 768px) {
          .job-card-elongated {
            flex-direction: column;
            align-items: flex-start;
            padding: 20px;
          }
        }

        .job-info-left {
          flex: 1;
        }

        .job-title-elongated {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.35rem;
          font-weight: 800;
          color: #8B1235;
          line-height: 1.25;
          margin: 0 0 6px 0;
        }

        .job-meta-line {
          font-size: 0.90rem;
          color: #475569;
          font-weight: 500;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .job-tags-row {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .job-tag-pill {
          font-size: 0.78rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          background-color: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
        }

        .job-tag-pill.type-pill {
          background-color: #8B1235;
          color: #FFFFFF;
          border: none;
        }

        .job-actions-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .job-actions-right {
            width: 100%;
            justify-content: flex-start;
            margin-top: 14px;
            padding-top: 14px;
            border-top: 1px solid #f1f5f9;
          }
        }

        .btn-elongated-advertisement {
          background-color: #ffffff;
          color: #8B1235;
          border: 1.5px solid #8B1235;
          font-weight: 700;
          font-size: 0.88rem;
          padding: 9px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .btn-elongated-advertisement:hover {
          background-color: #8B1235;
          color: #F2B01E;
        }

        .btn-elongated-details {
          background-color: #8B1235;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 0.88rem;
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .btn-elongated-details:hover {
          background-color: #700e2a;
          color: #F2B01E;
        }

        .empty-jobs-container {
          text-align: center;
          padding: 60px 24px;
          background-color: #f8fafc;
          border: 1.5px dashed #cbd5e1;
          border-radius: 12px;
          color: #64748b;
          font-size: 1.05rem;
          font-weight: 600;
        }

        /* ── MODALS POP-UP STYLING ── */
        .portal-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(4px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-y: auto;
        }

        .portal-modal-card {
          background-color: #ffffff;
          border: 2px solid #8B1235;
          border-radius: 14px;
          max-width: 720px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          position: relative;
          padding: 32px;
        }

        .poster-modal-card {
          background-color: #ffffff;
          border: 2px solid #8B1235;
          border-radius: 14px;
          max-width: 850px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          position: relative;
          padding: 24px;
        }

        .portal-modal-close-btn {
          position: absolute;
          top: 16px;
          right: 20px;
          background: #f1f5f9;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          font-size: 1.2rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .portal-modal-close-btn:hover {
          background: #8B1235;
          color: #FFFFFF;
        }

        .modal-eyebrow {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #8B1235;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .modal-job-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.75rem;
          font-weight: 800;
          color: #8B1235;
          margin: 0 0 8px 0;
          line-height: 1.2;
        }

        .modal-job-dept {
          font-size: 0.95rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 20px;
        }

        .modal-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          background: #f8fafc;
          padding: 14px 18px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 24px;
        }

        .modal-meta-item span {
          display: block;
          font-size: 0.72rem;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
        }

        .modal-meta-item strong {
          font-size: 0.88rem;
          color: #1e293b;
        }

        .modal-section-block {
          margin-bottom: 20px;
        }

        .modal-section-block h4 {
          font-size: 0.85rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #8B1235;
          letter-spacing: 0.5px;
          margin: 0 0 8px 0;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }

        .modal-section-block p {
          font-size: 0.92rem;
          color: #334155;
          line-height: 1.6;
          margin: 0;
          white-space: pre-line;
        }

        .modal-action-footer {
          margin-top: 28px;
          padding-top: 20px;
          border-top: 2px solid #f1f5f9;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-modal-apply-now {
          background-color: #8B1235;
          color: #FFFFFF;
          font-weight: 800;
          font-size: 0.95rem;
          padding: 12px 28px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-modal-apply-now:hover {
          background-color: #700e2a;
          color: #F2B01E;
        }

        /* ─── LEFT-SIDE RED SHADE HERO SECTION STYLES ─── */
        .custom-hero-main {
          position: relative;
          overflow: hidden;
          background-color: #54121d;
          min-height: 85vh;
          display: flex;
          align-items: center;
        }

        .custom-hero-container {
          position: relative;
          width: 100%;
          min-height: 85vh;
          height: auto;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 0;
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .custom-hero-main,
          .custom-hero-container {
            min-height: 70vh;
          }
        }

        .custom-hero-slider-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 0;
          background-color: #54121d;
        }

        .custom-hero-bg-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 35%;
          opacity: 0;
          transition: opacity 1.2s ease-in-out;
          will-change: opacity;
          backface-visibility: hidden;
          pointer-events: none;
        }

        .custom-hero-bg-img.active {
          opacity: 1;
        }

        /* Disable transitions during the very first paint */
        .custom-hero-main.preload .custom-hero-bg-img {
          transition: none !important;
        }

        @media (max-width: 768px) {
          .custom-hero-bg-img {
            object-position: center center;
          }
        }

        /* LEFT-SIDE MAROON GRADIENT OVERLAY ONLY (fading to transparent by ~65%) */
        .custom-hero-overlay-left-maroon {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg,
            rgba(84, 18, 29, 0.92) 0%,
            rgba(84, 18, 29, 0.75) 30%,
            rgba(84, 18, 29, 0.35) 50%,
            rgba(84, 18, 29, 0) 65%);
          z-index: 2;
        }

        .custom-hero-overlay-top-anchor {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(84, 18, 29, 0.35) 0%, transparent 40%);
          z-index: 3;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .custom-hero-overlay-left-maroon {
            background: rgba(84, 18, 29, 0.75);
          }
        }

        .custom-hero-grid-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.04;
          pointer-events: none;
          background-image: radial-gradient(rgba(217, 164, 60, 0.4) 1px, transparent 1px);
          background-size: 24px 24px;
          z-index: 4;
        }

        .custom-hero-content {
          position: relative;
          z-index: 10;
          max-width: 640px;
          padding: 80px 60px;
          color: #ffffff;
          width: 100%;
          box-sizing: border-box;
          text-align: left;
        }

        @media (max-width: 768px) {
          .custom-hero-content {
            padding: 50px 24px;
          }
        }

        .custom-hero-text-block {
          width: 100%;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }

        .custom-hero-h1 {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #ffffff;
          line-height: 1.2;
          margin: 0;
          text-align: left;
          align-self: flex-start;
          text-shadow: 0 4px 18px rgba(0, 0, 0, 0.75), 0 2px 8px rgba(0, 0, 0, 0.6);
        }

        .hero-h1-line1 {
          display: block;
          text-align: left;
          font-size: clamp(2rem, 3.6vw, 2.9rem);
          font-weight: 700;
          color: #ffffff;
        }

        .hero-h1-line2 {
          display: block;
          text-align: left;
          font-size: clamp(2.3rem, 4.4vw, 3.5rem);
          font-weight: 800;
          color: #d9a43c;
          font-style: italic;
          margin: 3px 0;
        }

        .hero-h1-line3 {
          display: block;
          text-align: left;
          font-size: clamp(1.7rem, 3.2vw, 2.5rem);
          font-weight: 700;
          color: #ffffff;
        }

        .custom-hero-motto-stats-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          margin-top: 4px;
        }

        .custom-hero-motto {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(1.5rem, 2.8vw, 2.2rem);
          font-weight: 900;
          letter-spacing: 0.04em;
          color: #ffffff;
          line-height: 1.2;
          text-align: left;
          text-shadow: 0 4px 18px rgba(0, 0, 0, 0.8);
          margin-bottom: 8px;
        }

        /* Stats – force single horizontal row on desktop */
        .hero-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, auto);
          gap: 48px;
          margin-top: 24px;
          width: max-content;
        }

        @media (max-width: 768px) {
          .hero-stats-grid {
            grid-template-columns: 1fr;
            gap: 20px;
            width: auto;
          }
        }

        .hero-stat-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
        }

        .hero-stat-number {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 44px;
          font-weight: 800;
          color: #d9a43c;
          line-height: 1;
          margin-bottom: 6px;
          text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8);
        }

        .hero-stat-label {
          font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
          font-size: 13px;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          white-space: nowrap;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);
        }

        /* ─── CAREERS APPLICATION CATEGORY SELECTOR SECTION ─── */
        .careers-category-section {
          width: 100%;
          background-color: #ffffff;
          border-bottom: 1px solid #f3f4f6;
          padding: 48px 24px;
          position: relative;
          overflow: hidden;
        }

        @media (min-width: 768px) {
          .careers-category-section {
            padding: 56px 48px;
          }
        }

        .careers-category-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }

        .careers-header-row {
          margin-bottom: 32px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          border-bottom: 2px solid #000000;
          padding-bottom: 12px;
          gap: 16px;
        }

        .careers-title {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          font-size: clamp(2.2rem, 4vw, 3rem);
          font-weight: 800;
          color: #000000;
          letter-spacing: -0.02em;
          margin: 0;
          line-height: 1;
        }

        .careers-header-logo {
          height: 44px;
          max-height: 52px;
          object-fit: contain;
          display: block;
        }

        .careers-card-box {
          width: 100%;
          max-width: 1040px;
          margin: 0 auto;
          background-color: #ffffff;
          border: 1px solid #e2e4e8;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          padding: 44px 32px;
        }

        @media (min-width: 768px) {
          .careers-card-box {
            padding: 56px 52px;
          }
        }

        .careers-instruction-text {
          text-align: center;
          color: #374151;
          font-size: clamp(1.05rem, 1.8vw, 1.2rem);
          font-weight: 500;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto 36px;
        }

        .careers-buttons-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          max-width: 820px;
          margin: 0 auto;
        }

        @media (min-width: 640px) {
          .careers-buttons-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 28px;
          }
        }

        .portal-btn {
          background-color: #8B1235;
          color: #ffffff;
          border: 2px solid #8B1235;
          transition: all 0.3s ease;
          letter-spacing: 0.075em;
          display: block;
          width: 100%;
          padding: 16px 28px;
          text-align: center;
          font-weight: 700;
          font-size: 0.95rem;
          text-transform: uppercase;
          border-radius: 4px;
          cursor: pointer;
          user-select: none;
          text-decoration: none;
          box-sizing: border-box;
        }

        .portal-btn:hover {
          background-color: #ffffff;
          color: #8B1235;
          border-color: #8B1235;
          box-shadow: 0 4px 14px rgba(139, 18, 53, 0.25);
        }

        .portal-btn:active {
          transform: translateY(1px);
        }

        .careers-subtle-note {
          margin-top: 28px;
          text-align: center;
          font-size: 0.8rem;
          color: #9ca3af;
        }
      `}</style>

      {/* BEGIN: Hero Section */}
      <main className={`custom-hero-main ${isPreloading ? 'preload' : ''}`} id="hero">
        <div className="custom-hero-container">
          
          {/* Hero Background Image Slider (homeimg.png & image.png) */}
          <div className="custom-hero-slider-container">
            {heroImages.map((imgSrc, idx) => (
              <img 
                key={imgSrc}
                alt="D Y Patil International University Campus" 
                className={`custom-hero-bg-img ${idx === heroImageIdx ? 'active' : ''}`}
                src={imgSrc}
                loading="eager"
                decoding={idx === 0 ? "sync" : "async"}
                fetchPriority={idx === 0 ? "high" : "auto"}
              />
            ))}
          </div>
          
          {/* Left-Side Maroon Gradient Overlay (#54121d at ~90% opacity fading to transparent by 45-50%) */}
          <div className="custom-hero-overlay-left-maroon"></div>
          <div className="custom-hero-overlay-top-anchor"></div>
          
          {/* Subtle Grid Overlay */}
          <div className="custom-hero-grid-pattern"></div>
          
          {/* Foreground Left-Aligned Text Content Panel */}
          <div className="custom-hero-content">
            <div className="custom-hero-text-block">
              
              {/* LEFT-ALIGNED: Main Headline inside Maroon Panel */}
              <h1 className="custom-hero-h1">
                <span className="hero-h1-line1">Shape the Future of</span>
                <span className="hero-h1-line2">Innovation & Education</span>
                <span className="hero-h1-line3">at DY Patil International University</span>
              </h1>

              {/* LEFT-ALIGNED: Motto & Counting Stats inside Maroon Panel */}
              <div className="custom-hero-motto-stats-container">
                {/* Motto: Think. Thrive. Transform. */}
                <div className="custom-hero-motto">
                  Think. Thrive. Transform.
                </div>

                {/* Animated Counters Section */}
                <div className="hero-stats-grid">
                  
                  {/* Stat 1: Schools & Departments */}
                  <div className="hero-stat-card">
                    <div className="hero-stat-number">
                      <StatCounter target={10} suffix="+" />
                    </div>
                    <div className="hero-stat-label">
                      SCHOOLS & DEPARTMENTS
                    </div>
                  </div>

                  {/* Stat 2: Students */}
                  <div className="hero-stat-card">
                    <div className="hero-stat-number">
                      <StatCounter target={6000} suffix="+" />
                    </div>
                    <div className="hero-stat-label">
                      STUDENTS
                    </div>
                  </div>

                  {/* Stat 3: Faculties */}
                  <div className="hero-stat-card">
                    <div className="hero-stat-number">
                      <StatCounter target={200} suffix="+" />
                    </div>
                    <div className="hero-stat-label">
                      FACULTIES
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
      {/* END: Hero Section */}

      {/* ─── CAREERS APPLICATION CATEGORY SELECTOR SECTION ─── */}
      <section className="careers-category-section" aria-label="Careers Category Selector">
        {/* DYPIU Background Watermark shifted to the far right margin */}
        <DYPIUWatermark top="120px" right="10px" width="260px" opacity={0.18} />

        <div className="careers-category-wrapper">
          
          {/* Top Section: Large Bold Black Heading on the left */}
          <div className="careers-header-row">
            <h1 className="careers-title">
              Careers
            </h1>
          </div>

          {/* Centered Light Gray Bordered Card/Container */}
          <div className="careers-card-box">
            
            {/* Instruction text: Centered dark gray text */}
            <p className="careers-instruction-text">
              Please fill in the below application form to apply for position
            </p>

            {/* Two Buttons Grid: side-by-side on desktop, stacked on mobile */}
            <div className="careers-buttons-grid">
              
              {/* 1. TEACHING BUTTON */}
              <button 
                className="portal-btn"
                onClick={() => navigate('/teaching')}
              >
                TEACHING
              </button>

              {/* 2. NON TEACHING BUTTON */}
              <button 
                className="portal-btn"
                onClick={() => navigate('/non-teaching')}
              >
                NON TEACHING
              </button>

            </div>

            {/* Subtle note for applicants */}
            <div className="careers-subtle-note">
              <p>Select your category to view active job openings and initiate direct online submission</p>
            </div>

          </div>

        </div>
      </section>

      {/* ─── OPEN POSITIONS SEARCH & ELONGATED VACANCY BOXES SECTION ─── */}
      <section id="open-positions" className="open-positions-section" aria-label="Open Positions">
        <div className="section-header-row">
          <h2 className="section-title">OPEN POSITIONS</h2>
          <span className="result-count-text">
            ({filteredVacancies.length} {filteredVacancies.length === 1 ? 'role' : 'roles'})
          </span>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="search-bar-container">
          <div className="search-grid">
            {/* 1. Keyword / Role Input */}
            <input
              type="text"
              className="search-input-field"
              placeholder="Search by role, keyword or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* 2. Department / School Dropdown */}
            <select
              className="search-select-field"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {departmentsList.map((dept, idx) => (
                <option key={idx} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* 3. Job Type / Category Dropdown */}
            <select
              className="search-select-field"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Job Types</option>
              <option value="TEACHING">Teaching</option>
              <option value="NON_TEACHING">Non-Teaching</option>
            </select>

            {/* 4. Search Submit Button */}
            <button
              className="btn-search-submit"
              onClick={() => {}}
            >
              Search
            </button>
          </div>

          {/* Checkbox Category Filters */}
          <div className="filter-checkbox-row">
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>Filter by Category:</span>
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={activeCategoryFilter.TEACHING}
                onChange={() => toggleCategoryCheckbox('TEACHING')}
              />
              Teaching
            </label>
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={activeCategoryFilter.NON_TEACHING}
                onChange={() => toggleCategoryCheckbox('NON_TEACHING')}
              />
              Non-Teaching
            </label>

            {(searchQuery || selectedDept || selectedCategory || activeCategoryFilter.TEACHING || activeCategoryFilter.NON_TEACHING) && (
              <button className="btn-clear-filters" onClick={clearAllFilters}>
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* VACANCY LIST — ELONGATED RECTANGULAR BOXES */}
        {loading ? (
          <div className="empty-jobs-container">
            Loading active vacancies...
          </div>
        ) : filteredVacancies.length === 0 ? (
          <div className="empty-jobs-container">
            No current openings available.
          </div>
        ) : (
          <div className="vacancy-list-container">
            {filteredVacancies.map((job) => {
              const jobTitle = job.position || job.title || 'Academic / Staff Role';
              const jobDept = job.department || (job.school && job.school.name) || 'D Y Patil International University';
              const locationText = job.location || 'Akurdi, Pune';
              const jobType = job.type === 'TEACHING' ? 'Teaching' : job.type === 'NON_TEACHING' ? 'Non-Teaching' : job.type || 'Vacancy';
              const openingsCount = job.openings || job.positionsCount || 1;
              const posterPath = findPosterForJob(job, schools);
              const hasPoster = Boolean(posterPath);
              const posterMediaUrl = hasPoster ? getMediaUrl(posterPath) : null;

              return (
                <div key={job.id} className="job-card-elongated">
                  {/* LEFT SIDE: Position Details, Metadata & Badges */}
                  <div className="job-info-left">
                    <h3 className="job-title-elongated">{jobTitle}</h3>
                    <div className="job-meta-line">
                      <span>{jobDept}</span> &bull; <span>{locationText}</span> &bull; <span>{job.experience || 'Prior experience preferred'}</span> &bull; <strong style={{ color: '#16a34a' }}>{openingsCount} {openingsCount === 1 ? 'Opening' : 'Openings'}</strong>
                    </div>
                    <div className="job-tags-row">
                      <span className="job-tag-pill type-pill">{jobType}</span>
                      <span className="job-tag-pill">{job.employmentType || 'Full Time'}</span>
                    </div>
                  </div>

                  {/* RIGHT SIDE: Action Buttons (Advertisement + View Details) */}
                  <div className="job-actions-right">
                    {hasPoster && (
                      <button
                        className="btn-elongated-advertisement"
                        onClick={() => setActivePosterUrl(posterMediaUrl)}
                        title="View Official Recruitment Advertisement Poster"
                      >
                        Advertisement
                      </button>
                    )}

                    <button
                      className="btn-elongated-details"
                      onClick={() => setSelectedJobModal(job)}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── VACANCY DETAILS POP-UP MODAL ─── */}
      {selectedJobModal && (
        <div className="portal-modal-overlay" onClick={() => setSelectedJobModal(null)}>
          <div className="portal-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="portal-modal-close-btn" onClick={() => setSelectedJobModal(null)}>✕</button>

            <div className="modal-eyebrow">D Y PATIL INTERNATIONAL UNIVERSITY &bull; RECRUITMENT SPECIFICATION</div>
            <h2 className="modal-job-title">{selectedJobModal.position || selectedJobModal.title}</h2>
            <div className="modal-job-dept">
              {selectedJobModal.department || (selectedJobModal.school && selectedJobModal.school.name)} &bull; {selectedJobModal.type === 'TEACHING' ? 'Teaching Faculty' : 'Non-Teaching Staff'}
            </div>

            <div className="modal-meta-grid">
              <div className="modal-meta-item">
                <span>Openings</span>
                <strong>{selectedJobModal.openings || selectedJobModal.positionsCount || 1} Positions</strong>
              </div>
              <div className="modal-meta-item">
                <span>Campus</span>
                <strong>{selectedJobModal.location || 'Akurdi, Pune'}</strong>
              </div>
              <div className="modal-meta-item">
                <span>Employment Type</span>
                <strong>{selectedJobModal.employmentType || 'Full Time'}</strong>
              </div>
              <div className="modal-meta-item">
                <span>Deadline</span>
                <strong>
                  {selectedJobModal.deadline 
                    ? new Date(selectedJobModal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Open until filled'}
                </strong>
              </div>
            </div>

            {/* Description */}
            <div className="modal-section-block">
              <h4>Role Description & Scope</h4>
              <p>
                {selectedJobModal.description || 'Responsible for academic instruction, student mentoring, research supervision, and departmental development at DYPIU.'}
              </p>
            </div>

            {/* Qualifications & Experience */}
            {(selectedJobModal.qualification || selectedJobModal.experience) && (
              <div className="modal-section-block">
                <h4>Qualifications & Experience</h4>
                {selectedJobModal.qualification && (
                  <p style={{ marginBottom: '6px' }}>
                    <strong>Academic:</strong> {selectedJobModal.qualification}
                  </p>
                )}
                {selectedJobModal.experience && (
                  <p>
                    <strong>Experience:</strong> {selectedJobModal.experience}
                  </p>
                )}
              </div>
            )}

            {/* Advertisement Poster Preview inside Details */}
            {(() => {
              const modalPosterPath = findPosterForJob(selectedJobModal, schools);
              if (!modalPosterPath) return null;
              const modalPosterMediaUrl = getMediaUrl(modalPosterPath);
              return (
                <div className="modal-section-block">
                  <h4>Recruitment Advertisement Poster</h4>
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <img 
                      src={modalPosterMediaUrl} 
                      alt="Official Recruitment Poster" 
                      style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                      onClick={() => setActivePosterUrl(modalPosterMediaUrl)}
                    />
                  </div>
                </div>
              );
            })()}

            <div className="modal-action-footer">
              <button 
                className="btn-modal-apply-now"
                onClick={() => {
                  const jobId = selectedJobModal.id;
                  setSelectedJobModal(null);
                  navigate(`/apply?jobId=${jobId}`);
                }}
              >
                Proceed to Apply Now &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADVERTISEMENT POSTER POP-UP MODAL ─── */}
      {activePosterUrl && (
        <div className="portal-modal-overlay" onClick={() => setActivePosterUrl(null)}>
          <div className="poster-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="portal-modal-close-btn" onClick={() => setActivePosterUrl(null)}>✕</button>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#8B1235', fontFamily: 'Playfair Display, serif', fontSize: '1.4rem' }}>
                Official Recruitment Advertisement
              </h3>
              <img 
                src={activePosterUrl} 
                alt="Official Recruitment Poster" 
                style={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;