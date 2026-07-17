const cloudinary = require('cloudinary').v2;
// cloudinary v1 exposes .v2 — same API, no change needed
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'inventory', allowed_formats: ['jpg', 'png', 'webp'] },
});

const upload = multer({ storage });

module.exports = { cloudinary, upload };
