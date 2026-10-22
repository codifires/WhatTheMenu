const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Storage Engine with randomized identifiers and path traversal protection
const getUploadParams = async (req, file) => {
  // 1. Determine Cafe ID
  let rawCafeId = 'unassigned';
  
  // If an owner is uploading, they are modifying their own cafe
  if (req.user && req.user.role === 'owner') {
    rawCafeId = `cafe_${req.user.id || req.user._id}`;
  } 
  // If Admin is updating an existing cafe, the ID is in the URL
  else if (req.params && req.params.id) {
    rawCafeId = `cafe_${req.params.id}`;
  }

  // Path traversal prevention: strip non-alphanumeric characters
  const safeCafeId = String(rawCafeId).replace(/[^a-zA-Z0-9_-]/g, '');

  // 2. Determine Asset Type based on the form field name
  let rawAssetType = 'misc';
  if (file.fieldname === 'logo') {
    rawAssetType = 'logos';
  } else if (file.fieldname === 'image') {
    rawAssetType = 'menu_items';
  }
  const safeAssetType = ['logos', 'menu_items', 'misc'].includes(rawAssetType) ? rawAssetType : 'misc';

  // Provider-generated randomized storage identifier
  const randomHex = crypto.randomBytes(8).toString('hex');
  const randomPublicId = `${safeAssetType}_${Date.now()}_${randomHex}`;

  return {
    folder: `qrmenu/${safeCafeId}/${safeAssetType}`,
    public_id: randomPublicId,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ quality: 'auto:good', fetch_format: 'auto' }]
  };
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: getUploadParams,
});

// File filter: validates MIME, checks extensions, and blocks path traversal / double-extension bypasses
const fileFilter = (req, file, cb) => {
  const rawName = file.originalname || '';

  // Reject null bytes and path traversal characters
  if (rawName.includes('\0') || rawName.includes('..') || rawName.includes('/') || rawName.includes('\\')) {
    return cb(new Error('Invalid filename: Path traversal or null bytes detected'), false);
  }

  // Reject dangerous double extensions (e.g. exploit.php.jpg, shell.exe.png, script.html.webp)
  const dangerousExtensions = ['.php', '.phtml', '.exe', '.sh', '.bat', '.cmd', '.js', '.html', '.htm', '.svg', '.jar', '.py', '.pl'];
  const lowerName = rawName.toLowerCase();
  for (const danger of dangerousExtensions) {
    if (lowerName.includes(danger)) {
      return cb(new Error(`Invalid file: Dangerous file extension pattern "${danger}" detected`), false);
    }
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const fileExt = lowerName.slice(lowerName.lastIndexOf('.'));

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Only valid image files (jpeg, jpg, png, webp) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Single file upload limit
  }
});

upload.cloudinary = cloudinary;
upload.getUploadParams = getUploadParams;
upload.fileFilter = fileFilter;

module.exports = upload;
