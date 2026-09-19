import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const POSITIONS_DATA = {
  teaching: [
    {
      id: 'soc',
      name: 'SCHOOL OF COMPUTING',
      about: 'Offers B.Tech, M.Tech and Ph.D. programs in Computer Science, AI & Data Science, Cyber Security and allied areas with strong industry linkage.',
      roles: ['Professor', 'Associate Professor', 'Assistant Professor'],
      qualifications: [
        'Ph.D. in Computer Science / IT or a relevant discipline',
        'B.E./B.Tech and M.E./M.Tech with First Class throughout',
        'NET/SET qualified (for Assistant Professor, where applicable)',
        'As per UGC / AICTE norms'
      ],
      experience: ['Assistant Professor: 0–5 years', 'Associate Professor: min. 8 years', 'Professor: min. 10 years with research publications'],
      skills: ['Research publications in SCI/Scopus journals', 'Experience in funded projects preferred', 'Strong teaching & mentoring ability'],
      link: '/apply?type=TEACHING&faculty=SCHOOL%20OF%20COMPUTING'
    },
    {
      id: 'som',
      name: 'SCHOOL OF MANAGEMENT',
      about: 'Delivers BBA, MBA and doctoral programs focused on analytics, finance, marketing, HR and entrepreneurship.',
      roles: ['Professor', 'Associate Professor', 'Assistant Professor'],
      qualifications: ['Ph.D. in Management or related area', 'MBA / PGDM with First Class', 'NET/SET (as per UGC norms)'],
      experience: ['2–10 years of teaching / industry / research experience depending on level'],
      skills: ['Case-based teaching', 'Corporate consulting exposure', 'Research & publications'],
      link: '/apply?type=TEACHING&faculty=SCHOOL%20OF%20MANAGEMENT'
    },
    {
      id: 'bio',
      name: 'SCHOOL OF BIOSCIENCES & BIOENGINEERING',
      about: 'Interdisciplinary research-driven school covering biotechnology, bioinformatics and bioengineering.',
      roles: ['Professor', 'Associate Professor', 'Assistant Professor'],
      qualifications: ['Ph.D. in Life Sciences / Biotechnology / Bioengineering', 'Post-doctoral experience preferred'],
      experience: ['As per UGC norms for each cadre'],
      skills: ['Wet-lab expertise', 'Grant writing', 'Publications in high-impact journals'],
      link: '/apply?type=TEACHING&faculty=SCHOOL%20OF%20BIOSCIENCES%20%26%20BIOENGINEERING'
    },
    {
      id: 'design',
      name: 'SCHOOL OF ARCHITECTURE & DESIGN',
      about: 'Fosters creative design thinking, sustainable architecture, urban planning, visual communication and product design.',
      roles: ['Professor', 'Associate Professor', 'Assistant Professor'],
      qualifications: ['B.Arch + M.Arch / M.Des', 'Council of Architecture (COA) registration'],
      experience: ['As per COA / UGC norms for academic & professional practice'],
      skills: ['Studio teaching', 'Design & CAD/BIM software proficiency', 'Portfolio review & mentoring'],
      link: '/apply?type=TEACHING&faculty=SCHOOL%20OF%20ARCHITECTURE%20%26%20DESIGN'
    },
    {
      id: 'media',
      name: 'SCHOOL OF MEDIA & COMMUNICATION',
      about: 'Prepares media professionals in journalism, digital film production, public relations and corporate advertising.',
      roles: ['Professor', 'Associate Professor', 'Assistant Professor'],
      qualifications: ["Master's in Journalism / Mass Communication", 'Ph.D. preferred / NET qualified'],
      experience: ['3+ years industry or academic experience in media production'],
      skills: ['Digital media studio production', 'Broadcasting & editing', 'Journalistic writing'],
      link: '/apply?type=TEACHING&faculty=SCHOOL%20OF%20MEDIA%20%26%20COMMUNICATION'
    },
    {
      id: 'pharmacy',
      name: 'SCHOOL OF PHARMACY',
      about: 'Offers PCI-approved pharmaceutical education, drug discovery research and clinical trial studies.',
      roles: ['Professor', 'Associate Professor', 'Assistant Professor'],
      qualifications: ['M.Pharm / Ph.D. in Pharmaceutics / Pharmacology', 'PCI registration mandatory'],
      experience: ['As per Pharmacy Council of India (PCI) norms'],
      skills: ['Pharmaceutical lab research', 'Drug formulation', 'Scopus-indexed publications'],
      link: '/apply?type=TEACHING&faculty=SCHOOL%20OF%20PHARMACY'
    },
    {
      id: 'humanities',
      name: 'SCHOOL OF HUMANITIES & SOCIAL SCIENCES',
      about: 'Provides foundational and advanced instruction in English literature, psychology, economics and interdisciplinary social studies.',
      roles: ['Professor', 'Associate Professor', 'Assistant Professor'],
      qualifications: ["Master's degree with min. 55% + NET/SET or Ph.D."],
      experience: ['0–5 years teaching and research experience'],
      skills: ['Interdisciplinary pedagogy', 'Academic writing', 'Student counseling'],
      link: '/apply?type=TEACHING&faculty=SCHOOL%20OF%20HUMANITIES%20%26%20SOCIAL%20SCIENCES'
    },
    {
      id: 'research',
      name: 'RESEARCH & INNOVATION CENTRES',
      about: 'Hub for multi-institutional interdisciplinary scientific research, technology incubation and patenting.',
      roles: ['Research Scientist', 'Post-doctoral Fellow', 'Principal Investigator'],
      qualifications: ['Ph.D. in relevant discipline with strong research track record'],
      experience: ['Post-doc experience and proven grant writing capabilities'],
      skills: ['Grant proposal writing', 'Patenting & IP creation', 'High-impact journal publishing'],
      link: '/apply?type=TEACHING&faculty=RESEARCH%20%26%20INNOVATION%20CENTRES'
    }
  ],

  nonteaching: [
    {
      id: 'admin',
      name: 'UNIVERSITY ADMINISTRATION & OPERATIONS',
      about: 'Supports academic administration, student records, regulatory compliance and statutory university reporting.',
      roles: ['Deputy Registrar', 'Assistant Registrar', 'Office Superintendent', 'Administrative Executive'],
      qualifications: ["Master's degree with min. 55%", 'Knowledge of UGC / university regulations & statutory procedures'],
      experience: ['5–15 years in university / institutional administration'],
      skills: ['MS Office & ERP systems', 'Documentation & statutory compliance', 'Institutional communication'],
      link: '/apply?type=NON_TEACHING&faculty=UNIVERSITY%20ADMINISTRATION%20%26%20OPERATIONS'
    },
    {
      id: 'systems',
      name: 'SYSTEMS & IT INFRASTRUCTURE',
      about: 'Manages campus network backbone, server infrastructure, cloud systems, cyber security and IT helpdesk services.',
      roles: ['System Administrator', 'Network Engineer', 'IT Helpdesk Specialist'],
      qualifications: ['B.E./B.Tech in CS/IT / MCA / Diploma in Hardware & Networking'],
      experience: ['2–6 years managing enterprise networks and active directory'],
      skills: ['Cisco Networking', 'Linux & Windows Server Administration', 'Campus ERP Support'],
      link: '/apply?type=NON_TEACHING&faculty=SYSTEMS%20%26%20IT%20INFRASTRUCTURE'
    },
    {
      id: 'technical',
      name: 'TECHNICAL & LABORATORY SERVICES',
      about: 'Provides hands-on lab maintenance, equipment calibration and technical assistance for academic laboratories.',
      roles: ['Lab Assistant', 'Technical Instructor', 'Workshop Technician'],
      qualifications: ['B.Sc / Diploma in relevant branch or B.Tech'],
      experience: ['2–5 years in laboratory maintenance or industrial testing'],
      skills: ['Lab safety protocols', 'Equipment troubleshooting', 'Student practical guidance'],
      link: '/apply?type=NON_TEACHING&faculty=TECHNICAL%20%26%20LABORATORY%20SERVICES'
    },
    {
      id: 'finance',
      name: 'FINANCE & ACCOUNTS DEPARTMENT',
      about: 'Handles university accounting, budgeting, payroll, GST/TDS compliance and financial auditing.',
      roles: ['Accounts Officer', 'Senior Accountant', 'Audit Executive'],
      qualifications: ['M.Com / CA Inter / MBA Finance'],
      experience: ['3–8 years handling institutional finance and auditing'],
      skills: ['Tally Prime / SAP ERP', 'GST & TDS filing compliance', 'Budget forecasting & audit'],
      link: '/apply?type=NON_TEACHING&faculty=FINANCE%20%26%20ACCOUNTS%20DEPARTMENT'
    },
    {
      id: 'library',
      name: 'LIBRARY & INFORMATION SERVICES',
      about: 'Manages central digital library, e-resources, Koha LMS, journal subscriptions and archiving.',
      roles: ['Librarian', 'Assistant Librarian', 'Library Assistant'],
      qualifications: ['M.Lib.I.Sc + NET/SET or Ph.D.'],
      experience: ['As per UGC norms for university library cadres'],
      skills: ['Digital library systems', 'Koha LMS & DSpace', 'E-resource indexing'],
      link: '/apply?type=NON_TEACHING&faculty=LIBRARY%20%26%20INFORMATION%20SERVICES'
    },
    {
      id: 'branding',
      name: 'BRANDING, MEDIA & PROMOTION',
      about: 'Drives university outreach, digital marketing campaigns, social media, graphics design and public relations.',
      roles: ['Admission Counsellor', 'Marketing Executive', 'Graphic Designer', 'PR Manager'],
      qualifications: ['Graduate / MBA in Marketing / Mass Comm'],
      experience: ['1–5 years in admissions outreach or agency marketing'],
      skills: ['Student counselling', 'Social media campaigns & CRM', 'Copywriting & brand promotion'],
      link: '/apply?type=NON_TEACHING&faculty=BRANDING%2C%20MEDIA%20%26%20PROMOTION'
    },
    {
      id: 'estate',
      name: 'ESTATE & CIVIL ENGINEERING',
      about: 'Oversees campus facility management, infrastructure development, building maintenance and civil works.',
      roles: ['Estate Officer', 'Facility Manager', 'Civil Maintenance Supervisor'],
      qualifications: ['B.E. Civil / Diploma in Civil Engineering / Graduate'],
      experience: ['3–10 years in facility management or civil construction oversight'],
      skills: ['Building maintenance & MEP', 'Vendor management', 'Safety & environmental standards'],
      link: '/apply?type=NON_TEACHING&faculty=ESTATE%20%26%20CIVIL%20ENGINEERING'
    }
  ]
};

