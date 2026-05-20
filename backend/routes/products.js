const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Get all products (with optional filters)
router.get('/', (req, res) => {
  const { category, search, featured, sort, page = 1, limit = 20 } = req.query;
  let query = `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1
  `;
  const params = [];

  if (category && category !== 'all') {
    query += ' AND c.slug = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.material LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (featured === '1') {
    query += ' AND p.featured = 1';
  }

  if (sort === 'price_asc') query += ' ORDER BY p.price ASC';
  else if (sort === 'price_desc') query += ' ORDER BY p.price DESC';
  else if (sort === 'newest') query += ' ORDER BY p.created_at DESC';
  else query += ' ORDER BY p.featured DESC, p.id ASC';

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const products = db.prepare(query).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as count FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.active=1 ${category && category!=='all' ? 'AND c.slug=?' : ''}`).get(...(category && category !== 'all' ? [category] : []));

  res.json({ products, total: total.count, page: parseInt(page) });
});

// Get single product
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p LEFT JOIN categories c ON p.category_id=c.id
    WHERE p.id=? AND p.active=1
  `).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Get related products
  const related = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id=c.id
    WHERE p.category_id=? AND p.id!=? AND p.active=1 LIMIT 4
  `).all(product.category_id, product.id);

  res.json({ product, related });
});

// Get all categories
router.get('/meta/categories', (req, res) => {
  const categories = db.prepare('SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON c.id=p.category_id AND p.active=1 GROUP BY c.id').all();
  res.json({ categories });
});

// Wishlist routes
router.post('/wishlist/toggle', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Login required' });
  const { product_id } = req.body;
  const existing = db.prepare('SELECT id FROM wishlist WHERE user_id=? AND product_id=?').get(req.session.user.id, product_id);
  if (existing) {
    db.prepare('DELETE FROM wishlist WHERE user_id=? AND product_id=?').run(req.session.user.id, product_id);
    res.json({ wishlisted: false });
  } else {
    db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?,?)').run(req.session.user.id, product_id);
    res.json({ wishlisted: true });
  }
});

router.get('/wishlist/mine', (req, res) => {
  if (!req.session.user) return res.json({ products: [] });
  const products = db.prepare(`
    SELECT p.*, c.name as category_name FROM wishlist w
    JOIN products p ON w.product_id=p.id
    LEFT JOIN categories c ON p.category_id=c.id
    WHERE w.user_id=?
  `).all(req.session.user.id);
  res.json({ products });
});

module.exports = router;
