const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { db } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const uploadsBase = path.join(__dirname, '../../frontend/public/images/uploads');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsBase),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      const safe = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safe}`);
    }
  })
});

// Admin login page
router.get('/login', (req, res) => {
  if (req.session.user && req.session.user.role === 'admin') return res.redirect('/admin');
  res.sendFile(path.join(__dirname, '../../frontend/public/admin-login.html'));
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Hardcoded admin credentials
  const ADMIN_EMAIL = 'yamna@gmail.com';
  const ADMIN_PASSWORD = '123456';
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    let adminUser = db.prepare('SELECT * FROM users WHERE email=?').get(ADMIN_EMAIL);
    if (!adminUser) {
      const hashed = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)').run('Yamna', ADMIN_EMAIL, hashed, 'admin');
      adminUser = db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid);
    } else if (adminUser.role !== 'admin') {
      db.prepare('UPDATE users SET role=? WHERE email=?').run('admin', ADMIN_EMAIL);
      adminUser.role = 'admin';
    }
    req.session.user = { id: adminUser.id, name: adminUser.name, email: ADMIN_EMAIL, role: 'admin' };
    return res.redirect('/admin');
  }

  const user = db.prepare('SELECT * FROM users WHERE email=? AND role=?').get(email, 'admin');
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.redirect('/admin/login?error=1');
  }
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.redirect('/admin');
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Admin dashboard
router.get('/', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/public/admin.html'));
});

// API: Dashboard stats
router.get('/api/stats', requireAdmin, (req, res) => {
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total),0) as sum FROM orders WHERE status != 'cancelled'").get().sum;
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE active=1').get().count;
  const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role='customer'").get().count;
  const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status='pending'").get().count;
  const recentOrders = db.prepare(`
    SELECT o.*, COALESCE(u.name, o.guest_name) as customer_name
    FROM orders o LEFT JOIN users u ON o.user_id=u.id
    ORDER BY o.created_at DESC LIMIT 8
  `).all();
  const lowStock = db.prepare('SELECT * FROM products WHERE stock < 3 AND active=1 ORDER BY stock ASC').all();
  res.json({ totalOrders, totalRevenue, totalProducts, totalCustomers, pendingOrders, recentOrders, lowStock });
});

// API: Products CRUD
router.get('/api/products', requireAdmin, (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id=c.id
    ORDER BY p.created_at DESC
  `).all();
  res.json({ products });
});

router.post('/api/products/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file' });
  const url = `/images/uploads/${req.file.filename}`;
  res.json({ success: true, url });
});

