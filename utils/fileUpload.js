const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary (you can also use AWS S3, Azure, etc.)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload file to Cloudinary
 * @param {Object} file - Multer file object
 * @param {String} folder - Folder name in cloudinary
 * @returns {String} - URL of uploaded file
 */
exports.uploadFile = async (file, folder = 'tax-payment-system') => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
          transformation: [
            { width: 1000, crop: 'limit' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );

      // Convert buffer to stream and pipe to cloudinary
      const bufferStream = Readable.from(file.buffer);
      bufferStream.pipe(uploadStream);
    });
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error('Failed to upload file');
  }
};

/**
 * Upload multiple files
 * @param {Array} files - Array of multer file objects
 * @param {String} folder - Folder name
 * @returns {Array} - Array of URLs
 */
exports.uploadMultipleFiles = async (files, folder = 'tax-payment-system') => {
  try {
    const uploadPromises = files.map(file => this.uploadFile(file, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple file upload error:', error);
    throw new Error('Failed to upload files');
  }
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Public ID of the file
 * @returns {Object} - Deletion result
 */
exports.deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('File deletion error:', error);
    throw new Error('Failed to delete file');
  }
};

/**
 * Get public ID from Cloudinary URL
 * @param {String} url - Cloudinary URL
 * @returns {String} - Public ID
 */
exports.getPublicId = (url) => {
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  return filename.split('.')[0];
};

/**
 * Alternative: Local file upload (if not using cloud storage)
 */
const path = require('path');
const fs = require('fs').promises;

exports.uploadFileLocally = async (file, uploadPath = 'uploads') => {
  try {
    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(__dirname, '..', uploadPath, filename);
    
    // Ensure upload directory exists
    await fs.mkdir(path.join(__dirname, '..', uploadPath), { recursive: true });
    
    // Write file
    await fs.writeFile(filepath, file.buffer);
    
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Local file upload error:', error);
    throw new Error('Failed to upload file locally');
  }
};