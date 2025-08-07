const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({

  name: {
    type: String,
    required: [true, 'Name is required']
  },

  email: {
    type: String,
    unique: true,
    required: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  
  role: {
    type: String,
    enum: ['SuperAdmin', 'Admin'],
    default: 'Admin'
  },
  
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\d{10}$/, 'Please add a valid phone number']
  },
  
  profileImage: {
    type: String,
    default: 'https://res.cloudinary.com/dheu9dhta/image/upload/v1754041578/default-avatar-icon-of-social-media-user-vector_dvt9dd.jpg'
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  emailVerificationToken: {
    type: String,
    select: false
  },
  
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  
  passwordResetToken: {
  type: String,
  select: false,
},

passwordResetExpires: {
  type: Date,
  select: false,
},


}, { timestamps: true });


adminSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
