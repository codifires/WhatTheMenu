const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // 1. Determine Cafe ID
    let cafeId = 'unassigned';
    
    // If an owner is uploading, they are modifying their own cafe
    if (req.user && req.user.role === 'owner') {
      cafeId = `cafe_${req.user.id}`;
    } 
    // If Admin is updating an existing cafe, the ID is in the URL
    else if (req.params && req.params.id) {
      cafeId = `cafe_${req.params.id}`;
    }
    // Note: If Admin is *creating* a new cafe, there is no Mongo ID yet, 
    // so it will temporarily go into 'unassigned'.

    // 2. Determine Asset Type based on the form field name
    let assetType = 'misc';
    if (file.fieldname === 'logo') {
      assetType = 'logos';
    } else if (file.fieldname === 'image') {
      assetType = 'menu_items';
    }

    return {
      folder: `qrmenu/${cafeId}/${assetType}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    };
  },
});

// File filter acts as a first layer of defense (Cloudinary does the deep validation)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;
