const PDFDocument = require('pdfkit');

function safeParseJSON(input) {
  if (!input) return {};
  if (typeof input === 'object') return input;
  try {
    return JSON.parse(input);
  } catch (e) {
    return {};
  }
}

function safeParseArray(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function formatDate(dateInput) {
  if (!dateInput) return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Generates an official DYPIU PDF application dossier as a Buffer.
 * @param {Object} app Application record from database with job relation
 * @returns {Promise<Buffer>}
 */
function generateApplicationPdf(app) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Application Dossier - ${app.applicationNumber || 'DYPIU'}`,
          Author: 'D Y Patil International University, Akurdi, Pune',
          Subject: 'Official Recruitment Application'
        }
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const personal = safeParseJSON(app.personalInfo);
      const contact = safeParseJSON(app.contactDetails);
      const qualifications = safeParseArray(app.qualifications);
      const experience = safeParseArray(app.experience?.records || app.workExperience || app.experience);
      const research = safeParseJSON(app.researchDetails || app.phdDetails);

      const applicantName = [personal.title, personal.firstName, personal.middleName, personal.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || app.applicant?.name || 'Applicant';

      const postName = app.job?.position || personal.postAppliedFor || 'Faculty Position';
      const faculty = app.job?.school?.name || app.job?.department || personal.faculty || 'D Y Patil International University';
      const appNumber = app.applicationNumber || app.id || 'DYPIU-APP';
      const submitDate = formatDate(app.submittedAt || app.createdAt);

      // Colors
      const maroon = '#721b28';
      const navy = '#0f2b5c';
      const darkText = '#1e293b';
      const mutedText = '#64748b';
      const lightBg = '#f8fafc';
      const borderCol = '#cbd5e1';

      // Header Banner
      doc.rect(40, 40, 515, 60).fill(navy);
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
        .text('D Y PATIL INTERNATIONAL UNIVERSITY', 50, 48, { align: 'center', width: 495 });
      doc.fontSize(9).font('Helvetica')
        .text('Akurdi, Pune, Maharashtra - 411044 | Recognized by UGC & Govt. of Maharashtra', 50, 68, { align: 'center', width: 495 });
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#fde047')
        .text('OFFICIAL APPLICATION DOSSIER', 50, 82, { align: 'center', width: 495 });

      let y = 112;

      // Meta Box (Application Number & Submission Date)
      doc.rect(40, y, 515, 28).fillAndStroke('#f1f5f9', borderCol);
      doc.fillColor(navy).fontSize(9).font('Helvetica-Bold')
        .text(`Application No: ${appNumber}`, 50, y + 9);
      doc.font('Helvetica').fillColor(darkText)
        .text(`Date of Submission: ${submitDate}`, 350, y + 9, { align: 'right', width: 195 });

      y += 36;

      // Helper function for section headings
      function drawSectionHeader(title) {
        if (y > 700) {
          doc.addPage();
          y = 40;
        }
        doc.rect(40, y, 515, 20).fill(maroon);
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
          .text(title.toUpperCase(), 48, y + 5);
        y += 24;
      }

      // Helper function for 2-column key-value rows
      function drawRow2Col(label1, val1, label2, val2) {
        if (y > 720) {
          doc.addPage();
          y = 40;
        }
        doc.rect(40, y, 515, 18).stroke(borderCol);
        // Col 1
        doc.fillColor(mutedText).fontSize(8).font('Helvetica-Bold').text(label1, 46, y + 5);
        doc.fillColor(darkText).fontSize(8).font('Helvetica').text(String(val1 || '—'), 130, y + 5, { width: 160, ellipsis: true });
        // Col 2
        doc.fillColor(mutedText).fontSize(8).font('Helvetica-Bold').text(label2, 305, y + 5);
        doc.fillColor(darkText).fontSize(8).font('Helvetica').text(String(val2 || '—'), 390, y + 5, { width: 160, ellipsis: true });
        y += 18;
      }

      // SECTION 1: Post Applied
      drawSectionHeader('1. Post Applied Details');
      drawRow2Col('Post Applied For:', postName, 'Faculty / School:', faculty);
      drawRow2Col('Job Nature:', app.job?.jobType || 'Full-Time', 'Subject / Specialization:', personal.subjectAppliedFor || '—');

      y += 8;

      // SECTION 2: Personal Information
      drawSectionHeader('2. Personal Information');
      drawRow2Col('Full Name:', applicantName, 'Gender:', personal.gender || '—');
      drawRow2Col('Date of Birth:', personal.dob || '—', 'Age:', personal.age ? `${personal.age} years` : '—');
      drawRow2Col('Marital Status:', personal.maritalStatus || '—', 'Nationality:', personal.nationality || 'Indian');

      y += 8;

      // SECTION 3: Contact Details
      drawSectionHeader('3. Contact & Communication Details');
      drawRow2Col('Primary Email:', contact.email || personal.email || app.applicant?.user?.email || '—', 'Alternate Email:', personal.alternateEmail || '—');
      drawRow2Col('Mobile Number:', contact.mobile || personal.mobile || app.applicant?.mobile || '—', 'Alternate Mobile:', contact.alternateMobile || '—');
      
      const fullAddr = [contact.address, contact.city, contact.state, contact.country, contact.pinCode].filter(Boolean).join(', ');
      if (y > 720) { doc.addPage(); y = 40; }
      doc.rect(40, y, 515, 20).stroke(borderCol);
      doc.fillColor(mutedText).fontSize(8).font('Helvetica-Bold').text('Address:', 46, y + 6);
      doc.fillColor(darkText).fontSize(8).font('Helvetica').text(fullAddr || '—', 130, y + 6, { width: 415, ellipsis: true });
      y += 26;

      // SECTION 4: Qualifications Table
      drawSectionHeader('4. Educational & Academic Qualifications');
      
      // Table Header
      doc.rect(40, y, 515, 18).fillAndStroke('#e2e8f0', borderCol);
      doc.fillColor(navy).fontSize(8).font('Helvetica-Bold');
      doc.text('Degree / Level', 45, y + 5, { width: 75 });
      doc.text('Title / Name', 125, y + 5, { width: 100 });
      doc.text('Institute / University', 230, y + 5, { width: 140 });
      doc.text('Year', 375, y + 5, { width: 40, align: 'center' });
      doc.text('Mode', 420, y + 5, { width: 60 });
      doc.text('Score/CGPA', 485, y + 5, { width: 65, align: 'right' });
      y += 18;

      if (qualifications.length === 0) {
        doc.rect(40, y, 515, 18).stroke(borderCol);
        doc.fillColor(mutedText).fontSize(8).font('Helvetica-Oblique').text('No educational qualifications provided.', 45, y + 5);
        y += 18;
      } else {
        qualifications.forEach(q => {
          if (y > 720) { doc.addPage(); y = 40; }
          doc.rect(40, y, 515, 18).stroke(borderCol);
          doc.fillColor(darkText).fontSize(8).font('Helvetica');
          doc.text(q.qualificationDegree || q.degreeLevel || '—', 45, y + 5, { width: 75, ellipsis: true });
          doc.text(q.degreeName || '—', 125, y + 5, { width: 100, ellipsis: true });
          doc.text(q.instituteName || q.university || '—', 230, y + 5, { width: 140, ellipsis: true });
          doc.text(String(q.passingYear || q.year || '—'), 375, y + 5, { width: 40, align: 'center' });
          doc.text(q.studyMode || 'Full-Time', 420, y + 5, { width: 60, ellipsis: true });
          doc.text(String(q.cgpa || q.percentage || '—'), 485, y + 5, { width: 65, align: 'right' });
          y += 18;
        });
      }

      y += 8;

      // SECTION 5: Research & PhD Details
      drawSectionHeader('5. Research, Publications & National Tests');
      drawRow2Col('Ph.D. Status:', research.phdStatus || '—', 'Ph.D. University / Institute:', research.phdUniversity || '—');
      drawRow2Col('Ph.D. Award Year:', research.phdYear || '—', 'UGC-NET / JRF Qualified:', research.net ? 'Yes' : 'No');
      drawRow2Col('GATE Score / Status:', research.gate ? 'Qualified' : '—', 'SET / SLET Qualified:', (research.setExam || research.slet) ? 'Yes' : 'No');
      drawRow2Col('Scopus Indexed Papers:', String(research.scopusCount ?? '—'), 'Web of Science (WoS) Papers:', String(research.wosCount ?? '—'));

      y += 8;

      // SECTION 6: Professional Experience
      drawSectionHeader('6. Professional Experience');
      if (experience.length === 0) {
        doc.rect(40, y, 515, 18).stroke(borderCol);
        doc.fillColor(mutedText).fontSize(8).font('Helvetica-Oblique').text('Fresher Submission — No prior professional experience recorded.', 45, y + 5);
        y += 18;
      } else {
        // Table Header
        doc.rect(40, y, 515, 18).fillAndStroke('#e2e8f0', borderCol);
        doc.fillColor(navy).fontSize(8).font('Helvetica-Bold');
        doc.text('Organization', 45, y + 5, { width: 140 });
        doc.text('Designation', 190, y + 5, { width: 130 });
        doc.text('Type', 325, y + 5, { width: 65 });
        doc.text('From', 395, y + 5, { width: 50 });
        doc.text('To', 450, y + 5, { width: 50 });
        doc.text('Salary', 505, y + 5, { width: 45, align: 'right' });
        y += 18;

        experience.forEach(e => {
          if (y > 720) { doc.addPage(); y = 40; }
          doc.rect(40, y, 515, 18).stroke(borderCol);
          doc.fillColor(darkText).fontSize(8).font('Helvetica');
          doc.text(e.organization || '—', 45, y + 5, { width: 140, ellipsis: true });
          doc.text(e.designation || '—', 190, y + 5, { width: 130, ellipsis: true });
          doc.text(e.type || e.experienceType || 'Full-Time', 325, y + 5, { width: 65, ellipsis: true });
          doc.text(e.fromDate || '—', 395, y + 5, { width: 50 });
          doc.text(e.isCurrent ? 'Present' : (e.toDate || '—'), 450, y + 5, { width: 50 });
          doc.text(String(e.salary || '—'), 505, y + 5, { width: 45, align: 'right' });
          y += 18;
        });
      }

      y += 14;

      // SECTION 7: Candidate Declaration & Stamp
      if (y > 670) { doc.addPage(); y = 40; }
      doc.rect(40, y, 515, 80).fillAndStroke(lightBg, borderCol);
      doc.fillColor(navy).fontSize(9).font('Helvetica-Bold').text('DECLARATION & CERTIFICATION', 48, y + 8);
      doc.fillColor(darkText).fontSize(7.5).font('Helvetica')
        .text('I hereby declare that all the information provided in this application is true, complete, and correct to the best of my knowledge and belief. I understand that if any information is found false or misrepresented at any stage, my candidature/appointment is liable to be cancelled/terminated without notice.',
        48, y + 22, { width: 495, lineGap: 2 });
      
      doc.font('Helvetica-Bold').fontSize(8).fillColor(maroon)
        .text(`Candidate: ${applicantName}`, 48, y + 62);
      doc.font('Helvetica').fontSize(8).fillColor(mutedText)
        .text(`Certified Electronically on: ${submitDate}`, 320, y + 62, { align: 'right', width: 220 });

      // Footer
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.rect(40, 800, 515, 1).fill('#cbd5e1');
        doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
          .text('D Y Patil International University, Akurdi, Pune — Official Recruitment Portal', 40, 806);
        doc.text(`Page ${i + 1} of ${range.count}`, 450, 806, { align: 'right', width: 105 });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateApplicationPdf
};
