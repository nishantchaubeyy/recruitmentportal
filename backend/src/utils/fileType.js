/**
 * Detect a file's real type from its leading bytes. The multipart `Content-Type`
 * and file name are attacker-controlled and are never trusted.
 */

function detectFileType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (buffer.slice(0, 5).toString('latin1') === '%PDF-') {
    return { mime: 'application/pdf', ext: '.pdf' };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: '.jpg' };
  }
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: '.png' };
  }
  if (buffer.slice(0, 4).toString('latin1') === 'RIFF' && buffer.slice(8, 12).toString('latin1') === 'WEBP') {
    return { mime: 'image/webp', ext: '.webp' };
  }
  // Word: legacy .doc (OLE2 container) and .docx (zip containing word/ parts).
  if (buffer.slice(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
    return { mime: 'application/msword', ext: '.doc' };
  }
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04
      && buffer.slice(0, 8192).toString('latin1').includes('word/')) {
    return { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: '.docx' };
  }
  return null;
}

module.exports = { detectFileType };
