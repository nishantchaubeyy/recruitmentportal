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
const PAGE = { left: 36, width: 523, top: 32, bottom: 796 };

class PageOverflow extends Error {}

/**
 * Draws the dossier at a given scale (1 = base sizes) and resolves with the PDF buffer.
 * When `allowExtraPages` is false the attempt is abandoned (PageOverflow) as soon as the content would
 * spill onto a second page, so the caller can retry slightly smaller.
 *
 * Layout notes: every cell is measured with heightOfString before it is drawn, so long labels/values wrap
 * inside their own column and rows grow to fit. Short facts are laid out three label/value pairs per row.
 */
function buildPdf(app, S, allowExtraPages) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE.left,
      bufferPages: true,
      info: {
        Title: `Application Form - ${app.applicationNumber || 'DYPIU'}`,
        Author: 'D Y Patil International University, Akurdi, Pune',
        Subject: 'Official Recruitment Application'
      }
    });

    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    try {
      const px = (n) => Math.round(n * S * 100) / 100; // scaled size
      const FONT = px(8);

      const personal = safeParseJSON(app.personalInfo);
      const contact = safeParseJSON(app.contactDetails);
      const qualifications = safeParseArray(app.qualifications);
      const experience = safeParseArray(app.workExperience || app.experience?.records || app.experience);
      const research = safeParseJSON(app.researchDetails || app.phdDetails);
      const documents = Array.isArray(app.documents) ? app.documents : [];

      const title = personal.title && personal.title !== 'Select' ? personal.title : '';
      const applicantName = [title, personal.firstName, personal.middleName, personal.lastName]
        .filter(Boolean).join(' ').trim() || app.applicant?.name || 'Applicant';
      const postName = app.job?.position || personal.postAppliedFor || 'Not specified';
      const faculty = app.job?.school?.name || app.job?.department || personal.faculty || '—';
      const appNumber = app.applicationNumber || '—';
      const submitDate = formatDate(app.submittedAt || app.createdAt);
      const email = app.applicant?.user?.email || contact.email || personal.email || '—';

      let y = PAGE.top;

      const ensure = (height) => {
        if (y + height > PAGE.bottom) {
          if (!allowExtraPages) throw new PageOverflow();
          doc.addPage();
          y = PAGE.top;
        }
      };

      const textHeight = (text, width, font = 'Helvetica', size = FONT) => {
        doc.font(font).fontSize(size);
        return doc.heightOfString(String(text ?? ''), { width });
      };

      // ---- Letterhead: logo, university name, then one bar with title / number / date -------------
      const logoWidth = px(112);
      const logoHeight = Math.round(logoWidth * (149 / 382));
      try {
        doc.image(LOGO_PATH, PAGE.left, y, { width: logoWidth });
      } catch (err) {
        // A missing logo must never block the application PDF.
        console.warn('[PDF] Logo could not be embedded:', err.message);
      }
      const textX = PAGE.left + logoWidth + 14;
      const textW = PAGE.width - logoWidth - 14;
      doc.moveTo(textX - 7, y + 3).lineTo(textX - 7, y + logoHeight - 3).lineWidth(0.8).strokeColor(COLORS.line).stroke();
      doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(px(13.5))
        .text('D Y PATIL INTERNATIONAL UNIVERSITY', textX, y + px(2), { width: textW, lineBreak: false });
      doc.fillColor(COLORS.ink).font('Helvetica').fontSize(px(7.8))
        .text('Sector 29, Nigdi Pradhikaran, Akurdi, Pune, Maharashtra - 411044', textX, y + px(20), { width: textW, lineBreak: false });
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(px(7.8))
        .text('Recruitment Cell  |  careers@dypiu.ac.in  |  www.dypiu.ac.in', textX, y + px(31), { width: textW, lineBreak: false });
      y += logoHeight + px(5);

      const barH = px(20);
      doc.rect(PAGE.left, y, PAGE.width, barH).fill(COLORS.maroon);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(px(9.5))
        .text('APPLICATION FORM', PAGE.left + 8, y + (barH - px(9.5)) / 2 - 0.5, { characterSpacing: 0.8, lineBreak: false });
      doc.font('Helvetica').fontSize(px(8))
        .text(`Application No: ${appNumber}   |   Submitted: ${submitDate}`, PAGE.left + 150, y + (barH - px(8)) / 2 - 0.5, { align: 'right', width: PAGE.width - 158, lineBreak: false });
      y += barH + px(6);

      // ---- Building blocks -------------------------------------------------------------------
      const SECTION_H = px(14.5);
      const section = (label) => {
        ensure(SECTION_H + px(24));
        doc.rect(PAGE.left, y, PAGE.width, SECTION_H).fill(COLORS.maroon);
        doc.fillColor('#ffffff').fontSize(px(8.2)).font('Helvetica-Bold')
          .text(label.toUpperCase(), PAGE.left + 6, y + (SECTION_H - px(8.2)) / 2 - 0.3, { lineBreak: false });
        y += SECTION_H;
      };

      const pad = px(2.8);
      const PER_ROW = 3;
      const PAIR_W = PAGE.width / PER_ROW;
      const LABEL_W = PAIR_W * 0.38;
      const VALUE_W = PAIR_W - LABEL_W;

      /** Up to three label/value pairs per row; the row is as tall as its tallest wrapped cell. */
      const rowPairs = (row) => {
        const cells = [];
        row.forEach((pair, i) => {
          // A short last row lets its final value use the space the missing pairs would have taken.
          const spare = i === row.length - 1 ? (PER_ROW - row.length) * PAIR_W : 0;
          cells.push({ text: pair[0], width: LABEL_W, label: true, filled: true });
          cells.push({ text: pair[1] || '—', width: VALUE_W + spare, label: false, filled: true });
        });
        const height = Math.max(...cells.map((c) => textHeight(c.text, c.width - pad * 2, c.label ? 'Helvetica-Bold' : 'Helvetica'))) + pad * 2;
        ensure(height);
        let x = PAGE.left;
        cells.forEach((c) => {
          if (c.label && c.filled) doc.rect(x, y, c.width, height).fillAndStroke(COLORS.soft, COLORS.line);
          else doc.rect(x, y, c.width, height).stroke(COLORS.line);
          if (c.text !== '') {
            doc.fillColor(c.label ? COLORS.muted : COLORS.ink).font(c.label ? 'Helvetica-Bold' : 'Helvetica').fontSize(FONT)
              .text(String(c.text), x + pad, y + pad, { width: c.width - pad * 2 });
          }
          x += c.width;
        });
        y += height;
      };

      const pairs = (list) => {
        for (let i = 0; i < list.length; i += PER_ROW) rowPairs(list.slice(i, i + PER_ROW));
      };

      /** Full-width label/value row (address, thesis title). */
      const rowFull = (label, value) => {
        const valueWidth = PAGE.width - LABEL_W;
        const height = Math.max(textHeight(label, LABEL_W - pad * 2, 'Helvetica-Bold'), textHeight(value || '—', valueWidth - pad * 2)) + pad * 2;
        ensure(height);
        doc.rect(PAGE.left, y, LABEL_W, height).fillAndStroke(COLORS.soft, COLORS.line);
        doc.rect(PAGE.left + LABEL_W, y, valueWidth, height).stroke(COLORS.line);
        doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(FONT).text(label, PAGE.left + pad, y + pad, { width: LABEL_W - pad * 2 });
        doc.fillColor(COLORS.ink).font('Helvetica').fontSize(FONT).text(String(value || '—'), PAGE.left + LABEL_W + pad, y + pad, { width: valueWidth - pad * 2 });
        y += height;
      };

      /** Table with per-column widths (relative; scaled to the page width); rows wrap and grow. */
      const table = (rawColumns, rows) => {
        const total = rawColumns.reduce((sum, c) => sum + c.width, 0);
        const columns = rawColumns.map((c) => ({ ...c, width: (c.width / total) * PAGE.width }));
        const cellPad = px(2.4);
        const drawRow = (cells, { head = false } = {}) => {
          const font = head ? 'Helvetica-Bold' : 'Helvetica';
          const height = Math.max(...cells.map((t, i) => textHeight(t, columns[i].width - cellPad * 2, font))) + cellPad * 2;
          ensure(height);
          if (head) doc.rect(PAGE.left, y, PAGE.width, height).fillAndStroke(COLORS.head, COLORS.line);
          else doc.rect(PAGE.left, y, PAGE.width, height).stroke(COLORS.line);
          let x = PAGE.left;
          cells.forEach((t, i) => {
            doc.fillColor(head ? COLORS.navy : COLORS.ink).font(font).fontSize(FONT)
              .text(String(t ?? ''), x + cellPad, y + cellPad, { width: columns[i].width - cellPad * 2, align: columns[i].align || 'left' });
            x += columns[i].width;
          });
          y += height;
        };
        drawRow(columns.map((c) => c.label), { head: true });
        rows.forEach((r) => drawRow(r));
      };

      const note = (text) => {
        const height = textHeight(text, PAGE.width - 12, 'Helvetica-Oblique') + pad * 2;
        ensure(height);
        doc.rect(PAGE.left, y, PAGE.width, height).stroke(COLORS.line);
        doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(FONT).text(text, PAGE.left + 6, y + pad, { width: PAGE.width - 12 });
        y += height;
      };

      const gap = (n = 6) => { y += px(n); };

      // ---- 1. Post ---------------------------------------------------------------------------
      section('1. Post Applied Details');
      pairs([
        ['Post Applied For', postName],
        ['Faculty / School', faculty],
        ['Employment Type', app.job?.employmentType],
        ['Vacancy Reference', app.job?.vacancyNumber],
        ['Subject / Domain', app.subjectAppliedFor || personal.subjectAppliedFor]
      ]);
      gap();

      // ---- 2. Personal -----------------------------------------------------------------------
      section('2. Personal Information');
      pairs([
        ['Full Name', applicantName],
        ['Gender', personal.gender],
        ['Date of Birth', personal.dob ? formatDate(personal.dob) : '—'],
        ['Age', personal.age],
        ['Marital Status', personal.maritalStatus]
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
            { label: 'Level', width: 62 },
            { label: 'Degree / Stream', width: 120 },
            { label: 'Board / University', width: 170 },
            { label: 'Year', width: 36, align: 'center' },
            { label: 'Mode', width: 58 },
            { label: 'Score / CGPA', width: 69, align: 'right' }
          ],
          qualifications.map((q) => [
            q.qualificationDegree || q.degreeLevel || '—',
            [q.degreeName, q.specialization].filter(Boolean).join(' — ') || '—',
            q.instituteName || q.university || '—',
            q.passingYear || q.year || '—',
            q.studyMode || '—',
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
      // Publications and eligibility tests are only collected for teaching posts.
      if (research.scopusCount !== undefined || research.net !== undefined) {
        const otherPublications = Array.isArray(research.publications)
          ? research.publications.map((p) => `${p.type}: ${p.count}`).join('; ')
          : '';
        pairs([
          ['Scopus Publications', String(research.scopusCount ?? '0')],
          ['Scopus Author ID', research.scopusId],
          ['Web of Science Papers', String(research.wosCount ?? '0')],
          ['WoS ResearcherID', research.wosId],
          ['Conference Papers', /^\d+$/.test(String(research.conferencePaper ?? '')) ? String(research.conferencePaper) : '0'],
          ['Other Publications', otherPublications],
          ['UGC-NET / JRF', examText(research.net)],
          ['SET', examText(research.setExam)],
          ['SLET', examText(research.slet)],
          ['GATE', examText(research.gate)]
        ]);
      }
      gap();

      // ---- 6. Experience -------------------------------------------------------------------------------
      section('6. Professional Experience');
      if (experience.length === 0) {
        note('Fresher submission — no prior professional experience recorded.');
      } else {
        table(
          [
            { label: 'Organization', width: 140 },
            { label: 'Designation', width: 120 },
            { label: 'Type', width: 60 },
            { label: 'From', width: 55 },
            { label: 'To', width: 55 },
            { label: 'Salary', width: 45, align: 'right' },
            { label: 'Notice', width: 40 }
          ],
          experience.map((e) => [
            e.organization || '—',
            e.designation || '—',
            e.type || e.experienceType || '—',
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
      gap(8);

      // ---- Declaration -----------------------------------------------------------------------------------------
      const declaration = 'I hereby declare that all the information provided in this application is true, complete, and correct to the best of my knowledge and belief. I understand that if any information is found false or misrepresented at any stage, my candidature/appointment is liable to be cancelled/terminated without notice.';
      const declFont = px(7.2);
      const declBody = textHeight(declaration, PAGE.width - 16, 'Helvetica', declFont);
      const declHeight = declBody + px(38);
      ensure(declHeight);
      doc.rect(PAGE.left, y, PAGE.width, declHeight).fillAndStroke(COLORS.soft, COLORS.line);
      doc.fillColor(COLORS.navy).fontSize(px(8)).font('Helvetica-Bold').text('DECLARATION & CERTIFICATION', PAGE.left + 8, y + px(6), { lineBreak: false });
      doc.fillColor(COLORS.ink).fontSize(declFont).font('Helvetica').text(declaration, PAGE.left + 8, y + px(18), { width: PAGE.width - 16 });
      const sigY = y + declHeight - px(14);
      doc.font('Helvetica-Bold').fontSize(px(7.8)).fillColor(COLORS.maroon).text(`Candidate: ${applicantName}`, PAGE.left + 8, sigY, { width: 270, lineBreak: false });
      doc.font('Helvetica').fontSize(px(7.4)).fillColor(COLORS.muted)
        .text(`Certified electronically on ${submitDate}`, PAGE.left + 278, sigY, { align: 'right', width: 237, lineBreak: false });

      // ---- Footer on every page -----------------------------------------------------------------------------------
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0; // footer sits inside the bottom margin; avoid an automatic page break
        doc.rect(PAGE.left, 808, PAGE.width, 0.5).fill(COLORS.line);
        doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
          .text('D Y Patil International University, Akurdi, Pune — Official Recruitment Portal', PAGE.left, 813, { width: 380, lineBreak: false });
        if (range.count > 1) {
          doc.text(`Page ${i + 1} of ${range.count}`, PAGE.left + 400, 813, { align: 'right', width: 123, lineBreak: false });
        }
      }

      doc.end();
    } catch (err) {
      doc.end();
      reject(err);
    }
  });
}

/**
 * Generates the application form as a single A4 page. The content is laid out at normal size first and
 * shrunk step by step until it fits; only an extreme application (dozens of rows) ever spills to a second page.
 */
async function generateApplicationPdf(app) {
  const scales = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7];
  for (let i = 0; i < scales.length; i += 1) {
    const last = i === scales.length - 1;
    try {
      return await buildPdf(app, scales[i], last);
    } catch (err) {
      if (!(err instanceof PageOverflow)) throw err;
    }
  }
  throw new Error('Application PDF could not be generated.');
}

module.exports = { generateApplicationPdf };
