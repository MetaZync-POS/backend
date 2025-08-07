const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const fs = require('fs');
const { sendVerificationEmail } = require('../utils/emailSender');
const cloudinary = require('../config/cloudinary');

// Register a new admin
// POST /api/auth/register
const register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ 
                success: false,
                message: 'Admin already exists' 
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification token
        const VerificationToken = crypto.randomBytes(32).toString('hex');
        const VerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${VerificationToken}`;

        // Create new admin
        const admin = await Admin.create({
            name,
            email,
            password: hashedPassword,
            phone,
            emailVerificationToken: VerificationToken,
            emailVerificationExpires: VerificationExpires
        });

        // Send verification email
        try {
            await sendVerificationEmail(email, verificationUrl);
        } catch (emailErr) {
            await Admin.findByIdAndDelete(admin._id);
            console.error('Email sending failed:', emailErr);
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email'
            });
        }

        //Temporary token
        const tempToken = jwt.sign(
            { id: admin._id, purpose: 'email-verification' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.status(201).json({
            success:true,
            message: 'Verification email sent successfully. Please check your inbox.',
            tempToken
        });

    } catch (err) {
        console.error('Registration error:', err);
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: `${email} already exists`
            });
        }
        res.status(500).json({
            success: false,
            message: 'Registration failed, please try again'
        });
    }
};

// Verify email
// POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is required'
            });
        }

        const admin = await Admin.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!admin) {
            return res.status(400).json({
                success: false,
                message: 'expired verification token'
            });
        }

        admin.isVerified = true;
        admin.emailVerificationToken = undefined;
        admin.emailVerificationExpires = undefined;
        await admin.save();

        res.status(200).json({
            message: 'Email verified successfully',
            
        });
    } catch (err) {
        console.error('Email verification error:', err);
        res.status(500).json({
            success: false,
            message: 'Email verification failed, please try again'
        });
    }
};



// Login admin
// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find admin and include password field
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check email verification
    if (!admin.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first. Check your inbox.'
      });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create auth token
    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Respond with admin data
    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        profileImage: admin.profileImage || null,
        isVerified: admin.emailVerified
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

// Get all registered admins (only for Super Admin)
const getAllUsers = async (req, res) => {
  try {
    // Only super admins can access this route
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to access this resource'
      });
    }

    const admins = await Admin.find().select('-password -emailVerificationToken -emailVerificationExpires');

    res.status(200).json({
      success: true,
      count: admins.length,
      users: admins
    });
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// Get profile
// GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await Admin.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ admin: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


// Update profile
// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update text fields
    admin.name = name || admin.name;
    admin.phone = phone || admin.phone;

    // If a new profile image is uploaded
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'profile_images',
        use_filename: true,
      });

      admin.profileImage = result.secure_url;


      fs.unlinkSync(req.file.path);
    }

    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      admin,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Profile update failed' });
  }
};

// Change password
// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id).select('+password');

    if (!admin) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);

    await admin.save();
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ success: false, message: 'Password change failed' });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) {
    return res.status(404).json({ success: false, message: 'No admin with that email' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpires = Date.now() + 3600000;

  admin.passwordResetToken = resetToken;
  admin.passwordResetExpires = resetTokenExpires;
  await admin.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  try {
    await sendVerificationEmail(email, resetUrl);
    res.status(200).json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    await admin.save();
    res.status(500).json({ success: false, message: 'Email sending failed' });
  }
};

// PUT /api/auth/reset-password
const resetPassword = async (req, res) => {
  const { token } = req.query;
  const { newPassword } = req.body;

  const admin = await Admin.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!admin) {
    return res.status(400).json({ success: false, message: 'Token invalid or expired' });
  }

  const salt = await bcrypt.genSalt(10);
  admin.password = await bcrypt.hash(newPassword, salt);
  admin.passwordResetToken = undefined;
  admin.passwordResetExpires = undefined;

  await admin.save();
  res.status(200).json({ success: true, message: 'Password reset successfully' });
};





module.exports = {
    register,
    verifyEmail,
    login,
    getAllUsers,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword
};