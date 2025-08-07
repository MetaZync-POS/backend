const express = require('express');
const router = express.Router();
const {
  register,
  verifyEmail,
  login,
  getAllUsers,
  updateProfile,
  changePassword,
  getProfile,
  forgotPassword,
  resetPassword
} = require('../controllers/Auth');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const { storage } = require('../middleware/upload');
const upload = multer({ storage });

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
router.put('/profile', protect, upload.single('profileImage'), updateProfile);

// PUT update password
router.put('/change-password', protect, changePassword);

// POST forgot password
router.post('/forgot-password', forgotPassword);

// PUT reset password
router.put('/reset-password', resetPassword);


module.exports = router;
