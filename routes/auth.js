const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { db } = require('../db');

// Input validation middleware for registration
const validateRegister = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .custom(async (username) => {
      const existingUser = await db('users').where({ username }).first();
      if (existingUser) {
        throw new Error('Username already exists');
      }
      return true;
    }),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
    .custom(async (email) => {
      const existingUser = await db('users').where({ email }).first();
      if (existingUser) {
        throw new Error('Email already exists');
      }
      return true;
    }),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// Input validation middleware for login
const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Register route
router.post('/register', validateRegister, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
  }

  const { username, email, password } = req.body;
  try {
    console.log('Registering user:', email);
    const password_hash = await bcrypt.hash(password, 10);

    const [user] = await db('users')
      .insert({ username, email, password_hash })
      .returning(['id', 'username', 'email']);

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(201).json({ success: true, user, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login route
router.post('/login', validateLogin, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
  }

  const { email, password } = req.body;
  try {
    console.log('Login attempt:', email);
    const user = await db('users').where({ email }).first();
    if (!user) {
      console.log('Login failed: User not found', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.log('Login failed: Incorrect password', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    console.log('Login successful:', user.email);
    res.json({ success: true, user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  console.log('Logout request received');
  // JWT is stateless; logout is handled client-side by removing the token
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
