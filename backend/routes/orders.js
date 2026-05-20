const express = require('express');
const { db } = require('../database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Place order (works for guests and logged-in users)
router.post('/', (req, res) => {
  const { items, shipping_address, phone, guest_name, guest_email, payment_method, notes } = req.body;

  if (!items || !items.length) return res.status(400).json({ error: 'No items in order' });
  if (!shipping_address) return res.status(400).json({ error: 'Shipping address required' });

  // Validate, check stock, calculate total
  let total = 0;
  const validatedItems = [];
  for (const item of items) {
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const pid = parseInt(item.product_id, 10);
    const product = db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(pid);
    if (!product) return res.status(400).json({ error: `Product not found: ${item.product_id}` });
    if (product.stock < qty) {
      return res.status(400).json({ error: `Not enough stock for "${product.name}". Only ${product.stock} left.` });
    }
    total += product.price * qty;
    validatedItems.push({ product, quantity: qty, price: product.price });
  }

  const userId = req.session.user ? req.session.user.id : null;
  const result = db.prepare(`
    INSERT INTO orders (user_id, guest_email, guest_name, total, shipping_address, phone, payment_method, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, guest_email || null, guest_name || null, total, shipping_address, phone || null, payment_method || 'cod', notes || null);

  const orderId = Number(result.lastInsertRowid);
  if (!orderId) {
    return res.status(500).json({ error: 'Could not create order. Please try again.' });
  }

  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?,?,?,?)');
  validatedItems.forEach((item) => {
    insertItem.run(orderId, item.product.id, item.quantity, item.price);
  });

  const decStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
  validatedItems.forEach((item) => {
    decStock.run(item.quantity, item.product.id, item.quantity);
  });

  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
  res.json({ success: true, order_id: orderId, order });
});

// Get user's orders
router.get('/mine', requireAuth, (req, res) => {
  const orders = db.prepare(`SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC`).all(req.session.user.id);
  const ordersWithItems = orders.map(order => {
    const items = db.prepare(`
      SELECT oi.*, p.name, p.emoji, p.sku FROM order_items oi
      JOIN products p ON oi.product_id=p.id
      WHERE oi.order_id=?
    `).all(order.id);
    return { ...order, items };
  });
  res.json({ orders: ordersWithItems });
});

// Get single order
router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Check access
  if (req.session.user) {
    if (order.user_id !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  const items = db.prepare(`
    SELECT oi.*, p.name, p.emoji, p.sku, p.material FROM order_items oi
    JOIN products p ON oi.product_id=p.id
    WHERE oi.order_id=?
  `).all(order.id);

  res.json({ order: { ...order, items } });
});

module.exports = router;
