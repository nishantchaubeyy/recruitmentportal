const multer = require('multer');
const { detectFileType } = require('../utils/fileType');

const MB = 1024 * 1024;

const ALLOWED = {
  pdf: ['application/pdf'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
  document: ['application/pdf', 'image/jpeg', 'image/png']
};

const MESSAGES = {
  pdf: 'Only PDF files are accepted.',
  image: 'Only JPEG, PNG, and WebP image files are accepted.',
  document: 'Only PDF, JPG, and PNG files are accepted.'
};

function buildUploader(kind, maxMb) {
  const multerInstance = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * MB, files: 1, fields: 20, parts: 30 },
    fileFilter: (req, file, cb) => {
      const declared = (file.mimetype || '').toLowerCase().replace('image/jpg', 'image/jpeg');
      if (ALLOWED[kind].includes(declared)) return cb(null, true);
      return cb(new Error(MESSAGES[kind]));
    }
  });

  const getMiddleware = (field) => [
    multerInstance.single(field),
    (req, res, next) => {
      if (!req.file) return next();
      const detected = detectFileType(req.file.buffer);
      if (!detected || !ALLOWED[kind].includes(detected.mime)) {
        return res.status(400).json({ error: `${MESSAGES[kind]} The uploaded file content does not match an allowed type.` });
      }
      req.file.mimetype = detected.mime;
      req.file.detectedExt = detected.ext;
      return next();
    }
  ];

  // Support both uploader('field') and uploader.single('field')
  const fn = (field) => getMiddleware(field);
  fn.single = (field) => getMiddleware(field);
  return fn;
}

const pdfUpload = buildUploader('pdf', 10);
const imageUpload = buildUploader('image', 10);
const documentUpload = buildUploader('document', 5);

module.exports = pdfUpload;
module.exports.upload = pdfUpload;
module.exports.pdfUpload = pdfUpload;
module.exports.imageUpload = imageUpload;
module.exports.documentUpload = documentUpload;
module.exports.MulterError = multer.MulterError;
