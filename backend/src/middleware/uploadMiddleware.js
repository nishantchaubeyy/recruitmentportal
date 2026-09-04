const multer = require('multer');

// Configure memory storage
const storage = multer.memoryStorage();

// File filter to restrict uploads to PDF only
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are accepted.'), false);
  }
};

// File filter to restrict uploads to image files (JPEG, JPG, PNG, WebP)
const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, PNG, and WebP image files are accepted.'), false);
  }
};

// Multer upload middleware configuration for poster images (Max size: 10MB)
const imageUpload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB in bytes
  }
});

module.exports = upload;
module.exports.upload = upload;
module.exports.imageUpload = imageUpload;

