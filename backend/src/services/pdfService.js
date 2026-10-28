const PDFDocument = require('pdfkit');
const path = require('path');
const { examText, phdRows } = require('../utils/research');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'dypiu-logo.png');

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

const COLORS = {
  maroon: '#721b28',
  navy: '#0f2b5c',
  ink: '#1e293b',
  muted: '#64748b',
  soft: '#f8fafc',
  line: '#cbd5e1',
  head: '#e2e8f0'
};

// A4 geometry (points)
const PAGE = { left: 40, width: 515, top: 40, bottom: 790 };

/**
 * Generates the official application dossier as a PDF Buffer.
 *
 * Layout notes: every cell is measured with heightOfString before it is drawn, so long
 * labels/values wrap inside their own column instead of overlapping their neighbour, and rows
 * grow to fit. Pages are buffered so "Page X of Y" can be stamped at the end.
 */
function generateApplicationPdf(app) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: PAGE.left,
        bufferPages: true,
        info: {
          Title: `Application Dossier - ${app.applicationNumber || 'DYPIU'}`,
          Author: 'D Y Patil International University, Akurdi, Pune',
          Subject: 'Official Recruitment Application'
        }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const personal = safeParseJSON(app.personalInfo);
      const contact = safeParseJSON(app.contactDetails);
      const qualifications = safeParseArray(app.qualifications);
      const experience = safeParseArray(app.workExperience || app.experience?.records || app.experience);
      const research = safeParseJSON(app.researchDetails || app.phdDetails);
      const documents = Array.isArray(app.documents) ? app.documents : [];

      const title = personal.title && personal.title !== 'Select' ? personal.title : '';
      const applicantName = [title, personal.firstName, personal.middleName, personal.lastName]
        .filter(Boolean).join(' ').trim() || app.applicant?.name || 'Applicant';
      const postName = app.job?.position || personal.postAppliedFor || 'Faculty Position';
      const faculty = app.job?.school?.name || app.job?.department || personal.faculty || 'D Y Patil International University';
      const appNumber = app.applicationNumber || app.id || 'DYPIU-APP';
      const submitDate = formatDate(app.submittedAt || app.createdAt);
      const email = app.applicant?.user?.email || contact.email || personal.email || '—';

      let y = PAGE.top;

      const ensure = (height) => {
        if (y + height > PAGE.bottom) {
          doc.addPage();
          y = PAGE.top;
        }
      };

      const textHeight = (text, width, font = 'Helvetica', size = 8.5) => {
        doc.font(font).fontSize(size);
        return doc.heightOfString(String(text ?? ''), { width });
      };

      // ---- Letterhead: official logo, university name and address ------------------------------------------
      const logoWidth = 140;
      const logoHeight = Math.round(logoWidth * (149 / 382));
      try {
        doc.image(LOGO_PATH, PAGE.left, y, { width: logoWidth });
      } catch (err) {
        // A missing logo must never block the application PDF.
        console.warn('[PDF] Logo could not be embedded:', err.message);
      }
      const textX = PAGE.left + logoWidth + 18;
      const textW = PAGE.width - logoWidth - 18;
      doc.moveTo(textX - 9, y + 4).lineTo(textX - 9, y + logoHeight - 4).lineWidth(0.8).strokeColor(COLORS.line).stroke();
      doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(15)
        .text('D Y PATIL INTERNATIONAL UNIVERSITY', textX, y + 3, { width: textW, lineBreak: false });
      doc.fillColor(COLORS.ink).font('Helvetica').fontSize(8.5)
        .text('Sector 29, Nigdi Pradhikaran, Akurdi, Pune, Maharashtra - 411044', textX, y + 24, { width: textW, lineBreak: false });
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8.5)
        .text('Recruitment Cell  |  careers@dypiu.ac.in  |  www.dypiu.ac.in', textX, y + 37, { width: textW, lineBreak: false });
      doc.fillColor(COLORS.maroon).font('Helvetica-BoldOblique').fontSize(8.5)
        .text('Think  |  Thrive  |  Transform', textX, y + 50, { width: textW, lineBreak: false });
      y += logoHeight + 6;

      doc.rect(PAGE.left, y, PAGE.width, 24).fill(COLORS.maroon);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
        .text('OFFICIAL APPLICATION DOSSIER', PAGE.left, y + 6.5, { align: 'center', width: PAGE.width, characterSpacing: 1, lineBreak: false });
      y += 32;

      // ---- Meta strip ------------------------------------------------------------------------
      doc.rect(PAGE.left, y, PAGE.width, 26).fillAndStroke('#f1f5f9', COLORS.line);
      doc.fillColor(COLORS.navy).fontSize(9).font('Helvetica-Bold')
        .text(`Application No: ${appNumber}`, PAGE.left + 10, y + 8, { width: 250 });
      doc.font('Helvetica').fillColor(COLORS.ink)
        .text(`Date of Submission: ${submitDate}`, PAGE.left + 270, y + 8, { align: 'right', width: 235 });
      y += 38;

      // ---- Building blocks -------------------------------------------------------------------
      const section = (label) => {
        ensure(40);
        doc.rect(PAGE.left, y, PAGE.width, 20).fill(COLORS.maroon);
        doc.fillColor('#ffffff').fontSize(9.5).font('Helvetica-Bold').text(label.toUpperCase(), PAGE.left + 8, y + 5.5);
        y += 20;
      };

      /**
       * Two label/value pairs per row. Columns: label 108 | value 149 | label 108 | value 150.
       * The row is as tall as its tallest wrapped cell.
       */
      const COL = { l1: 108, v1: 149, l2: 108, v2: 150 };
      const rowPairs = (a, b) => {
        const pad = 5;
        const cells = [
          { text: a[0], width: COL.l1, bold: true },
          { text: a[1] || '—', width: COL.v1 },
          { text: b ? b[0] : '', width: COL.l2, bold: true },
          { text: b ? (b[1] || '—') : '', width: COL.v2 }
        ];
        const height = Math.max(...cells.map((c) => textHeight(c.text, c.width - pad * 2, c.bold ? 'Helvetica-Bold' : 'Helvetica'))) + pad * 2;
        ensure(height);
        doc.rect(PAGE.left, y, PAGE.width, height).stroke(COLORS.line);
        let x = PAGE.left;
        cells.forEach((c, i) => {
          if (i % 2 === 0 && c.text !== '') doc.rect(x, y, c.width, height).fillAndStroke(COLORS.soft, COLORS.line);
          doc.fillColor(i % 2 === 0 ? COLORS.muted : COLORS.ink).font(c.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
            .text(String(c.text), x + pad, y + pad, { width: c.width - pad * 2 });
          x += c.width;
        });
        y += height;
      };

      const pairs = (list) => {
        for (let i = 0; i < list.length; i += 2) rowPairs(list[i], list[i + 1]);
      };

      /** Full-width label/value row (addresses, thesis titles). */
      const rowFull = (label, value) => {
        const pad = 5;
        const valueWidth = PAGE.width - COL.l1 - pad * 2;
        const height = Math.max(textHeight(label, COL.l1 - pad * 2, 'Helvetica-Bold'), textHeight(value || '—', valueWidth)) + pad * 2;
        ensure(height);
        doc.rect(PAGE.left, y, COL.l1, height).fillAndStroke(COLORS.soft, COLORS.line);
        doc.rect(PAGE.left + COL.l1, y, PAGE.width - COL.l1, height).stroke(COLORS.line);
        doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8.5).text(label, PAGE.left + pad, y + pad, { width: COL.l1 - pad * 2 });
        doc.fillColor(COLORS.ink).font('Helvetica').fontSize(8.5).text(String(value || '—'), PAGE.left + COL.l1 + pad, y + pad, { width: valueWidth });
        y += height;
      };

      /** Table with per-column widths; rows wrap and grow. */
      const table = (columns, rows) => {
        const pad = 4;
        const rowHeight = (cells, font) => Math.max(...cells.map((t, i) => textHeight(t, columns[i].width - pad * 2, font))) + pad * 2;
        const drawRow = (cells, { head = false } = {}) => {
          const font = head ? 'Helvetica-Bold' : 'Helvetica';
          const height = rowHeight(cells, font);
          ensure(height);
          if (head) doc.rect(PAGE.left, y, PAGE.width, height).fillAndStroke(COLORS.head, COLORS.line);
          else doc.rect(PAGE.left, y, PAGE.width, height).stroke(COLORS.line);
          let x = PAGE.left;
          cells.forEach((t, i) => {
            doc.fillColor(head ? COLORS.navy : COLORS.ink).font(font).fontSize(8.5)
              .text(String(t ?? ''), x + pad, y + pad, { width: columns[i].width - pad * 2, align: columns[i].align || 'left' });
            x += columns[i].width;
          });
          y += height;
        };
        drawRow(columns.map((c) => c.label), { head: true });
        rows.forEach((r) => drawRow(r));
      };

      const note = (text) => {
        const height = textHeight(text, PAGE.width - 12, 'Helvetica-Oblique') + 10;
        ensure(height);
        doc.rect(PAGE.left, y, PAGE.width, height).stroke(COLORS.line);
        doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(8.5).text(text, PAGE.left + 6, y + 5, { width: PAGE.width - 12 });
        y += height;
      };

      const gap = (n = 10) => { y += n; };

      // ---- 1. Post ---------------------------------------------------------------------------
      section('1. Post Applied Details');
      pairs([
        ['Post Applied For', postName],
        ['Faculty / School', faculty],
        ['Vacancy Reference', app.job?.vacancyNumber],
        ['Employment Type', app.job?.employmentType || 'Full Time']
      ]);
      if (personal.subjectAppliedFor) rowFull('Subject / Specialisation', personal.subjectAppliedFor);
      gap();

      // ---- 2. Personal -----------------------------------------------------------------------
      section('2. Personal Information');
      pairs([
        ['Full Name', applicantName],
        ['Gender', personal.gender],
        ['Date of Birth', personal.dob ? formatDate(personal.dob) : '—'],
        ['Age', personal.age],
        ['Marital Status', personal.maritalStatus],
        ['Nationality', personal.nationality || 'Indian']
      ]);
      gap();

      // ---- 3. Contact ------------------------------------------------------------------------
      section('3. Contact & Communication Details');
      pairs([
        ['Primary Email', email],
        ['Alternate Email', personal.alternateEmail],
        ['Mobile Number', contact.mobile || personal.mobile || app.applicant?.mobile],
        ['Alternate Mobile', contact.alternateMobile]
      ]);
      rowFull('Address', [contact.address, contact.city, contact.state, contact.country, contact.pinCode].filter(Boolean).join(', '));
      gap();

      // ---- 4. Qualifications ---------------------------------------------------------------------
      section('4. Educational & Academic Qualifications');
      if (qualifications.length === 0) {
        note('No educational qualifications provided.');
      } else {
        table(
          [
            { label: 'Degree / Level', width: 70 },
            { label: 'Title / Name', width: 100 },
            { label: 'Institute / University', width: 150 },
            { label: 'Year', width: 40, align: 'center' },
            { label: 'Mode', width: 70 },
            { label: 'Score / CGPA', width: 85, align: 'right' }
          ],
          qualifications.map((q) => [
            q.qualificationDegree || q.degreeLevel || '—',
            q.degreeName || '—',
            q.instituteName || q.university || '—',
            q.passingYear || q.year || '—',
            q.studyMode || 'Full-Time',
            q.cgpa || q.percentage || '—'
          ])
        );
      }
      gap();

      // ---- 5. Research ---------------------------------------------------------------------------
      section('5. Ph.D., Research & National Tests');
      const phd = phdRows(research);
      if (phd.length <= 1) {
        rowFull('Ph.D. Status', phd[0]?.[1] || 'Not provided');
      } else {
        const wide = phd.filter(([label]) => /Title|Supervisor|Location/.test(label));
        const rest = phd.filter((row) => !wide.includes(row));
        pairs(rest);
        wide.forEach(([label, value]) => rowFull(label, value));
      }
      pairs([
        ['Scopus Publications', String(research.scopusCount ?? '0')],
        ['Scopus Author ID', research.scopusId],
        ['Web of Science Papers', String(research.wosCount ?? '0')],
        ['WoS ResearcherID', research.wosId],
        ['Conference Papers', /^\d+$/.test(String(research.conferencePaper ?? '')) ? String(research.conferencePaper) : '0'],
        ['UGC-NET / JRF', examText(research.net)],
        ['SET', examText(research.setExam)],
        ['SLET', examText(research.slet)],
        ['GATE', examText(research.gate)]
      ]);
      gap();

      // ---- 6. Experience -------------------------------------------------------------------------------
      section('6. Professional Experience');
      if (experience.length === 0) {
        note('Fresher submission — no prior professional experience recorded.');
      } else {
        table(
          [
            { label: 'Organization', width: 130 },
            { label: 'Designation', width: 110 },
            { label: 'Type', width: 65 },
            { label: 'From', width: 55 },
            { label: 'To', width: 55 },
            { label: 'Salary', width: 50, align: 'right' },
            { label: 'Notice', width: 50 }
          ],
          experience.map((e) => [
            e.organization || '—',
            e.designation || '—',
            e.type || e.experienceType || 'Full-Time',
            e.fromDate || '—',
            e.isCurrent ? 'Present' : (e.toDate || '—'),
            e.salary || '—',
            e.noticePeriod || '—'
          ])
        );
      }
      gap();

      // ---- 7. Documents ----------------------------------------------------------------------------------
      section('7. Documents Submitted');
      if (documents.length === 0) {
        note('No documents were attached to this application.');
      } else {
        table(
          [
            { label: 'Document', width: 120 },
            { label: 'File name', width: 305 },
            { label: 'Size', width: 90, align: 'right' }
          ],
          documents.map((d) => [
            d.documentType === 'resume' ? 'Resume / CV' : (d.documentType || 'Document'),
            d.originalName || '—',
            d.fileSize ? `${Math.max(1, Math.round(d.fileSize / 1024))} KB` : '—'
          ])
        );
      }
      gap(14);

      // ---- Declaration -----------------------------------------------------------------------------------------
      const declaration = 'I hereby declare that all the information provided in this application is true, complete, and correct to the best of my knowledge and belief. I understand that if any information is found false or misrepresented at any stage, my candidature/appointment is liable to be cancelled/terminated without notice.';
      const declHeight = textHeight(declaration, PAGE.width - 20, 'Helvetica', 8) + 58;
      ensure(declHeight);
      doc.rect(PAGE.left, y, PAGE.width, declHeight).fillAndStroke(COLORS.soft, COLORS.line);
      doc.fillColor(COLORS.navy).fontSize(9).font('Helvetica-Bold').text('DECLARATION & CERTIFICATION', PAGE.left + 10, y + 8);
      doc.fillColor(COLORS.ink).fontSize(8).font('Helvetica').text(declaration, PAGE.left + 10, y + 22, { width: PAGE.width - 20, lineGap: 1.5 });
      const sigY = y + declHeight - 22;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.maroon).text(`Candidate: ${applicantName}`, PAGE.left + 10, sigY, { width: 260 });
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
        .text(`Certified electronically on ${submitDate}`, PAGE.left + 270, sigY, { align: 'right', width: 235 });

      // ---- Footer on every page -----------------------------------------------------------------------------------
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0; // footer sits inside the bottom margin; avoid an automatic page break
        doc.rect(PAGE.left, 805, PAGE.width, 0.5).fill(COLORS.line);
        doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
          .text('D Y Patil International University, Akurdi, Pune — Official Recruitment Portal', PAGE.left, 811, { width: 380, lineBreak: false });
        doc.text(`Page ${i + 1} of ${range.count}`, PAGE.left + 400, 811, { align: 'right', width: 115, lineBreak: false });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateApplicationPdf };
