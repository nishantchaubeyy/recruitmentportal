const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { uploadRoot } = require('../config');

const UPLOAD_ROOT = path.resolve(uploadRoot);
const POSTER_PREFIX = 'posters/';

/**
 * Resolve a stored file key to an absolute path, refusing anything that would
 * escape the upload root (path traversal via a tampered database value).
 */
function getFileLocation(fileKey) {
  if (typeof fileKey !== 'string' || !fileKey) throw new Error('Invalid file key.');
  const resolved = path.resolve(UPLOAD_ROOT, fileKey);
  const relative = path.relative(UPLOAD_ROOT, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid file key.');
  }
  return resolved;
}

/**
 * Persist a verified upload under `<root>/<dirParts...>/<random>.<ext>`.
 * File names are random and the extension comes from the sniffed file type -
 * the client-supplied name is only retained as metadata.
 */
async function persist(file, dirParts) {
  if (!file?.buffer) throw new Error('Invalid file payload.');

  const ext = file.detectedExt || '.bin';
  const fileName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  const relativeDir = path.posix.join(...dirParts);
  const destDir = getFileLocation(relativeDir);

  await fs.promises.mkdir(destDir, { recursive: true });
  await fs.promises.writeFile(path.join(destDir, fileName), file.buffer, { mode: 0o640 });

  const fileKey = path.posix.join(relativeDir, fileName);
  return {
    fileKey,
    webUrl: `/uploads/${fileKey}`,
    originalName: String(file.originalname || fileName).slice(0, 200),
    mimeType: file.mimetype,
    size: file.size
  };
}

const saveFile = (file, jobId, applicationId) =>
  persist(file, ['jobs', jobId, 'applications', applicationId]);

const savePosterFile = (file, schoolId) => persist(file, ['posters', schoolId]);

const saveCandidateDocumentFile = (file, candidateId) => persist(file, ['candidates', candidateId]);

async function deleteFile(fileKey) {
  try {
    await fs.promises.unlink(getFileLocation(fileKey));
  } catch (err) {
    if (err.code !== 'ENOENT' && err.message !== 'Invalid file key.') throw err;
  }
}

/** Only poster images may be served publicly. */
function posterKeyFromUrl(url) {
  if (typeof url !== 'string' || !url.startsWith(`/uploads/${POSTER_PREFIX}`)) return null;
  const key = url.slice('/uploads/'.length);
  try {
    getFileLocation(key);
    return key;
  } catch {
    return null;
  }
}

function fileExists(fileKey) {
  try {
    return fs.existsSync(getFileLocation(fileKey));
  } catch {
    return false;
  }
}

module.exports = {
  UPLOAD_ROOT,
  POSTER_ROOT: path.join(UPLOAD_ROOT, 'posters'),
  saveFile,
  savePosterFile,
  saveCandidateDocumentFile,
  getFileLocation,
  deleteFile,
  posterKeyFromUrl,
  fileExists
};
