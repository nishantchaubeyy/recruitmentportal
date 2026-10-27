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
  return null;
}

module.exports = { detectFileType };