router.post('/api/products', requireAdmin, (req, res) => {
  const { name, description, price, old_price, category_id, emoji, material, stone, sku, badge, featured, stock, image_url, active } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO products (name, description, price, old_price, category_id, emoji, material, stone, sku, badge, featured, stock, image_url, active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      name,
      description || '',
      parseFloat(price),
      old_price ? parseFloat(old_price) : null,
      parseInt(category_id, 10),
      emoji || '💎',
      material || '',
      stone || '',
      sku,
      badge || '',
      featured ? 1 : 0,
      parseInt(stock, 10) || 10,
      image_url || null,
      active !== undefined && !active ? 0 : 1
    );
    const product = db.prepare('SELECT * FROM products WHERE id=?').get(result.lastInsertRowid);
    res.json({ success: true, product });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/api/products/:id', requireAdmin, (req, res) => {
  const product = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

router.put('/api/products/:id', requireAdmin, (req, res) => {
  const { name, description, price, old_price, category_id, emoji, material, stone, sku, badge, featured, stock, active, image_url } = req.body;
  try {
    db.prepare(`
      UPDATE products SET name=?, description=?, price=?, old_price=?, category_id=?, emoji=?,
      material=?, stone=?, sku=?, badge=?, featured=?, stock=?, active=?, image_url=?
      WHERE id=?
    `).run(
      name,
      description || '',
      parseFloat(price),
      old_price ? parseFloat(old_price) : null,
      parseInt(category_id, 10),
      emoji || '💎',
      material || '',
      stone || '',
      sku,
      badge || '',
      featured ? 1 : 0,
      parseInt(stock, 10) || 0,
      active ? 1 : 0,
      image_url || null,
      req.params.id
    );
    const product = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
    res.json({ success: true, product });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/api/products/:id/stock', requireAdmin, (req, res) => {
  const { delta, stock } = req.body;
  const row = db.prepare('SELECT id, stock FROM products WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  let next;
  if (stock !== undefined && stock !== null) next = Math.max(0, parseInt(stock, 10) || 0);
  else if (delta !== undefined && delta !== null) next = Math.max(0, row.stock + (parseInt(delta, 10) || 0));
  else return res.status(400).json({ error: 'Send stock or delta' });
  db.prepare('UPDATE products SET stock=? WHERE id=?').run(next, req.params.id);
  res.json({ success: true, stock: next });
});

router.delete('/api/products/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE products SET active=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// API: Orders management
router.get('/api/orders', requireAdmin, (req, res) => {
  const { status, page = 1 } = req.query;
  let query = `SELECT o.*, COALESCE(u.name, o.guest_name) as customer_name, COALESCE(u.email, o.guest_email) as customer_email,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
    FROM orders o LEFT JOIN users u ON o.user_id=u.id`;
  const params = [];
  if (status && status !== 'all') { query += ' WHERE o.status=?'; params.push(status); }
  query += ' ORDER BY o.created_at DESC LIMIT 20 OFFSET ?';
  params.push((parseInt(page) - 1) * 20);
  const orders = db.prepare(query).all(...params);
  res.json({ orders });
});

router.put('/api/orders/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  res.json({ success: true, order });
});

router.get('/api/orders/:id', requireAdmin, (req, res) => {
  const order = db.prepare(`SELECT o.*, COALESCE(u.name, o.guest_name) as customer_name, COALESCE(u.email, o.guest_email) as customer_email
    FROM orders o LEFT JOIN users u ON o.user_id=u.id WHERE o.id=?`).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  const items = db.prepare('SELECT oi.*, p.name, p.emoji, p.sku FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?').all(order.id);
  res.json({ order: { ...order, items } });
});

// API: Customers
router.get('/api/customers', requireAdmin, (req, res) => {
  const customers = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.created_at,
    COUNT(o.id) as order_count, COALESCE(SUM(o.total),0) as total_spent
    FROM users u LEFT JOIN orders o ON u.id=o.user_id
    WHERE u.role='customer' GROUP BY u.id ORDER BY u.created_at DESC
  `).all();
  res.json({ customers });
});

// API: AI Inventory Analytics
router.get('/api/inventory/analytics', requireAdmin, (req, res) => {
  // Category sales — count order_items per category
  const categorySales = db.prepare(`
    SELECT c.name as category, c.emoji,
      COALESCE(SUM(oi.quantity), 0) as total_sold,
      COALESCE(SUM(oi.quantity * oi.price), 0) as revenue,
      COUNT(DISTINCT oi.order_id) as order_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.active = 1
    LEFT JOIN order_items oi ON oi.product_id = p.id
    GROUP BY c.id
    ORDER BY total_sold DESC
  `).all();

  // Product stock status
  const stockStatus = db.prepare(`
    SELECT p.id, p.name, p.emoji, p.stock, p.price, p.old_price,
      c.name as category,
      COALESCE(SUM(oi.quantity), 0) as total_sold
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    WHERE p.active = 1
    GROUP BY p.id
    ORDER BY p.stock ASC
  `).all();

  // Monthly revenue trend (last 6 months)
  const revenueTrend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
      COUNT(*) as orders,
      COALESCE(SUM(total), 0) as revenue
    FROM orders
    WHERE status != 'cancelled'
      AND created_at >= datetime('now', '-6 months')
    GROUP BY month
    ORDER BY month ASC
  `).all();

  // Price alert: products whose price exceeds old_price by more than 30%
  const priceAlerts = db.prepare(`
    SELECT p.id, p.name, p.emoji, p.price, p.old_price, p.stock,
      c.name as category,
      ROUND(((p.price - p.old_price) / p.old_price) * 100, 1) as price_increase_pct
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.old_price IS NOT NULL
      AND p.old_price > 0
      AND p.price > p.old_price * 1.1
      AND p.active = 1
    ORDER BY price_increase_pct DESC
  `).all();

  // Top selling products
  const topProducts = db.prepare(`
    SELECT p.id, p.name, p.emoji, p.price, p.stock,
      c.name as category,
      COALESCE(SUM(oi.quantity), 0) as total_sold,
      COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    WHERE p.active = 1
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT 10
  `).all();

  // Recent orders by day for sparkline
  const dailyOrders = db.prepare(`
    SELECT strftime('%Y-%m-%d', created_at) as day, COUNT(*) as orders,
      COALESCE(SUM(total), 0) as revenue
    FROM orders
    WHERE status != 'cancelled'
      AND created_at >= datetime('now', '-30 days')
    GROUP BY day
    ORDER BY day ASC
  `).all();

  res.json({ categorySales, stockStatus, revenueTrend, priceAlerts, topProducts, dailyOrders });
});

// API: Categories
router.get('/api/categories', requireAdmin, (req, res) => {
  const cats = db.prepare('SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON c.id=p.category_id AND p.active=1 GROUP BY c.id').all();
  res.json({ categories: cats });
});

module.exports = router;
