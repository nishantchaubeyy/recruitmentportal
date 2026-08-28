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

// Multer upload middleware configuration (Max size: 5MB)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB in bytes
  }
});

module.exports = upload;
