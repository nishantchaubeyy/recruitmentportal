const fs = require('fs');
const path = require('path');

const UPLOAD_ROOT = process.env.UPLOAD_DIR || 'uploads';

/**
 * Saves a file to local storage in the structured path:
 * uploads/jobs/:jobId/applications/:applicationId/filename
 * 
 * @param {Object} file - The file object from Multer (buffer or temp file path)
 * @param {string} jobId - The associated Job ID
 * @param {string} applicationId - The associated Application ID
 * @returns {Promise<Object>} Object containing file path/key and metadata
 */
async function saveFile(file, jobId, applicationId) {
  // Define destination directory: uploads/jobs/:jobId/applications/:applicationId
  const relativeDir = path.join('jobs', jobId, 'applications', applicationId);
  const destDir = path.join(UPLOAD_ROOT, relativeDir);

  // Ensure the directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Generate a unique filename prefix to avoid collisions if identical names are uploaded
  const timestamp = Date.now();
  const safeName = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const destPath = path.join(destDir, safeName);
  const fileKey = path.join(relativeDir, safeName).replace(/\\/g, '/'); // Normalize slashes for db storage

  // Move the file from temp storage to final destination
  if (file.path) {
    // If multer is using diskStorage (temp file)
    fs.renameSync(file.path, destPath);
  } else if (file.buffer) {
    // If multer is using memoryStorage
    fs.writeFileSync(destPath, file.buffer);
  } else {
    throw new Error('Invalid file format. Cannot save.');
  }

  return {
    fileKey,
    absolutePath: path.resolve(destPath),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}

/**
 * Resolves the absolute path for a given file key.
 * 
 * @param {string} fileKey - The file key stored in the database
 * @returns {string} Absolute path on the local system
 */
function getFileLocation(fileKey) {
  return path.resolve(UPLOAD_ROOT, fileKey);
}

/**
 * Deletes a file from local storage.
 * 
 * @param {string} fileKey - The file key to delete
 */
async function deleteFile(fileKey) {
  const filePath = path.resolve(UPLOAD_ROOT, fileKey);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  saveFile,
  getFileLocation,
  deleteFile
};
