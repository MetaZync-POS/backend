const express = require('express');
const fs = require('fs'); // ✅ Add this
const router = express.Router();
const {
  register,
  verifyEmail,
  login,
  getAllUsers,
  updateProfile,
  changePassword,
  getProfile
} = require('../controllers/Auth');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const cloudinary = require('../config/cloudinary'); // ✅ Fixed import
const { storage } = require('../middleware/upload');
const upload = multer({ storage });
const Admin = require('../models/Admin');

// POST /api/auth/register
router.post('/register', register);

// GET /api/auth/verify-email
router.get('/verify-email', verifyEmail);

// POST /api/auth/login
router.post('/login', login);

// GET all users
router.get('/users', getAllUsers);

// GET profile
router.get('/profile', protect, getProfile);

// PUT update profile
router.put('/profile', protect, upload.single('profileImage'), async (req, res) => {
  try {
    const { name, phone } = req.body;
    const admin = await Admin.findById(req.admin._id);

    if (!admin) return res.status(404).json({ success: false, message: 'User not found' });

    admin.name = name || admin.name;
    admin.phone = phone || admin.phone;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'profile_images',
        use_filename: true,
      });

      admin.profileImage = result.secure_url;

      // Remove local file
      fs.unlinkSync(req.file.path);
    }

    await admin.save();
    res.json({ success: true, admin });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update password
router.put('/change-password', protect, changePassword);

module.exports = router;
