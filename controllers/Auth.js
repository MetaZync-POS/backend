const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { sendVerificationEmail } = require('../utils/emailSender');

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
                message: 'Invalid or expired verification token'
            });
        }

        admin.isVerified = true;
        admin.emailVerificationToken = undefined;
        admin.emailVerificationExpires = undefined;
        await admin.save();

        //create auth token
        const authToken = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            token: authToken,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                role: admin.role,
                profileImage: admin.profileImage || null,
                isVerified: admin.isVerified
            }
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
    const isMatch = await admin.comparePassword(password); // Make sure you have this method in your Admin model
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

    // Set cookie (optional)
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


module.exports = {
    register,
    verifyEmail,
    login
};