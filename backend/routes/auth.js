const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db } = require('../database');
const router = express.Router();

// Register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, phone } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)').run(name, email, hashed, phone || null);

  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  req.session.user = user;
  res.json({ success: true, user });
});

// Login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], (req, res) => {
  const { email, password } = req.body;

  // Hardcoded admin credentials
  const ADMIN_EMAIL = 'yamna@gmail.com';
  const ADMIN_PASSWORD = '123456';
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    // Ensure admin user exists in DB, create if needed
    let adminUser = db.prepare('SELECT * FROM users WHERE email = ?').get(ADMIN_EMAIL);
    if (!adminUser) {
      const hashed = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)').run('Yamna', ADMIN_EMAIL, hashed, 'admin');
      adminUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    } else if (adminUser.role !== 'admin') {
      db.prepare('UPDATE users SET role=? WHERE email=?').run('admin', ADMIN_EMAIL);
      adminUser.role = 'admin';
    }
    const sessionUser = { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: 'admin' };
    req.session.user = sessionUser;
    return res.json({ success: true, user: sessionUser });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  req.session.user = sessionUser;
  res.json({ success: true, user: sessionUser });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get current user
router.get('/me', (req, res) => {
  if (!req.session.user) return res.json({ user: null });
  const user = db.prepare('SELECT id, name, email, role, phone, address FROM users WHERE id = ?').get(req.session.user.id);
  res.json({ user });
});

// Update profile
router.put('/profile', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  const { name, phone, address } = req.body;
  db.prepare('UPDATE users SET name=?, phone=?, address=? WHERE id=?').run(name, phone, address, req.session.user.id);
  req.session.user.name = name;
  const user = db.prepare('SELECT id, name, email, role, phone, address FROM users WHERE id=?').get(req.session.user.id);
  res.json({ success: true, user });
});

// Change password
router.put('/password', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.session.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password=? WHERE id=?').run(hashed, req.session.user.id);
  res.json({ success: true });
});

module.exports = router;
