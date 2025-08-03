const express = require('express');
const router = express.Router();
const { register, verifyEmail, login } = require('../controllers/Auth');


//POST /api/auth/register
router.post('/register', register);

//GET /api/auth/verify-email
router.get('/verify-email', verifyEmail);

//POST /api/auth/login
router.post('/login', login);

module.exports = router;
