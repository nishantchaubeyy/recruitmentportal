/**
 * Official DYPIU Approved University Structure
 * Master Data: Faculties -> Schools -> Departments -> Programs
 */

const APPROVED_UNIVERSITY_STRUCTURE = [
  {
    faculty: 'Faculty of Engineering & Technology',
    schools: [
      {
        name: 'School of Computer Science Engineering & Applications',
        code: 'SCSE',
        type: 'TEACHING',
        description: 'Leading education and research in Computer Science, Quantum Computing, Computational Mathematics, and Computer Applications.',
        departments: [
          {
            name: 'Department of Computer Science & Engineering',
            programs: [
              'B.Tech. - Computer Science and Engineering (CSE)',
              'M.Tech. - Computer Science (Quantum Computing)',
              'M.Sc. - Computational Mathematics'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Computer Applications',
            programs: [
              'B.C.A. (Hons.)',
              'MCA'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          }
        ]
      },
      {
        name: 'School of Continuing Education',
        code: 'SCE',
        type: 'TEACHING',
        description: 'Professional engineering programs in Electrical, Mechanical, and Electric Vehicles Engineering.',
        departments: [
          {
            name: 'Department of Electrical Engineering',
            programs: [
              'B.Tech. - Electrical Engineering (EE)'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Mechanical Engineering',
            programs: [
              'B.Tech. - Mechanical Engineering (ME)'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Electric Vehicles Engineering',
            programs: [
              'M.Tech. - Electric Vehicles',
              'M.Tech. - Smart Manufacturing'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          }
        ]
      },
      {
        name: 'School of Engineering, Management & Research',
        code: 'SEMR',
        type: 'TEACHING',
        description: 'Core and emerging disciplines in Semiconductor, Mechanical, Civil, and Chemical Engineering.',
        departments: [
          {
            name: 'Department of Semiconductor Engineering',
            programs: [
              'B.Tech. - Semiconductor Engineering (SCE)'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Mechanical Engineering',
            programs: [
              'B.Tech. - Mechanical Engineering (ME)'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Civil Engineering',
            programs: [
              'B.Tech. - Civil Engineering (CE)'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Chemical Engineering',
            programs: [
              'B.Tech. - Chemical Engineering (CME)'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          }
        ]
      },
      {
        name: 'School of Biosciences & Bioengineering',
        code: 'SOB',
        type: 'TEACHING',
        description: 'Cutting-edge biotechnology, bioengineering, life sciences, forensic sciences, and foundational natural sciences.',
        departments: [
          {
            name: 'Department of Biotechnology',
            programs: [
              'M.Sc. - Medical Biotechnology'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Bioengineering',
            programs: [
              'B.Tech. - Bioengineering'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Life Sciences',
            programs: [
              'M.Sc. - Medicinal Chemistry'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Forensic Sciences',
            programs: [
              'B.Sc. - Forensic Sciences (FS)'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Physics',
            programs: [
              'M.Sc. - Physics',
              'Ph.D. - Physics'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Chemistry',
            programs: [
              'M.Sc. - Chemistry',
              'Ph.D. - Chemistry'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Mathematics',
            programs: [
              'M.Sc. - Applied Mathematics',
              'Ph.D. - Mathematics'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          }
        ]
      }
    ]
  },
  {
    faculty: 'Faculty of Commerce & Business Management',
    schools: [
      {
        name: 'School of Commerce & Management',
        code: 'SCM',
        type: 'TEACHING',
        description: 'Industry-integrated education in business administration, executive leadership, and commerce.',
        departments: [
          {
            name: 'Department of Business Management',
            programs: [
              'BBA (Hons.)',
              'MBA - Digital Business',
              'MBA - Executive'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          }
        ]
      }
    ]
  },
  {
    faculty: 'Faculty of Design, Media & Communication',
    schools: [
      {
        name: 'School of Media & Journalism',
        code: 'SMJ',
        type: 'TEACHING',
        description: 'Professional training in broadcast journalism, digital news media, and mass communications.',
        departments: [
          {
            name: 'Department of Journalism & Mass Communication',
            programs: [
              'B.A.J. - Journalism & Mass Communication (Hons.)',
              'M.A. - Journalism & Mass Communication'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          }
        ]
      },
      {
        name: 'School of Design',
        code: 'SOD',
        type: 'TEACHING',
        description: 'Creative design thinking, product design, user experience, and visual communication.',
        departments: [
          {
            name: 'Department of Design',
            programs: [
              'B.Design'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          }
        ]
      }
    ]
  },
  {
    faculty: 'Faculty of Humanities & Sciences',
    schools: [
      {
        name: 'School of Applied Arts & Crafts',
        code: 'SAAC',
        type: 'TEACHING',
        description: 'Excellence in visual arts, fine arts, painting, applied crafts, and creative studio practices.',
        departments: [
          {
            name: 'Department of Fine Arts',
            programs: [
              'Bachelor of Fine Arts (BFA)'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          }
        ]
      },
      {
        name: 'School of Humanities & Social Sciences',
        code: 'SHSS',
        type: 'TEACHING',
        description: 'Interdisciplinary scholarship in liberal arts, economics, and contemporary social sciences.',
        departments: [
          {
            name: 'Department of Liberal Arts',
            programs: [
              'B.A. - Liberal Arts'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          },
          {
            name: 'Department of Social Sciences',
            programs: [
              'B.Sc. - Economics (Hons.)'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          }
        ]
      }
    ]
  },
  {
    faculty: 'Faculty of Law',
    schools: [
      {
        name: 'School of Law',
        code: 'SOL',
        type: 'TEACHING',
        description: 'Comprehensive legal education, constitutional advocacy, corporate jurisprudence, and international law.',
        departments: [
          {
            name: 'Department of Law',
            programs: [
              'B.A. LL.B. (Hons.)',
              'B.B.A. LL.B. (Hons.)',
              'LL.B.',
              'LL.M.'
            ],
            positions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor']
          }
        ]
      }
    ]
  },
  {
    faculty: 'Administrative & Operational Divisions',
    schools: [
      {
        name: 'University Administration & Operations',
        code: 'ADM',
        type: 'NON_TEACHING',
        description: 'Academic administration, student records, statutory university compliance and executive office operations.',
        departments: [
          {
            name: 'Registrar & Secretarial Office',
            programs: [],
            positions: ['Deputy Registrar', 'Assistant Registrar', 'Section Officer', 'Administrative Officer', 'Office Superintendent', 'Office Assistant / Clerk']
          },
          {
            name: 'University Administrative Services',
            programs: [],
            positions: ['HR Executive', 'Administrative Assistant', 'Office Executive']
          }
        ]
      },
      {
        name: 'Systems & IT Infrastructure',
        code: 'IT',
        type: 'NON_TEACHING',
        description: 'Campus network backbone, enterprise cloud systems, cybersecurity and IT helpdesk services.',
        departments: [
          {
            name: 'Campus IT & Network Systems',
            programs: [],
            positions: ['Systems Administrator', 'Network Engineer', 'IT Support Executive', 'Helpdesk Specialist']
          }
        ]
      },
      {
        name: 'Technical & Laboratory Services',
        code: 'LAB',
        type: 'NON_TEACHING',
        description: 'Laboratory management, equipment calibration and technical assistance across university labs.',
        departments: [
          {
            name: 'Central Laboratory Services',
            programs: [],
            positions: ['Technical Assistant', 'Lab Assistant / In-charge', 'Workshop Technician']
          }
        ]
      },
      {
        name: 'Finance & Accounts',
        code: 'FIN',
        type: 'NON_TEACHING',
        description: 'Handles budgeting, payroll, taxation, student billing and financial auditing.',
        departments: [
          {
            name: 'Finance & Accounts Department',
            programs: [],
            positions: ['Senior Accountant / Finance Officer', 'Accounts Officer', 'Audit Executive', 'Cashier']
          }
        ]
      },
      {
        name: 'Library & Information Services',
        code: 'LIB',
        type: 'NON_TEACHING',
        description: 'Central digital and physical library, subscriptions, archives, and research databases.',
        departments: [
          {
            name: 'University Central Library',
            programs: [],
            positions: ['Librarian', 'Assistant Librarian', 'Library Assistant']
          }
        ]
      },
      {
        name: 'Branding, Media & Promotion',
        code: 'BMP',
        type: 'NON_TEACHING',
        description: 'Institutional branding, media outreach, social media campaigns, and creative content production.',
        departments: [
          {
            name: 'Media Studio & Communications',
            programs: [],
            positions: ['Graphic Designer', 'Marketing Executive', 'Admission Counsellor', 'PR Manager']
          }
        ]
      },
      {
        name: 'Estate & Civil Engineering',
        code: 'ECE',
        type: 'NON_TEACHING',
        description: 'Facility management, campus civil maintenance, infrastructure development, and MEP operations.',
        departments: [
          {
            name: 'Civil Infrastructure & Planning',
            programs: [],
            positions: ['Senior Architect', 'Civil Engineer', 'Facility Manager', 'Maintenance Supervisor']
          }
        ]
      }
    ]
  }
];

// Helper to get flat list of approved teaching schools
function getTeachingSchools() {
  const result = [];
  APPROVED_UNIVERSITY_STRUCTURE.forEach(fac => {
    fac.schools.forEach(sch => {
      if (sch.type === 'TEACHING') {
        result.push({ ...sch, faculty: fac.faculty });
      }
    });
  });
  return result;
}

// Helper to get flat list of all schools
function getAllApprovedSchools() {
  const result = [];
  APPROVED_UNIVERSITY_STRUCTURE.forEach(fac => {
    fac.schools.forEach(sch => {
      result.push({ ...sch, faculty: fac.faculty });
    });
  });
  return result;
}

module.exports = {
  APPROVED_UNIVERSITY_STRUCTURE,
  getTeachingSchools,
  getAllApprovedSchools
};