function PositionsExplorer({ category = 'teaching', title, subtitle }) {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(null);

  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  const handleApplyClick = (linkUrl) => {
    if (linkUrl) {
      navigate(linkUrl);
    }
  };

  const pageCat = category === 'nonteaching' ? 'nonteaching' : 'teaching';
  const currentList = POSITIONS_DATA[pageCat] || [];

  return (
    <section className="pos-section" id="open-positions" data-cat={pageCat}>
      <style>{`
        .pos-section {
          background: #ffffff;
          padding: 40px 0;
          font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
          width: 100%;
        }

        .pos-wrap {
          max-width: 1200px;
          margin: 0 auto;
        }

        .pos-title {
          font-family: 'Playfair Display', Georgia, serif;
          color: #721b28;
          font-size: 44px;
          font-weight: 800;
          margin: 0 0 10px 0;
          line-height: 1.15;
        }

        .pos-sub {
          color: #111111;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 30px 0;
          font-size: 0.95rem;
        }

        /* Two-column layout */
        .pos-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 30px;
          align-items: start;
        }

        /* Left list */
        .pos-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .pos-item {
          width: 100%;
          text-align: left;
          background: #7a1a2f;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 22px 28px;
          font-size: 17px;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.25s ease;
          box-sizing: border-box;
          line-height: 1.3;
        }

        .pos-item:hover {
          color: #d9a43c;
          background: #700e2a;
        }

        .pos-item.active {
          background: #54121d;
          color: #d9a43c;
          box-shadow: inset 6px 0 0 #d9a43c;
        }

        .pos-item::after {
          content: '›';
          font-size: 26px;
          line-height: 1;
          opacity: 0.7;
          margin-left: 12px;
          flex-shrink: 0;
        }

        /* Right panel */
        .pos-panel {
          position: sticky;
          top: 100px;
          background: #ffffff;
          border: 1px solid #e5e5e5;
          border-top: 5px solid #d9a43c;
          border-radius: 8px;
          padding: 36px 40px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
          min-height: 420px;
          opacity: 0;
          transform: translateX(20px);
          transition: opacity 0.35s ease, transform 0.35s ease;
          box-sizing: border-box;
        }

        .pos-panel.show {
          opacity: 1;
          transform: translateX(0);
        }

        .pos-panel .empty {
          color: #999999;
          text-align: center;
          padding: 120px 20px;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.6;
        }

        .pos-panel h3 {
          font-family: 'Playfair Display', Georgia, serif;
          color: #721b28;
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 12px 0;
          line-height: 1.25;
        }

        .pos-panel p {
          color: #444444;
          line-height: 1.7;
          margin: 0 0 20px 0;
          font-size: 15px;
        }

        .pos-panel h4 {
          color: #111111;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 800;
          margin: 22px 0 10px 0;
          padding-bottom: 6px;
          border-bottom: 2px solid #f0e2c6;
        }

        .pos-panel ul {
          margin: 0;
          padding-left: 20px;
          color: #444444;
          line-height: 1.8;
          font-size: 14px;
        }

        .pos-panel .badge-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }

        .pos-panel .badge {
          display: inline-block;
          background: #fdf6e7;
          color: #8a6516;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 20px;
        }

        .pos-apply {
          display: inline-block;
          margin-top: 28px;
          background: #d9a43c;
          color: #ffffff;
          border: 2px solid #d9a43c;
          padding: 14px 32px;
          border-radius: 4px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-decoration: none;
          transition: all 0.3s ease;
          cursor: pointer;
          user-select: none;
          font-size: 0.95rem;
        }

        .pos-apply:hover {
          background: #ffffff;
          color: #d9a43c;
        }

        @media (max-width: 900px) {
          .pos-grid {
            grid-template-columns: 1fr;
          }
          .pos-panel {
            position: static;
            min-height: auto;
          }
        }
      `}</style>

      <div className="pos-wrap">
        {title && <h2 className="pos-title">{title}</h2>}
        {subtitle && <p className="pos-sub">{subtitle}</p>}

        <div className="pos-grid">
          {/* Left Column: List of Maroon Block Buttons */}
          <div className="pos-list" id="posList">
            {currentList.map((item) => (
              <button
                key={item.id || item.name}
                className={`pos-item ${selectedItem?.name === item.name ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                <span>{item.name}</span>
              </button>
            ))}
          </div>

          {/* Right Column: Sticky Detail Panel */}
          <aside className={`pos-panel ${selectedItem ? 'show' : ''}`} id="posPanel">
            {selectedItem ? (
              <div>
                <h3>{selectedItem.name}</h3>
                <p>{selectedItem.about}</p>

                <h4>Positions Available</h4>
                <div className="badge-container">
                  {selectedItem.roles.map((role, i) => (
                    <span key={i} className="badge">
                      {role}
                    </span>
                  ))}
                </div>

                <h4>Qualifications</h4>
                <ul>
                  {selectedItem.qualifications.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>

                <h4>Experience</h4>
                <ul>
                  {selectedItem.experience.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>

                <h4>Desired Skills</h4>
                <ul>
                  {selectedItem.skills.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>

                <button
                  className="pos-apply"
                  onClick={() => handleApplyClick(selectedItem.link)}
                >
                  Apply Now
                </button>
              </div>
            ) : (
              <div className="empty">
                Select a school / department on the left to view details, eligibility and qualifications.
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

export default PositionsExplorer;
