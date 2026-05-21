const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// cloudinary.v2 auto-configures from CLOUDINARY_URL env var
// No explicit config() call needed when CLOUDINARY_URL is set.

// ─── Avatar Storage ────────────────────────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:            'teamforge/avatars',
    allowed_formats:   ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation:    [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    format:            'webp', // normalize to webp for smaller files
  },
});

// ─── Attachment Storage ────────────────────────────────────────────────────
const attachmentStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder:          'teamforge/attachments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'zip', 'txt', 'md'],
    resource_type:   file.mimetype.startsWith('image/') ? 'image' : 'raw',
  }),
});

// ─── File filter ───────────────────────────────────────────────────────────
function imageFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'), false);
  }
  cb(null, true);
}

// ─── Exports ───────────────────────────────────────────────────────────────
const uploadAvatar = multer({
  storage: avatarStorage,
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: imageFilter,
}).single('avatar');

const uploadAttachment = multer({
  storage: attachmentStorage,
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB
}).single('attachment');

/**
 * Wraps multer in a promise so errors get caught by asyncWrapper / error handler
 */
function wrapUpload(uploadFn) {
  return (req, res, next) => {
    uploadFn(req, res, (err) => {
      if (!err) return next();
      // multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: 'File too large' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    });
  };
}

module.exports = {
  uploadAvatar:     wrapUpload(uploadAvatar),
  uploadAttachment: wrapUpload(uploadAttachment),
  cloudinary,       // export for direct use (e.g. deleting old images)
};
