const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ATTACHMENT_MIMES = new Set([
  ...IMAGE_MIMES,
  'application/pdf',
  'application/zip',
  'text/plain',
  'text/markdown',
  'application/json',
]);

function imageFilter(req, file, cb) {
  if (!IMAGE_MIMES.has(file.mimetype)) {
    return cb(new Error('Only image files are allowed'), false);
  }
  cb(null, true);
}

function attachmentFilter(req, file, cb) {
  if (!ATTACHMENT_MIMES.has(file.mimetype)) {
    return cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
  cb(null, true);
}

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single('avatar');

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: attachmentFilter,
}).single('file');

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

function wrapMulter(uploadFn) {
  return (req, res, next) => {
    uploadFn(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: 'File too large' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    });
  };
}

function uploadAvatar(req, res, next) {
  wrapMulter(avatarUpload)(req, res, async (err) => {
    if (err) return next(err);
    if (!req.file) return next();

    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'syncup/avatars',
        resource_type: 'image',
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        format: 'webp',
      });

      req.file.path = result.secure_url;
      req.file.filename = result.public_id;
      return next();
    } catch (uploadErr) {
      return next(uploadErr);
    }
  });
}

function uploadAttachment(req, res, next) {
  wrapMulter(attachmentUpload)(req, res, async (err) => {
    if (err) return next(err);
    if (!req.file) return next();

    try {
      const isImage = req.file.mimetype.startsWith('image/');
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'syncup/attachments',
        resource_type: isImage ? 'image' : 'raw',
      });

      req.file.path = result.secure_url;
      req.file.filename = result.public_id;
      return next();
    } catch (uploadErr) {
      return next(uploadErr);
    }
  });
}

module.exports = {
  uploadAvatar,
  uploadAttachment,
  cloudinary,
};
